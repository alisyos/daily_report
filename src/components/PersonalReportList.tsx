'use client';

import React, { useState, useEffect } from 'react';

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

interface Employee {
  employeeCode: string;
  employeeName: string;
  position: string;
  department: string;
}


type FilterType = 'month' | 'custom';

export default function PersonalReportList() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filterSummary, setFilterSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);


  const fetchData = async () => {
    try {
      const [reportsResponse, employeesResponse, departmentsResponse] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/employees'),
        fetch('/api/departments')
      ]);

      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setReports(reportsData);
      }

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        setEmployees(employeesData);
      }

      if (departmentsResponse.ok) {
        const departmentsData = await departmentsResponse.json();
        setDepartments(departmentsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFilterSummary = async () => {
    if (filteredReports.length === 0) {
      alert('요약할 보고서가 없습니다.');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const response = await fetch('/api/personal-summary/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          reports: filteredReports,
          filterType,
          filterMonth,
          filterStartDate,
          filterEndDate,
          filterDepartment,
          filterEmployee
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFilterSummary(data.summary);
        setShowSummaryModal(true);
      } else {
        const error = await response.json();
        alert(`요약 생성 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('요약 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };


  const filteredReports = reports.filter(report => {
    const matchesDepartment = !filterDepartment || report.department === filterDepartment;
    const matchesEmployee = !filterEmployee || report.employeeName === filterEmployee;
    
    let matchesDate = false;
    if (filterType === 'month' && filterMonth) {
      const reportMonth = report.date.slice(0, 7);
      matchesDate = reportMonth === filterMonth;
    } else if (filterType === 'custom' && filterStartDate && filterEndDate) {
      const reportDate = new Date(report.date);
      const start = new Date(filterStartDate);
      const end = new Date(filterEndDate);
      matchesDate = reportDate >= start && reportDate <= end;
    } else {
      matchesDate = true;
    }
    
    return matchesDate && matchesDepartment && matchesEmployee;
  });

  const groupedByEmployee = filteredReports.reduce((acc, report) => {
    if (!acc[report.employeeName]) {
      acc[report.employeeName] = {};
    }
    if (!acc[report.employeeName][report.date]) {
      acc[report.employeeName][report.date] = [];
    }
    acc[report.employeeName][report.date].push(report);
    return acc;
  }, {} as { [employeeName: string]: { [date: string]: DailyReport[] } });


  const calculateMonthlyStats = (employeeReports: { [date: string]: DailyReport[] }) => {
    let totalAchievement = 0;
    let workingDays = 0;
    let annualLeaveDays = 0;

    Object.values(employeeReports).forEach(dailyReports => {
      dailyReports.forEach(report => {
        if (report.workOverview === '연차') {
          annualLeaveDays++;
        } else if (report.workOverview !== '작성 안됨') {
          workingDays++;
          totalAchievement += report.achievementRate;
        }
      });
    });

    const avgAchievement = workingDays > 0 ? Math.round(totalAchievement / workingDays) : 0;

    return {
      totalDays: Object.keys(employeeReports).length,
      workingDays,
      annualLeaveDays,
      avgAchievement
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md p-4">
        
        <div className="mb-4">
          <div className="flex gap-4 mb-3">
            <label className="flex items-center">
              <input
                type="radio"
                value="month"
                checked={filterType === 'month'}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="mr-2"
              />
              월 단위 선택
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="custom"
                checked={filterType === 'custom'}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="mr-2"
              />
              직접 입력
            </label>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          {filterType === 'month' ? (
            <div className="flex-1">
              <label htmlFor="filterMonth" className="block text-sm font-medium text-gray-700 mb-1">
                월 선택
              </label>
              <input
                type="month"
                id="filterMonth"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <div className="flex-1 flex gap-3">
              <div className="flex-1">
                <label htmlFor="filterStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                  시작일
                </label>
                <input
                  type="date"
                  id="filterStartDate"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="filterEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                  종료일
                </label>
                <input
                  type="date"
                  id="filterEndDate"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
          
          <div className="flex-1">
            <label htmlFor="filterDepartment" className="block text-sm font-medium text-gray-700 mb-1">
              부서 필터
            </label>
            <select
              id="filterDepartment"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 부서</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label htmlFor="filterEmployee" className="block text-sm font-medium text-gray-700 mb-1">
              사원명 필터
            </label>
            <select
              id="filterEmployee"
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 사원</option>
              {employees
                .filter(emp => !filterDepartment || emp.department === filterDepartment)
                .sort((a, b) => {
                  // 사원 코드를 숫자로 비교
                  const numA = parseInt(a.employeeCode.replace(/[^0-9]/g, '')) || 0;
                  const numB = parseInt(b.employeeCode.replace(/[^0-9]/g, '')) || 0;
                  
                  if (numA !== numB) {
                    return numA - numB;
                  }
                  
                  // 숫자가 같으면 전체 문자열로 비교
                  return a.employeeCode.localeCompare(b.employeeCode);
                })
                .map((emp) => (
                  <option key={emp.employeeCode} value={emp.employeeName}>
                    {emp.employeeName} ({emp.position})
                  </option>
                ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterMonth(new Date().toISOString().slice(0, 7));
                setFilterStartDate('');
                setFilterEndDate('');
                setFilterDepartment('');
                setFilterEmployee('');
                setFilterType('month');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              필터 초기화
            </button>
            <button
              onClick={generateFilterSummary}
              disabled={isGeneratingSummary || filteredReports.length === 0}
              className={`ml-2 px-4 py-2 ${
                isGeneratingSummary || filteredReports.length === 0
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white rounded-md flex items-center`}
            >
              {isGeneratingSummary ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AI 요약 생성 중...
                </>
              ) : (
                'AI 요약 생성'
              )}
            </button>
          </div>
        </div>

        {filterType === 'custom' && (
          <div className="mb-4 text-sm text-gray-600">
            ※ 최대 31일까지 선택 가능합니다.
          </div>
        )}
      </div>

      <div className="space-y-4">
        {Object.keys(groupedByEmployee).length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            조건에 맞는 보고서가 없습니다.
          </div>
        ) : (
          Object.entries(groupedByEmployee)
            .sort(([nameA], [nameB]) => {
              // 항상 사원 코드 순서로 정렬
              const empA = employees.find(emp => emp.employeeName === nameA);
              const empB = employees.find(emp => emp.employeeName === nameB);
              const codeA = empA?.employeeCode || '';
              const codeB = empB?.employeeCode || '';
              
              // 사원 코드를 숫자로 비교 (예: EMP001, EMP002 등)
              const numA = parseInt(codeA.replace(/[^0-9]/g, '')) || 0;
              const numB = parseInt(codeB.replace(/[^0-9]/g, '')) || 0;
              
              if (numA !== numB) {
                return numA - numB;
              }
              
              // 숫자가 같으면 전체 문자열로 비교
              return codeA.localeCompare(codeB);
            })
            .map(([employeeName, employeeReports]) => {
              const employee = employees.find(emp => emp.employeeName === employeeName);
              const stats = filterType === 'month' ? calculateMonthlyStats(employeeReports) : null;
            
            return (
              <div key={employeeName} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-50 p-4 border-b border-blue-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-blue-900">{employeeName}</h3>
                      <p className="text-sm text-blue-700">
                        {employee?.position} | {employee?.department}
                      </p>
                    </div>
                    {filterType === 'month' && stats && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          근무: {stats.workingDays}일 | 연차: {stats.annualLeaveDays}일 | 평균 달성률: {stats.avgAchievement}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <table className="w-full table-fixed border-collapse">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 w-[10%]">날짜</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 w-[20%]">업무</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 w-[20%]">진행 목표</th>
                        <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 w-[14%]">달성률</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 w-[18%]">비고</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 w-[18%]">팀장평가</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.entries(employeeReports)
                        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                        .flatMap(([date, dailyReports]) => 
                          dailyReports.map((report, idx) => (
                            <tr key={`${date}-${idx}`} className="hover:bg-gray-50">
                              <td className="px-3 py-3 text-sm text-gray-900 align-top">{date}</td>
                              <td className="px-3 py-3 text-sm text-gray-900 align-top">
                                <div className="whitespace-pre-wrap break-words">
                                  {report.workOverview}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-900 align-top">
                                <div className="whitespace-pre-wrap break-words">
                                  {report.progressGoal}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-900 align-top">
                                <div className="flex items-center justify-center">
                                  <span className="text-sm font-medium mr-2">{report.achievementRate}%</span>
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full"
                                      style={{ width: `${Math.min(report.achievementRate, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-900 align-top">
                                <div className="whitespace-pre-wrap break-words">
                                  {report.remarks || '-'}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-900 align-top">
                                <div className="whitespace-pre-wrap break-words">
                                  {report.managerEvaluation || '-'}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI 요약 모달 */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">필터 조건 업무 보고 요약</h3>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <div className="bg-blue-50 p-3 rounded-md mb-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">적용된 필터 조건</h4>
                <div className="text-sm text-blue-800">
                  <p>기간: {filterType === 'month' ? `${filterMonth} (월 단위)` : `${filterStartDate} ~ ${filterEndDate}`}</p>
                  {filterDepartment && <p>부서: {filterDepartment}</p>}
                  {filterEmployee && <p>사원명: {filterEmployee}</p>}
                  <p>총 보고서 수: {filteredReports.length}건</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">AI 생성 요약</h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {filterSummary}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}