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
      if (!acc[report.department]) {
        acc[report.department] = {
          count: 0,
          totalAchievement: 0,
          employees: new Set()
        };
      }
      acc[report.department].count++;
      acc[report.department].totalAchievement += report.achievementRate;
      acc[report.department].employees.add(report.employeeName);
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
        averageAchievement: Math.round(stats.totalAchievement / stats.count)
      })),
      recentReports: filteredReports
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
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
  const { filterInfo, overallStats, departmentStats, employeeStats } = data;
  
  let summary = `# 개인 업무 보고 요약\n\n`;
  
  summary += `## 📊 필터 조건 및 기본 정보\n`;
  summary += `- 조회 기간: ${filterInfo.period}\n`;
  summary += `- 대상 부서: ${filterInfo.department}\n`;
  summary += `- 대상 사원: ${filterInfo.employee}\n`;
  summary += `- 총 보고서 수: ${overallStats.totalReports}건\n`;
  summary += `- 전체 평균 달성률: ${overallStats.averageAchievement}%\n\n`;

  if (departmentStats.length > 1) {
    summary += `## 🏢 부서별 현황\n`;
    departmentStats
      .sort((a: any, b: any) => b.averageAchievement - a.averageAchievement)
      .forEach((dept: any) => {
        summary += `- **${dept.department}**: ${dept.reportCount}건 (${dept.employeeCount}명), 평균 달성률 ${dept.averageAchievement}%\n`;
      });
    summary += `\n`;
  }

  if (employeeStats.length > 1) {
    summary += `## 👥 개인별 현황\n`;
    const topPerformers = employeeStats
      .sort((a: any, b: any) => b.averageAchievement - a.averageAchievement)
      .slice(0, 5);
    
    topPerformers.forEach((emp: any, index: number) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐';
      summary += `${medal} **${emp.employeeName}** (${emp.department}): ${emp.reportCount}건, 평균 달성률 ${emp.averageAchievement}%\n`;
    });
    summary += `\n`;
  }

  summary += `## 📈 성과 분석\n`;
  const highPerformers = employeeStats.filter((emp: any) => emp.averageAchievement >= 90).length;
  const mediumPerformers = employeeStats.filter((emp: any) => emp.averageAchievement >= 70 && emp.averageAchievement < 90).length;
  const lowPerformers = employeeStats.filter((emp: any) => emp.averageAchievement < 70).length;

  summary += `- 고성과자 (90% 이상): ${highPerformers}명\n`;
  summary += `- 보통 성과자 (70-89%): ${mediumPerformers}명\n`;
  summary += `- 개선 필요 (70% 미만): ${lowPerformers}명\n\n`;

  if (overallStats.averageAchievement >= 85) {
    summary += `## ✨ 종합 평가\n전체적으로 우수한 성과를 보이고 있습니다. 평균 달성률이 ${overallStats.averageAchievement}%로 목표 수준을 크게 상회하고 있습니다.\n\n`;
  } else if (overallStats.averageAchievement >= 70) {
    summary += `## 📊 종합 평가\n전체적으로 양호한 성과를 보이고 있습니다. 평균 달성률 ${overallStats.averageAchievement}%로 적정 수준을 유지하고 있으나, 추가적인 개선 여지가 있습니다.\n\n`;
  } else {
    summary += `## 🔄 종합 평가\n전체 평균 달성률이 ${overallStats.averageAchievement}%로 개선이 필요한 상황입니다. 성과 향상을 위한 구체적인 지원 방안 검토가 필요합니다.\n\n`;
  }

  summary += `## 📝 주요 업무 동향\n`;
  const workTypes = data.recentReports.reduce((acc: any, report: any) => {
    const workType = report.workOverview.split(' ')[0];
    acc[workType] = (acc[workType] || 0) + 1;
    return acc;
  }, {});

  const topWorkTypes = Object.entries(workTypes)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5);

  topWorkTypes.forEach(([type, count]) => {
    summary += `- ${type}: ${count}건\n`;
  });

  return summary;
}