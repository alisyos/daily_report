import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';
import OpenAI from 'openai';
import { getRequestUser, getCompanyScope } from '@/lib/auth-helpers';

const dbService = new SupabaseService();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { date, department } = await request.json();

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    if (!department) {
      return NextResponse.json({ error: 'Department parameter is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    const companyId = getCompanyScope(user);
    const dateReports = await dbService.getDailyReports(companyId, department, date, date);

    if (dateReports.length === 0) {
      return NextResponse.json({ error: '해당 부서에 작성된 보고서가 없습니다.' }, { status: 404 });
    }

    let reportText = `${date} ${department} 일일업무보고 내용:\n\n`;

    dateReports.forEach(report => {
      if (report.workOverview !== '작성 안됨' && report.workOverview !== '연차') {
        reportText += `${report.employeeName}: ${report.workOverview}\n`;
        if (report.progressGoal && report.progressGoal !== '-') {
          reportText += `  진행목표: ${report.progressGoal}\n`;
        }
        if (report.achievementRate > 0) {
          reportText += `  달성률: ${report.achievementRate}%\n`;
        }
        if (report.remarks && report.remarks !== '-' && report.remarks !== '작성 안됨') {
          reportText += `  비고: ${report.remarks}\n`;
        }
        reportText += '\n';
      }
    });

    const prompt = `다음은 ${department} 부서의 일일업무보고 내용입니다. 이를 바탕으로 간결하고 명확한 부서별 일일보고 요약을 작성해주세요.

요약 작성 시 다음 사항을 준수해주세요:
1. 중요한 프로젝트나 업무를 중심으로 작성
2. 주요 업무 진행 상황을 포함
3. 완료된 업무와 진행 중인 업무를 구분하여 작성
4. 특이사항이나 이슈가 있다면 명시
5. 3-5개의 문장으로 구성
6. 업무의 우선순위와 중요도를 고려하여 작성

${reportText}

위 내용을 바탕으로 ${department} 부서의 일일보고 요약을 작성해주세요:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "당신은 기업의 일일업무보고를 요약하는 전문가입니다. 간결하고 명확하게 핵심 내용을 전달하는 요약문을 작성합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const summary = completion.choices[0]?.message?.content?.trim();

    if (!summary) {
      return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
    }

    // upsert: 기존 요약이 있으면 업데이트, 없으면 삽입 (atomic)
    const success = await dbService.upsertDailySummary({
      date,
      department,
      summary
    });

    if (success) {
      return NextResponse.json({
        message: 'Summary generated and saved successfully',
        summary,
        date,
        department
      });
    } else {
      // 저장 실패 시에도 생성된 요약은 반환
      return NextResponse.json({
        error: 'AI 요약이 생성되었으나 저장에 실패했습니다. DB 마이그레이션(006_department_summaries.sql)이 적용되었는지 확인해주세요.',
        summary
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json({
      error: 'Failed to generate summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
