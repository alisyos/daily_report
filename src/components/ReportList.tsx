'use client';

import React, { useState, useEffect, useRef } from 'react';

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

interface DailySummary {
  date: string;
  summary: string;
}

export default function ReportList() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [editFormData, setEditFormData] = useState<DailyReport | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryFormData, setSummaryFormData] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  const departmentOrder = ['GPT 1팀', 'GPT 2팀', 'AI사업부', '개발팀'];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (filterDate) {
      fetchDailySummary(filterDate);
    }
  }, [filterDate]);

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
        
        // Set the most recent report date as default filter
        if (reportsData.length > 0) {
          const sortedDates = [...new Set(reportsData.map((report: DailyReport) => report.date))].sort().reverse();
          const mostRecentDate = sortedDates[0] as string;
          setFilterDate(mostRecentDate);
        }
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

  const fetchDailySummary = async (date: string) => {
    try {
      const response = await fetch(`/api/summary?date=${date}`);
      if (response.ok) {
        const summaryData = await response.json();
        setDailySummary(summaryData);
      } else {
        setDailySummary(null);
      }
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      setDailySummary(null);
    }
  };

  const sortReportsByDepartment = (reports: DailyReport[]) => {
    return reports.sort((a, b) => {
      const aIndex = departmentOrder.indexOf(a.department);
      const bIndex = departmentOrder.indexOf(b.department);
      const aOrder = aIndex === -1 ? 999 : aIndex;
      const bOrder = bIndex === -1 ? 999 : bIndex;
      
      // 부서가 다르면 부서 순으로 정렬
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      // 같은 부서 내에서는 사원 코드 순으로 정렬
      const aEmployee = employees.find(emp => emp.employeeName === a.employeeName);
      const bEmployee = employees.find(emp => emp.employeeName === b.employeeName);
      
      const aEmployeeCode = aEmployee?.employeeCode || '';
      const bEmployeeCode = bEmployee?.employeeCode || '';
      
      return aEmployeeCode.localeCompare(bEmployeeCode);
    });
  };

  const filteredReports = sortReportsByDepartment(
    reports.filter(report => {
      const matchesDate = !filterDate || report.date === filterDate;
      const matchesDepartment = !filterDepartment || report.department === filterDepartment;
      const matchesEmployee = !filterEmployee || report.employeeName.includes(filterEmployee);
      return matchesDate && matchesDepartment && matchesEmployee;
    })
  );

  // 연차 및 미등록 사원 포함한 완전한 리스트 생성
  const getCompleteReportList = () => {
    if (!filterDate) return filteredReports;

    const reportedEmployees = new Set(filteredReports.map(report => report.employeeName));
    const allEmployeesWithReports: DailyReport[] = [...filteredReports];

    // 필터된 부서에 해당하는 사원들만 확인
    const relevantEmployees = employees.filter(emp => {
      const matchesDepartment = !filterDepartment || emp.department === filterDepartment;
      const matchesEmployee = !filterEmployee || emp.employeeName.includes(filterEmployee);
      return matchesDepartment && matchesEmployee;
    });

    // 보고서가 없는 사원들을 작성 안됨으로 추가
    relevantEmployees.forEach(employee => {
      if (!reportedEmployees.has(employee.employeeName)) {
        allEmployeesWithReports.push({
          date: filterDate,
          employeeName: employee.employeeName,
          department: employee.department,
          workOverview: '작성 안됨',
          progressGoal: '-',
          achievementRate: 0,
          managerEvaluation: '-',
          remarks: '작성 안됨'
        });
      }
    });

    return sortReportsByDepartment(allEmployeesWithReports);
  };

  const completeReportList = getCompleteReportList();
  const groupedReports = completeReportList.reduce((acc, report) => {
    if (!acc[report.department]) {
      acc[report.department] = [];
    }
    acc[report.department].push(report);
    return acc;
  }, {} as { [key: string]: DailyReport[] });

  const handleEdit = (report: DailyReport) => {
    setEditingReport(report);
    setEditFormData({ ...report });
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;

    try {
      const response = await fetch('/api/reports', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rowIndex: reports.findIndex(r => 
            r.date === editingReport?.date && 
            r.employeeName === editingReport?.employeeName &&
            r.workOverview === editingReport?.workOverview
          ),
          report: editFormData,
        }),
      });

      if (response.ok) {
        await fetchData();
        setEditingReport(null);
        setEditFormData(null);
      } else {
        console.error('Failed to update report');
      }
    } catch (error) {
      console.error('Error updating report:', error);
    }
  };

  const handleEditInputChange = (field: keyof DailyReport, value: string | number) => {
    if (editFormData) {
      setEditFormData({
        ...editFormData,
        [field]: field === 'achievementRate' ? Number(value) : value
      });
    }
  };

  const handleEditSummary = () => {
    setIsEditingSummary(true);
    setSummaryFormData(dailySummary?.summary || '');
  };

  const handleCancelSummaryEdit = () => {
    setIsEditingSummary(false);
    setSummaryFormData('');
  };

  const handleSaveSummary = async () => {
    if (!filterDate) return;

    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: filterDate,
          summary: summaryFormData,
        }),
      });

      if (response.ok) {
        await fetchDailySummary(filterDate);
        setIsEditingSummary(false);
        setSummaryFormData('');
      } else {
        console.error('Failed to save summary');
      }
    } catch (error) {
      console.error('Error saving summary:', error);
    }
  };

  const handleDownloadPDF = async () => {
    const completeReportList = getCompleteReportList();
    
    if (completeReportList.length === 0) {
      alert('다운로드할 보고서가 없습니다.');
      return;
    }

    setIsPdfLoading(true);

    try {
      // 통계 정보 계산
      const totalReports = completeReportList.length;
      const annualLeaveCount = completeReportList.filter((report: DailyReport) => report.workOverview === '연차').length;
      const notSubmittedCount = completeReportList.filter((report: DailyReport) => report.workOverview === '작성 안됨').length;
      const workingCount = totalReports - annualLeaveCount - notSubmittedCount;

      // 부서별 그룹화
      const groupedReports = completeReportList.reduce((acc: { [key: string]: DailyReport[] }, report: DailyReport) => {
        if (!acc[report.department]) {
          acc[report.department] = [];
        }
        acc[report.department].push(report);
        return acc;
      }, {} as { [key: string]: DailyReport[] });

      // 새 창에서 인쇄 가능한 HTML 생성
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
        return;
      }

      const reportDate = filterDate;
      const reportDepartment = filterDepartment;
      const reportSummary = dailySummary;

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>DMP코리아 일일업무 보고서</title>
          <style>
            @media print {
              @page {
                size: A4 landscape;
                margin: 15mm;
              }
              body {
                font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif;
                font-size: 11px;
                line-height: 1.3;
                color: #000;
                margin: 0;
                padding: 0;
              }
              .header {
                text-align: center;
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                color: #000;
              }
              .stats {
                background-color: #f5f5f5;
                padding: 10px;
                margin-bottom: 15px;
                border: 1px solid #ddd;
                font-size: 12px;
              }
              .summary {
                background-color: #f9f9f9;
                padding: 10px;
                margin-bottom: 15px;
                border: 1px solid #e0e0e0;
              }
              .summary h3 {
                margin: 0 0 8px 0;
                font-size: 14px;
                color: #000;
              }
              .summary p {
                margin: 0;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                font-size: 10px;
              }
              th, td {
                border: 1px solid #999;
                padding: 6px;
                text-align: left;
                color: #000;
              }
              th {
                background-color: #e6e6e6;
                font-weight: bold;
                text-align: center;
                font-size: 11px;
              }
              .dept-header {
                background-color: #d4edda !important;
                font-weight: bold;
                font-size: 12px;
                text-align: left;
              }
              .center {
                text-align: center;
              }
              .no-break {
                page-break-inside: avoid;
              }
            }
            body {
              font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif;
              font-size: 11px;
              line-height: 1.3;
              color: #000;
              margin: 20px;
              padding: 0;
            }
            .header {
              text-align: center;
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #000;
            }
            .stats {
              background-color: #f5f5f5;
              padding: 10px;
              margin-bottom: 15px;
              border: 1px solid #ddd;
              font-size: 12px;
            }
            .summary {
              background-color: #f9f9f9;
              padding: 10px;
              margin-bottom: 15px;
              border: 1px solid #e0e0e0;
            }
            .summary h3 {
              margin: 0 0 8px 0;
              font-size: 14px;
              color: #000;
            }
            .summary p {
              margin: 0;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 10px;
            }
            th, td {
              border: 1px solid #999;
              padding: 6px;
              text-align: left;
              color: #000;
            }
            th {
              background-color: #e6e6e6;
              font-weight: bold;
              text-align: center;
              font-size: 11px;
            }
            .dept-header {
              background-color: #d4edda !important;
              font-weight: bold;
              font-size: 12px;
              text-align: left;
            }
            .center {
              text-align: center;
            }
            .print-button {
              margin: 20px 0;
              text-align: center;
            }
            .print-button button {
              padding: 10px 20px;
              font-size: 14px;
              background-color: #007bff;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            }
            @media print {
              .print-button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-button">
            <button onclick="window.print()">인쇄 / PDF 저장</button>
            <button onclick="window.close()" style="margin-left: 10px; background-color: #6c757d;">닫기</button>
          </div>
          
          <div class="header">
            GPT코리아 일일업무 보고서 ${reportDate ? `(${reportDate})` : ''}
          </div>
          
          <div class="stats">
            <p style="margin: 0; color: #000;">
              총 인원: ${totalReports}명 (근무: ${workingCount}명, 연차: ${annualLeaveCount}명, 미작성: ${notSubmittedCount}명)
            </p>
            ${reportDepartment ? `<p style="margin: 8px 0 0 0; color: #000;">부서: ${reportDepartment}</p>` : ''}
          </div>

          ${reportDate && reportSummary ? `
            <div class="summary">
              <h3>일일보고요약</h3>
              <p>${reportSummary.summary}</p>
            </div>
          ` : ''}

          <table>
            <thead>
              <tr>
                <th>부서명</th>
                <th>사원명</th>
                <th>업무</th>
                <th>진행목표</th>
                <th>달성률</th>
                <th>비고</th>
                <th>팀장평가</th>
              </tr>
            </thead>
            <tbody>
              ${departmentOrder.map(dept => {
                const deptReports = groupedReports[dept];
                if (!deptReports || deptReports.length === 0) return '';

                return `
                  <tr class="no-break">
                    <td colspan="7" class="dept-header">
                      ${dept}
                    </td>
                  </tr>
                  ${deptReports.map(report => `
                    <tr class="no-break">
                      <td>${report.department}</td>
                      <td>${report.employeeName}</td>
                      <td>${report.workOverview}</td>
                      <td>${report.progressGoal}</td>
                      <td class="center">${report.achievementRate}%</td>
                      <td>${report.remarks || '-'}</td>
                      <td>${report.managerEvaluation || '-'}</td>
                    </tr>
                  `).join('')}
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // 인쇄 다이얼로그가 자동으로 열리도록 설정
      printWindow.onload = () => {
        setTimeout(() => {
          setIsPdfLoading(false);
        }, 1000);
      };
      
    } catch (error) {
      console.error('PDF 생성 중 오류:', error);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setTimeout(() => {
        setIsPdfLoading(false);
      }, 2000);
    }
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
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1">
            <label htmlFor="filterDate" className="block text-sm font-medium text-gray-700 mb-1">
              날짜 필터
            </label>
            <input
              type="date"
              id="filterDate"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
            <input
              type="text"
              id="filterEmployee"
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              placeholder="사원명 입력"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterDate('');
                setFilterDepartment('');
                setFilterEmployee('');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              필터 초기화
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isPdfLoading}
              className={`ml-2 px-4 py-2 ${isPdfLoading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md flex items-center`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isPdfLoading ? 'PDF 생성 중...' : 'PDF 다운로드'}
            </button>
          </div>
        </div>

        {/* 날짜 헤더 */}
        {filterDate && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900">
              {filterDate} 일일업무보고
            </h3>
          </div>
        )}

        {/* 일일보고요약 섹션 */}
        {filterDate && (
          <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-md font-semibold text-yellow-900">일일보고요약</h4>
              {!isEditingSummary && (
                <button
                  onClick={handleEditSummary}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {dailySummary ? '수정' : '작성'}
                </button>
              )}
            </div>
            
            {isEditingSummary ? (
              <div className="space-y-3">
                <textarea
                  value={summaryFormData}
                  onChange={(e) => setSummaryFormData(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="일일보고요약을 입력하세요..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSummary}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    저장
                  </button>
                  <button
                    onClick={handleCancelSummaryEdit}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-700">
                {dailySummary ? (
                  <p className="whitespace-pre-wrap">{dailySummary.summary}</p>
                ) : (
                  <p className="text-gray-500 italic">일일보고요약이 작성되지 않았습니다.</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto" ref={tableRef}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider w-24">
                  부서명
                </th>
                <th className="px-3 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider w-20">
                  사원명
                </th>
                <th className="px-3 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
                  업무
                </th>
                <th className="px-3 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
                  진행 목표
                </th>
                <th className="px-3 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider w-24">
                  달성률
                </th>
                <th className="px-3 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
                  비고
                </th>
                <th className="px-3 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
                  팀장평가
                </th>
                <th className="px-3 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider w-16">
                  수정
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {departmentOrder.map((dept) => {
                const deptReports = groupedReports[dept];
                if (!deptReports || deptReports.length === 0) return null;

                                 return (
                   <React.Fragment key={dept}>
                     <tr className="bg-blue-50">
                       <td colSpan={8} className="px-3 py-2 text-sm font-semibold text-blue-900 border-b-2 border-blue-200">
                         {dept}
                       </td>
                     </tr>
                     {deptReports.map((report, index) => (
                       <tr key={`${dept}-${index}`} className="hover:bg-gray-50">
                         <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                           {report.department}
                         </td>
                         <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                           {report.employeeName}
                         </td>
                         <td className={`px-3 py-2 text-sm ${report.workOverview === '작성 안됨' ? 'text-gray-500 italic' : 'text-gray-900'}`}>
                           <div className="max-w-xs">
                             {report.workOverview}
                           </div>
                         </td>
                         <td className={`px-3 py-2 text-sm ${report.progressGoal === '-' ? 'text-gray-500' : 'text-gray-900'}`}>
                           <div className="max-w-xs">
                             {report.progressGoal}
                           </div>
                         </td>
                         <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                           {report.workOverview === '작성 안됨' ? (
                             <span className="text-gray-500 text-sm">-</span>
                           ) : (
                             <div className="flex items-center">
                               <span className="text-sm font-medium">{report.achievementRate}%</span>
                               <div className="w-16 bg-gray-200 rounded-full h-2 ml-2">
                                 <div
                                   className="bg-blue-600 h-2 rounded-full"
                                   style={{ width: `${Math.min(report.achievementRate, 100)}%` }}
                                 ></div>
                               </div>
                             </div>
                           )}
                         </td>
                         <td className={`px-3 py-2 text-sm ${report.remarks === '작성 안됨' ? 'text-gray-500 italic' : 'text-gray-900'}`}>
                           <div className="max-w-xs">
                             {report.remarks || '-'}
                           </div>
                         </td>
                         <td className={`px-3 py-2 text-sm ${report.managerEvaluation === '-' ? 'text-gray-500' : 'text-gray-900'}`}>
                           <div className="max-w-xs">
                             {report.managerEvaluation || '-'}
                           </div>
                         </td>
                         <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                           {report.workOverview === '작성 안됨' ? (
                             <span className="text-gray-400 text-sm">-</span>
                           ) : (
                             <button
                               onClick={() => handleEdit(report)}
                               className="text-blue-600 hover:text-blue-900 font-medium"
                             >
                               수정
                             </button>
                           )}
                         </td>
                       </tr>
                     ))}
                   </React.Fragment>
                 );
              })}
            </tbody>
          </table>
        </div>

        {completeReportList.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            조건에 맞는 보고서가 없습니다.
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      {editingReport && editFormData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">보고서 수정</h3>
              <button
                onClick={() => {
                  setEditingReport(null);
                  setEditFormData(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                  <input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => handleEditInputChange('date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사원명</label>
                  <p className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-md">{editFormData.employeeName}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">업무</label>
                <textarea
                  value={editFormData.workOverview}
                  onChange={(e) => handleEditInputChange('workOverview', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">진행 목표</label>
                <textarea
                  value={editFormData.progressGoal}
                  onChange={(e) => handleEditInputChange('progressGoal', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">달성률 (%)</label>
                  <input
                    type="number"
                    value={editFormData.achievementRate}
                    onChange={(e) => handleEditInputChange('achievementRate', Number(e.target.value))}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                <textarea
                  value={editFormData.remarks}
                  onChange={(e) => handleEditInputChange('remarks', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">팀장 평가</label>
                <textarea
                  value={editFormData.managerEvaluation}
                  onChange={(e) => handleEditInputChange('managerEvaluation', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setEditingReport(null);
                  setEditFormData(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}