import { NextRequest, NextResponse } from 'next/server';

interface DailyReport {
  date: string;
  employeeName: string;
  department: string;
  workOverview: string;
  progressGoal: string;
  achievementRate: number;
  managerEvaluation: string;
  remarks: string;
}

interface ProjectSummary {
  projectName: string;
  order: number;
  tasks: {
    title: string;
    description: string;
    assignees?: string[];
    frequency?: number;
    dateRange?: string;
    achievementRate: number;
  }[];
  results: {
    period: string;
    participants: string[];
    avgAchievementRate: number;
    totalTasks: number;
    status: '완료' | '진행중' | '지연';
  };
}

interface EmployeeSummary {
  name: string;
  department: string;
  totalReports: number;
  avgAchievementRate: number;
  mainProjects: string[];
  performance: '우수' | '양호' | '개선필요';
}

interface SummaryTable {
  projectName: string;
  taskCount: number;
  achievementRate: number;
  status: '✅ 완료' | '🔄 진행중' | '⚠️ 지연';
}

interface AIResponseStructure {
  title: string;
  period: string;
  target: string;
  overallAchievementRate: number;
  projects: ProjectSummary[];
  employees: EmployeeSummary[];
  summaryTable: SummaryTable[];
  specialNotes?: {
    type: string;
    content: string;
  }[];
  recommendation?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      reports, 
      filterType, 
      filterMonth, 
      filterStartDate, 
      filterEndDate, 
      filterDepartment, 
      filterEmployee 
    } = await request.json();

    if (!reports || reports.length === 0) {
      return NextResponse.json({ error: '요약할 보고서가 없습니다.' }, { status: 400 });
    }

    const filteredReports: DailyReport[] = reports.filter((report: DailyReport) => 
      report.workOverview !== '작성 안됨' && report.workOverview !== '연차'
    );

    if (filteredReports.length === 0) {
      return NextResponse.json({ error: '업무 내용이 있는 보고서가 없습니다.' }, { status: 400 });
    }

    // OpenAI API 키 확인
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OpenAI API key is not configured');
      // OpenAI API가 없으면 기본 구조화된 데이터 생성
      return NextResponse.json({ 
        summary: generateStructuredSummary(filteredReports, {
          filterType,
          filterMonth,
          filterStartDate,
          filterEndDate,
          filterDepartment,
          filterEmployee
        })
      });
    }

    // GPT 프롬프트 생성
    const systemPrompt = `당신은 업무 보고서를 분석하여 구조화된 JSON 형식으로 요약하는 전문가입니다.
주어진 보고서들을 분석하여 프로젝트/업무 단위로 그룹화하고, 인원별 성과를 정리해주세요.

반드시 다음 JSON 구조를 따라주세요:
{
  "title": "업무 보고 요약",
  "period": "YYYY-MM-DD ~ YYYY-MM-DD 형식 또는 YYYY-MM",
  "target": "전체 또는 특정 부서/사원명",
  "overallAchievementRate": 전체 평균 달성률 (숫자),
  "projects": [
    {
      "projectName": "프로젝트명",
      "order": 순서번호,
      "tasks": [
        {
          "title": "작업 제목",
          "description": "작업 설명",
          "assignees": ["담당자1", "담당자2"],
          "frequency": 수행 횟수,
          "dateRange": "날짜 범위",
          "achievementRate": 달성률
        }
      ],
      "results": {
        "period": "작업 기간",
        "participants": ["참여자1", "참여자2"],
        "avgAchievementRate": 평균 달성률,
        "totalTasks": 총 작업 수,
        "status": "완료" | "진행중" | "지연"
      }
    }
  ],
  "employees": [
    {
      "name": "사원명",
      "department": "부서명",
      "totalReports": 보고서 수,
      "avgAchievementRate": 평균 달성률,
      "mainProjects": ["프로젝트1", "프로젝트2"],
      "performance": "우수" | "양호" | "개선필요"
    }
  ],
  "summaryTable": [
    {
      "projectName": "프로젝트명",
      "taskCount": 작업 수,
      "achievementRate": 달성률,
      "status": "✅ 완료" | "🔄 진행중" | "⚠️ 지연"
    }
  ],
  "specialNotes": [
    {
      "type": "연차" | "기타",
      "content": "내용"
    }
  ],
  "recommendation": "전체적인 평가 및 제안사항"
}

프로젝트는 업무 개요의 주요 키워드나 주제로 그룹화하세요.
달성률 90% 이상은 "우수/완료", 70-89%는 "양호/진행중", 70% 미만은 "개선필요/지연"으로 분류하세요.`;

    const userPrompt = `다음 업무 보고서들을 분석하여 JSON 형식으로 요약해주세요:

필터 조건:
- 기간: ${filterType === 'month' ? filterMonth : `${filterStartDate} ~ ${filterEndDate}`}
- 부서: ${filterDepartment || '전체'}
- 사원: ${filterEmployee || '전체'}

보고서 데이터:
${JSON.stringify(filteredReports, null, 2)}

연차 및 미작성 보고서:
${JSON.stringify(reports.filter((r: DailyReport) => r.workOverview === '연차' || r.workOverview === '작성 안됨'), null, 2)}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI API error:', error);
        throw new Error('OpenAI API request failed');
      }

      const data = await response.json();
      const aiSummary: AIResponseStructure = JSON.parse(data.choices[0].message.content);

      return NextResponse.json({ summary: aiSummary });
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      // API 호출 실패 시 기본 구조화된 데이터 반환
      return NextResponse.json({ 
        summary: generateStructuredSummary(filteredReports, {
          filterType,
          filterMonth,
          filterStartDate,
          filterEndDate,
          filterDepartment,
          filterEmployee
        })
      });
    }
  } catch (error) {
    console.error('Error generating AI summary:', error);
    return NextResponse.json(
      { error: '요약 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// OpenAI API 없을 때 사용할 기본 구조화 함수
function generateStructuredSummary(
  reports: DailyReport[], 
  filters: any
): AIResponseStructure {
  const period = filters.filterType === 'month' 
    ? filters.filterMonth 
    : `${filters.filterStartDate} ~ ${filters.filterEndDate}`;
  
  const target = filters.filterDepartment || '전체';
  
  // 프로젝트별 그룹화
  const projectGroups: { [key: string]: any } = {};
  const employeeStats: { [key: string]: any } = {};
  
  reports.forEach(report => {
    // 프로젝트 그룹화
    const projectKey = report.workOverview.split(/[-,]/)[0].trim();
    if (!projectGroups[projectKey]) {
      projectGroups[projectKey] = {
        projectName: projectKey,
        tasks: new Map(),
        participants: new Set(),
        dates: [],
        totalAchievement: 0,
        count: 0
      };
    }
    
    projectGroups[projectKey].participants.add(report.employeeName);
    projectGroups[projectKey].dates.push(report.date);
    projectGroups[projectKey].totalAchievement += report.achievementRate;
    projectGroups[projectKey].count++;
    
    // 태스크 그룹화
    const taskKey = `${report.workOverview}|||${report.progressGoal}`;
    if (!projectGroups[projectKey].tasks.has(taskKey)) {
      projectGroups[projectKey].tasks.set(taskKey, {
        title: report.workOverview,
        description: report.progressGoal,
        assignees: new Set(),
        dates: [],
        achievements: []
      });
    }
    const task = projectGroups[projectKey].tasks.get(taskKey);
    task.assignees.add(report.employeeName);
    task.dates.push(report.date);
    task.achievements.push(report.achievementRate);
    
    // 직원별 통계
    if (!employeeStats[report.employeeName]) {
      employeeStats[report.employeeName] = {
        name: report.employeeName,
        department: report.department,
        projects: new Set(),
        totalReports: 0,
        totalAchievement: 0
      };
    }
    employeeStats[report.employeeName].projects.add(projectKey);
    employeeStats[report.employeeName].totalReports++;
    employeeStats[report.employeeName].totalAchievement += report.achievementRate;
  });
  
  // 프로젝트 데이터 변환
  const projects: ProjectSummary[] = Object.entries(projectGroups)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([name, data], index) => {
      const avgRate = Math.round(data.totalAchievement / data.count);
      const sortedDates = data.dates.sort();
      
      return {
        projectName: name,
        order: index + 1,
        tasks: Array.from(data.tasks.values()).map((task: any) => ({
          title: task.title,
          description: task.description,
          assignees: Array.from(task.assignees),
          frequency: task.dates.length,
          dateRange: task.dates.length > 1 
            ? `${task.dates[0]} ~ ${task.dates[task.dates.length - 1]}`
            : task.dates[0],
          achievementRate: Math.round(
            task.achievements.reduce((sum: number, val: number) => sum + val, 0) / task.achievements.length
          )
        })),
        results: {
          period: sortedDates[0] === sortedDates[sortedDates.length - 1]
            ? sortedDates[0]
            : `${sortedDates[0]} ~ ${sortedDates[sortedDates.length - 1]}`,
          participants: Array.from(data.participants),
          avgAchievementRate: avgRate,
          totalTasks: data.count,
          status: avgRate >= 90 ? '완료' : avgRate >= 70 ? '진행중' : '지연'
        }
      };
    });
  
  // 직원 데이터 변환
  const employees: EmployeeSummary[] = Object.values(employeeStats).map((emp: any) => {
    const avgRate = Math.round(emp.totalAchievement / emp.totalReports);
    return {
      name: emp.name,
      department: emp.department,
      totalReports: emp.totalReports,
      avgAchievementRate: avgRate,
      mainProjects: Array.from(emp.projects).slice(0, 3) as string[],
      performance: avgRate >= 90 ? '우수' : avgRate >= 70 ? '양호' : '개선필요'
    };
  });
  
  // 요약 테이블
  const summaryTable: SummaryTable[] = projects.slice(0, 5).map(project => ({
    projectName: project.projectName,
    taskCount: project.results.totalTasks,
    achievementRate: project.results.avgAchievementRate,
    status: project.results.avgAchievementRate >= 90 ? '✅ 완료' : 
            project.results.avgAchievementRate >= 70 ? '🔄 진행중' : '⚠️ 지연'
  }));
  
  // 전체 평균 달성률
  const overallAchievementRate = Math.round(
    reports.reduce((sum, r) => sum + r.achievementRate, 0) / reports.length
  );
  
  return {
    title: '업무 보고 요약',
    period,
    target,
    overallAchievementRate,
    projects,
    employees,
    summaryTable,
    recommendation: overallAchievementRate >= 85 
      ? '조직 전체가 우수한 성과를 보이고 있습니다. 현재의 업무 프로세스를 유지하면서 지속적인 개선을 추진하세요.'
      : overallAchievementRate >= 70
      ? '전반적으로 양호한 성과를 유지하고 있습니다. 일부 개선이 필요한 영역에 대한 지원을 강화하세요.'
      : '성과 개선이 필요합니다. 업무 프로세스 재검토와 목표 재설정을 고려하세요.'
  };
}