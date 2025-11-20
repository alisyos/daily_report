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

    const periodText = filterType === 'month' 
      ? `${filterMonth} (월 단위)`
      : `${filterStartDate} ~ ${filterEndDate}`;

    const filterInfo = {
      period: periodText,
      department: filterDepartment || '전체 부서',
      employee: filterEmployee || '전체 사원',
      totalReports: filteredReports.length
    };

    const departmentStats = filteredReports.reduce((acc, report) => {
      const department = report.department || '미분류';
      if (!acc[department]) {
        acc[department] = {
          count: 0,
          totalAchievement: 0,
          employees: new Set()
        };
      }
      acc[department].count++;
      acc[department].totalAchievement += report.achievementRate;
      acc[department].employees.add(report.employeeName);
      return acc;
    }, {} as any);

    const employeeStats = filteredReports.reduce((acc, report) => {
      if (!acc[report.employeeName]) {
        acc[report.employeeName] = {
          department: report.department,
          count: 0,
          totalAchievement: 0,
          reports: []
        };
      }
      acc[report.employeeName].count++;
      acc[report.employeeName].totalAchievement += report.achievementRate;
      acc[report.employeeName].reports.push(report);
      return acc;
    }, {} as any);

    const overallStats = {
      totalReports: filteredReports.length,
      averageAchievement: Math.round(
        filteredReports.reduce((sum, report) => sum + report.achievementRate, 0) / filteredReports.length
      ),
      departmentCount: Object.keys(departmentStats).length,
      employeeCount: Object.keys(employeeStats).length
    };

    const analysisData = {
      filterInfo,
      overallStats,
      departmentStats: Object.entries(departmentStats).map(([dept, stats]: [string, any]) => ({
        department: dept,
        reportCount: stats.count,
        employeeCount: stats.employees.size,
        averageAchievement: Math.round(stats.totalAchievement / stats.count)
      })),
      employeeStats: Object.entries(employeeStats).map(([name, stats]: [string, any]) => ({
        employeeName: name,
        department: stats.department,
        reportCount: stats.count,
        averageAchievement: Math.round(stats.totalAchievement / stats.count),
        reports: stats.reports
      })),
      allReports: filteredReports
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };

    const summary = generateSummaryText(analysisData);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error generating personal summary:', error);
    return NextResponse.json(
      { error: '요약 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

function generateSummaryText(data: any): string {
  const { filterInfo, overallStats, employeeStats, allReports } = data;
  
  // 업무를 프로젝트/주제별로 그룹화
  const projectGroups: { [key: string]: any } = {};
  
  allReports.forEach((report: any) => {
    // 업무 개요에서 프로젝트명/주제 추출 (첫 단어나 구문)
    const projectKey = report.workOverview.split(/[-,]/)[0].trim();
    
    if (!projectGroups[projectKey]) {
      projectGroups[projectKey] = {
        projectName: projectKey,
        tasks: [],
        employees: new Set(),
        dates: new Set(),
        totalAchievement: 0,
        count: 0,
        details: {}
      };
    }
    
    projectGroups[projectKey].tasks.push({
      date: report.date,
      employee: report.employeeName,
      work: report.workOverview,
      goal: report.progressGoal,
      achievement: report.achievementRate,
      remarks: report.remarks
    });
    projectGroups[projectKey].employees.add(report.employeeName);
    projectGroups[projectKey].dates.add(report.date);
    projectGroups[projectKey].totalAchievement += report.achievementRate;
    projectGroups[projectKey].count++;
    
    // 세부 작업별 그룹화
    const detailKey = `${report.workOverview}|||${report.progressGoal}`;
    if (!projectGroups[projectKey].details[detailKey]) {
      projectGroups[projectKey].details[detailKey] = {
        work: report.workOverview,
        goal: report.progressGoal,
        dates: [],
        employees: new Set(),
        achievements: []
      };
    }
    projectGroups[projectKey].details[detailKey].dates.push(report.date);
    projectGroups[projectKey].details[detailKey].employees.add(report.employeeName);
    projectGroups[projectKey].details[detailKey].achievements.push(report.achievementRate);
  });
  
  // 프로젝트 정렬 (작업 수 기준)
  const sortedProjects = Object.values(projectGroups)
    .sort((a: any, b: any) => b.count - a.count);
  
  let summary = `# 업무 보고 요약\n\n`;
  summary += `📅 기간: ${filterInfo.period}\n`;
  summary += `👥 대상: ${filterInfo.department === '전체 부서' ? '전체' : filterInfo.department} ${filterInfo.employee === '전체 사원' ? '' : `- ${filterInfo.employee}`}\n`;
  summary += `📊 전체 달성률: ${overallStats.averageAchievement}%\n\n`;
  summary += `---\n\n`;
  
  // 주요 프로젝트/업무별 요약
  let projectNum = 1;
  sortedProjects.forEach((project: any) => {
    const avgAchievement = Math.round(project.totalAchievement / project.count);
    const dateRange = Array.from(project.dates).sort();
    const startDate = dateRange[0];
    const endDate = dateRange[dateRange.length - 1];
    
    summary += `## ✅ ${projectNum}. ${project.projectName}\n\n`;
    
    summary += `### 주요 작업 내용\n`;
    
    // 세부 작업들 정리
    Object.values(project.details)
      .sort((a: any, b: any) => b.dates.length - a.dates.length)
      .forEach((detail: any) => {
        const avgDetailAchievement = Math.round(
          detail.achievements.reduce((sum: number, rate: number) => sum + rate, 0) / detail.achievements.length
        );
        
        summary += `**${detail.work}**\n`;
        summary += `- ${detail.goal}\n`;
        if (detail.employees.size > 1) {
          summary += `- 담당: ${Array.from(detail.employees).join(', ')}\n`;
        }
        if (detail.dates.length > 1) {
          summary += `- 수행: ${detail.dates.length}회 (${detail.dates[0]} ~ ${detail.dates[detail.dates.length - 1]})\n`;
        }
        summary += `- 달성률: ${avgDetailAchievement}%\n\n`;
      });
    
    summary += `### 결과 및 성과\n`;
    summary += `- 작업 기간: ${startDate === endDate ? startDate : `${startDate} ~ ${endDate}`}\n`;
    summary += `- 참여 인원: ${Array.from(project.employees).join(', ')} (${project.employees.size}명)\n`;
    summary += `- 평균 달성률: ${avgAchievement}%\n`;
    summary += `- 총 작업 수: ${project.count}건\n\n`;
    
    projectNum++;
  });
  
  // 인원별 기여도 요약
  summary += `## 📌 인원별 업무 요약\n\n`;
  
  employeeStats
    .sort((a: any, b: any) => b.averageAchievement - a.averageAchievement)
    .forEach((emp: any) => {
      const empProjects = new Set<string>();
      emp.reports.forEach((report: any) => {
        const projectKey = report.workOverview.split(/[-,]/)[0].trim();
        empProjects.add(projectKey);
      });
      
      summary += `### ${emp.employeeName} (${emp.department})\n`;
      summary += `- 총 보고서: ${emp.reportCount}건\n`;
      summary += `- 평균 달성률: ${emp.averageAchievement}%\n`;
      summary += `- 주요 참여 프로젝트: ${Array.from(empProjects).slice(0, 3).join(', ')}${empProjects.size > 3 ? ` 외 ${empProjects.size - 3}개` : ''}\n\n`;
    });
  
  // 종합 정리 테이블
  summary += `## 📊 종합 정리\n\n`;
  summary += `| 구분 | 주요 업무 | 달성률 | 상태 |\n`;
  summary += `|------|-----------|--------|------|\n`;
  
  sortedProjects.slice(0, 5).forEach((project: any) => {
    const avgAchievement = Math.round(project.totalAchievement / project.count);
    const status = avgAchievement >= 90 ? '✅ 완료' : 
                   avgAchievement >= 70 ? '🔄 진행중' : 
                   '⚠️ 지연';
    summary += `| ${project.projectName} | ${project.count}개 작업 | ${avgAchievement}% | ${status} |\n`;
  });
  
  summary += `\n`;
  
  // 특이사항 (연차, 미작성 등)
  const annualLeaves = allReports.filter((r: any) => r.workOverview === '연차');
  if (annualLeaves.length > 0) {
    summary += `## 🗓️ 기타 사항\n`;
    const leaveDates: { [key: string]: string[] } = {};
    annualLeaves.forEach((leave: any) => {
      if (!leaveDates[leave.employeeName]) {
        leaveDates[leave.employeeName] = [];
      }
      leaveDates[leave.employeeName].push(leave.date);
    });
    
    Object.entries(leaveDates).forEach(([name, dates]) => {
      summary += `- ${name}: 연차 (${dates.join(', ')})\n`;
    });
    summary += `\n`;
  }
  
  summary += `---\n\n`;
  summary += `💡 필요하시면 위 내용을 주간보고, 월간보고 또는 회의자료용으로 재구성해드릴 수 있습니다.\n`;
  
  return summary;
}