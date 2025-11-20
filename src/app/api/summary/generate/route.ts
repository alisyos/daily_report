import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';
import OpenAI from 'openai';

const dbService = new SupabaseService();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json();
    
    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    // 해당 날짜의 모든 보고서 가져오기
    const reports = await dbService.getDailyReports();
    const dateReports = reports.filter(report => report.date === date);

    if (dateReports.length === 0) {
      return NextResponse.json({ error: 'No reports found for the specified date' }, { status: 404 });
    }

    // 부서별로 그룹화
    const groupedReports = dateReports.reduce((acc, report) => {
      const department = report.department || '미분류';
      if (!acc[department]) {
        acc[department] = [];
      }
      acc[department].push(report);
      return acc;
    }, {} as { [key: string]: typeof dateReports });

    // 보고서 텍스트 생성
    let reportText = `${date} 일일업무보고 내용:\n\n`;
    
    for (const [department, deptReports] of Object.entries(groupedReports)) {
      reportText += `[${department}]\n`;
      deptReports.forEach(report => {
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
    }

    // 프롬프트 작성
    const prompt = `다음은 회사의 일일업무보고 내용입니다. 이를 바탕으로 간결하고 명확한 일일보고 요약을 작성해주세요.

요약 작성 시 다음 사항을 준수해주세요:
1. 중요한 프로젝트나 업무를 중심으로 작성
2. 부서별 주요 업무 진행 상황을 포함
3. 완료된 업무와 진행 중인 업무를 구분하여 작성
4. 특이사항이나 이슈가 있다면 명시
5. 3-5개의 문장으로 구성
6. 업무의 우선순위와 중요도를 고려하여 작성

예시 형식:
"[프로젝트명]은 [진행상황]입니다. [부서명]에서는 [주요업무] 진행했고, [완료/진행률]입니다. [다른 부서]는 [업무내용] 작업 중이며, [예정사항]입니다. 이외에 [기타 특이사항]이 있었습니다."

${reportText}

위 내용을 바탕으로 일일보고 요약을 작성해주세요:`;

    // OpenAI API 호출
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

    // 생성된 요약 저장
    const success = await dbService.addDailySummary({
      date,
      summary
    });

    if (success) {
      return NextResponse.json({ 
        message: 'Summary generated and saved successfully',
        summary,
        date
      });
    } else {
      return NextResponse.json({ 
        error: 'Summary generated but failed to save',
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