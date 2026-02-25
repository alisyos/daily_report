'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DailyReport {
  id?: string;
  date: string;
  employeeName: string;
  employeeId?: string;
  department: string;
  workOverview: string;
  progressGoal: string;
  achievementRate: number;
  managerEvaluation: string;
  remarks: string;
  companyId?: string;
}

interface Employee {
  id?: string;
  employeeCode: string;
  employeeName: string;
  position: string;
  department: string;
  companyId?: string;
  companyName?: string;
}

interface DailySummary {
  date: string;
  department?: string;
  summary: string;
}

interface Company {
  id: string;
  companyName: string;
}

export default function ReportList() {
  const { user } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const isOperator = user?.role === 'operator';
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [editFormData, setEditFormData] = useState<DailyReport | null>(null);
  const [departmentSummaries, setDepartmentSummaries] = useState<{ [dept: string]: DailySummary }>({});
  const [editingSummaryDept, setEditingSummaryDept] = useState<string | null>(null);
  const [summaryFormData, setSummaryFormData] = useState<string>('');
  const [generatingDept, setGeneratingDept] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingReport, setIsDeletingReport] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const tableRef = useRef<HTMLTableElement>(null);

  const departmentOrder = ['GPT 1팀', 'GPT 2팀', 'AI사업부', '개발팀'];

  // 부서 → 업체명 매핑
  const deptToCompanyName = useMemo(() => {
    const map: { [dept: string]: string } = {};
    employees.forEach(emp => {
      if (emp.department && emp.companyName) {
        map[emp.department] = emp.companyName;
      }
    });
    return map;
  }, [employees]);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 관리자/사용자는 본인 부서로 자동 고정
  useEffect(() => {
    if (user && !isOperator && user.department) {
      setFilterDepartment(user.department);
    }
  }, [user, isOperator]);

  useEffect(() => {
    if (filterDate) {
      fetchDailySummaries(filterDate);
    }
  }, [filterDate]);

  const fetchData = async () => {
    try {
      const promises: Promise<Response>[] = [
        fetch('/api/reports'),
        fetch('/api/employees'),
        fetch('/api/departments')
      ];

      // 운영자는 업체 목록도 가져옴
      if (isOperator) {
        promises.push(fetch('/api/admin/companies'));
      }

      const responses = await Promise.all(promises);

      const [reportsResponse, employeesResponse, departmentsResponse] = responses;

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

      if (isOperator && responses[3] && responses[3].ok) {
        const companiesData = await responses[3].json();
        setCompanies(companiesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDailySummaries = async (date: string) => {
    try {
      const response = await fetch(`/api/summary?date=${date}`);
      if (response.ok) {
        const summariesData: DailySummary[] = await response.json();
        // 배열 응답을 {department: summary} 맵으로 변환
        const map: { [dept: string]: DailySummary } = {};
        if (Array.isArray(summariesData)) {
          summariesData.forEach(s => {
            if (s.department) {
              map[s.department] = s;
            }
          });
        }
        setDepartmentSummaries(map);
      } else {
        setDepartmentSummaries({});
      }
    } catch (error) {
      console.error('Error fetching daily summaries:', error);
      setDepartmentSummaries({});
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

      // 사원 코드가 숫자인지 확인하고 적절한 정렬 방식 사용
      const aIsNumber = !isNaN(Number(aEmployeeCode));
      const bIsNumber = !isNaN(Number(bEmployeeCode));

      if (aIsNumber && bIsNumber) {
        return Number(aEmployeeCode) - Number(bEmployeeCode);
      } else {
        return aEmployeeCode.localeCompare(bEmployeeCode);
      }
    });
  };

  // 업체별 사원 companyId 매핑
  const employeeCompanyMap = useMemo(() => {
    const map: { [name: string]: string } = {};
    employees.forEach(emp => {
      if (emp.companyId) {
        map[emp.employeeName] = emp.companyId;
      }
    });
    return map;
  }, [employees]);

  const filteredReports = sortReportsByDepartment(
    reports.filter(report => {
      const matchesDate = !filterDate || report.date === filterDate;
      const matchesDepartment = !filterDepartment || report.department === filterDepartment;
      const matchesEmployee = !filterEmployee || report.employeeName.includes(filterEmployee);
      const matchesCompany = !filterCompany || (report.companyId === filterCompany) || (employeeCompanyMap[report.employeeName] === filterCompany);
      return matchesDate && matchesDepartment && matchesEmployee && matchesCompany;
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
      const matchesCompany = !filterCompany || emp.companyId === filterCompany;
      return matchesDepartment && matchesEmployee && matchesCompany;
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
          remarks: '작성 안됨',
          companyId: employee.companyId
        });
      }
    });

    return sortReportsByDepartment(allEmployeesWithReports);
  };

  const completeReportList = getCompleteReportList();
  const groupedReports = completeReportList.reduce((acc, report) => {
    const department = report.department || '미분류';
    if (!acc[department]) {
      acc[department] = [];
    }
    acc[department].push(report);
    return acc;
  }, {} as { [key: string]: DailyReport[] });

  // 현재 표시되는 부서 목록 (순서 유지)
  const visibleDepartments = useMemo(() => {
    const ordered = departmentOrder.filter(dept => groupedReports[dept] && groupedReports[dept].length > 0);
    // departmentOrder에 없는 부서도 포함
    Object.keys(groupedReports).forEach(dept => {
      if (!ordered.includes(dept)) {
        ordered.push(dept);
      }
    });
    return ordered;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedReports]);

  const getDeptDisplayName = (dept: string) => {
    const companyName = deptToCompanyName[dept];
    if (companyName) {
      return `${companyName} / ${dept}`;
    }
    return dept;
  };

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
          id: editingReport?.id,
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

  const handleDeleteReport = async () => {
    if (!editingReport) return;

    setIsDeletingReport(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingReport.id,
          date: editingReport.date,
          employeeName: editingReport.employeeName,
          workOverview: editingReport.workOverview,
        }),
      });

      if (response.ok) {
        await fetchData();
        setEditingReport(null);
        setEditFormData(null);
        setShowDeleteConfirm(false);
      } else {
        const error = await response.json();
        alert(`삭제 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingReport(false);
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

  const handleEditSummary = (dept: string) => {
    setEditingSummaryDept(dept);
    setSummaryFormData(departmentSummaries[dept]?.summary || '');
  };

  const handleCancelSummaryEdit = () => {
    setEditingSummaryDept(null);
    setSummaryFormData('');
  };

  const handleSaveSummary = async (dept: string) => {
    if (!filterDate) return;

    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: filterDate,
          department: dept,
          summary: summaryFormData,
        }),
      });

      if (response.ok) {
        await fetchDailySummaries(filterDate);
        setEditingSummaryDept(null);
        setSummaryFormData('');
      } else {
        console.error('Failed to save summary');
      }
    } catch (error) {
      console.error('Error saving summary:', error);
    }
  };

  const handleGenerateSummary = async (dept: string) => {
    if (!filterDate) return;

    setGeneratingDept(dept);
    try {
      const response = await fetch('/api/summary/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: filterDate, department: dept }),
      });

      const result = await response.json();

      if (response.ok) {
        await fetchDailySummaries(filterDate);
        setModalMessage(`${dept} 부서의 AI 요약이 성공적으로 생성되었습니다.`);
        setShowSuccessModal(true);
      } else {
        // AI 요약은 생성되었으나 저장 실패한 경우 → 임시로 화면에 표시
        if (result.summary) {
          setDepartmentSummaries(prev => ({
            ...prev,
            [dept]: { date: filterDate, department: dept, summary: result.summary }
          }));
          setModalMessage(`${result.error || '저장 실패'}\n\n생성된 요약은 화면에 임시 표시됩니다. 직접작성 버튼으로 저장을 시도해주세요.`);
        } else {
          setModalMessage(`요약 생성 실패: ${result.error}`);
        }
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      setModalMessage('요약 생성 중 오류가 발생했습니다.');
      setShowSuccessModal(true);
    } finally {
      setGeneratingDept(null);
    }
  };

  const canEditSummary = (dept: string) => {
    if (!user) return false;
    if (user.role === 'operator') return true;
    if (user.role === 'manager') return user.department === dept;
    // user role: 본인 부서만
    return user.department === dept;
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
        const department = report.department || '미분류';
        if (!acc[department]) {
          acc[department] = [];
        }
        acc[department].push(report);
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
              .dept-summary {
                background-color: #fffde7;
                padding: 8px 10px;
                margin-bottom: 4px;
                border: 1px solid #e0e0e0;
              }
              .dept-summary h4 {
                margin: 0 0 4px 0;
                font-size: 12px;
                color: #000;
              }
              .dept-summary p {
                margin: 0;
                font-size: 11px;
                line-height: 1.4;
                color: #000;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                font-size: 10px;
                table-layout: fixed;
              }
              th, td {
                border: 1px solid #999;
                padding: 6px;
                text-align: left;
                color: #000;
                word-wrap: break-word;
                overflow-wrap: break-word;
                white-space: pre-wrap;
              }
              th {
                background-color: #e6e6e6;
                font-weight: bold;
                text-align: center;
                font-size: 11px;
              }
              .col-dept { width: 9%; }
              .col-name { width: 8%; }
              .col-work { width: 23%; }
              .col-goal { width: 23%; }
              .col-rate { width: 10%; }
              .col-remarks { width: 18%; }
              .col-eval { width: 18%; }
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
            .dept-summary {
              background-color: #fffde7;
              padding: 8px 10px;
              margin-bottom: 4px;
              border: 1px solid #e0e0e0;
            }
            .dept-summary h4 {
              margin: 0 0 4px 0;
              font-size: 12px;
              color: #000;
            }
            .dept-summary p {
              margin: 0;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 10px;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #999;
              padding: 6px;
              text-align: left;
              color: #000;
              word-wrap: break-word;
              overflow-wrap: break-word;
              white-space: pre-wrap;
            }
            th {
              background-color: #e6e6e6;
              font-weight: bold;
              text-align: center;
              font-size: 11px;
            }
            .col-dept { width: 9%; }
            .col-name { width: 8%; }
            .col-work { width: 23%; }
            .col-goal { width: 23%; }
            .col-rate { width: 10%; }
            .col-remarks { width: 18%; }
            .col-eval { width: 18%; }
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

          <table>
            <thead>
              <tr>
                <th class="col-dept">부서명</th>
                <th class="col-name">사원명</th>
                <th class="col-work">업무</th>
                <th class="col-goal">진행목표</th>
                <th class="col-rate">달성률</th>
                <th class="col-remarks">비고</th>
                <th class="col-eval">팀장평가</th>
              </tr>
            </thead>
            <tbody>
              ${departmentOrder.map(dept => {
                const deptReports = groupedReports[dept];
                if (!deptReports || deptReports.length === 0) return '';

                const deptDisplay = getDeptDisplayName(dept);
                const deptSummary = departmentSummaries[dept];

                return `
                  <tr class="no-break">
                    <td colspan="7" class="dept-header">
                      ${deptDisplay}
                    </td>
                  </tr>
                  ${deptSummary ? `
                  <tr class="no-break">
                    <td colspan="7" style="background-color: #fffde7; padding: 8px;">
                      <strong>부서 요약:</strong> ${deptSummary.summary}
                    </td>
                  </tr>
                  ` : ''}
                  ${deptReports.map(report => `
                    <tr class="no-break">
                      <td class="col-dept">${report.department}</td>
                      <td class="col-name">${report.employeeName}</td>
                      <td class="col-work">${report.workOverview}</td>
                      <td class="col-goal">${report.progressGoal}</td>
                      <td class="col-rate center">${report.achievementRate}%</td>
                      <td class="col-remarks">${report.remarks || '-'}</td>
                      <td class="col-eval">${report.managerEvaluation || '-'}</td>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            />
          </div>
          {isOperator && (
            <div className="flex-1">
              <label htmlFor="filterCompany" className="block text-sm font-medium text-gray-700 mb-1">
                업체 필터
              </label>
              <select
                id="filterCompany"
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
              >
                <option value="">모든 업체</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.companyName}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isOperator && (
            <div className="flex-1">
              <label htmlFor="filterDepartment" className="block text-sm font-medium text-gray-700 mb-1">
                부서 필터
              </label>
              <select
                id="filterDepartment"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
              >
                <option value="">모든 부서</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterDate('');
                if (isOperator) {
                  setFilterDepartment('');
                  setFilterCompany('');
                }
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

        <div ref={tableRef}>
          <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <thead className="bg-gray-200">
              <tr>
                <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider" style={{ width: '9%' }}>
                  부서명
                </th>
                <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider" style={{ width: '8%' }}>
                  사원명
                </th>
                <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider" style={{ width: '23%' }}>
                  업무
                </th>
                <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider" style={{ width: '23%' }}>
                  진행 목표
                </th>
                <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider" style={{ width: '10%' }}>
                  달성률
                </th>
                <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider" style={{ width: '18%' }}>
                  비고
                </th>
                <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider" style={{ width: '18%' }}>
                  팀장평가
                </th>
                <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider" style={{ width: '6%' }}>
                  수정
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visibleDepartments.map((dept) => {
                const deptReports = groupedReports[dept];
                if (!deptReports || deptReports.length === 0) return null;

                const deptSummary = departmentSummaries[dept];
                const isEditingThisDeptSummary = editingSummaryDept === dept;
                const isGeneratingThisDept = generatingDept === dept;
                const canEdit = canEditSummary(dept);

                 return (
                   <React.Fragment key={dept}>
                     {/* 부서 구분 행 */}
                     <tr className="bg-blue-50">
                       <td colSpan={8} className="px-3 py-2 text-sm font-semibold text-blue-900 border-b-2 border-blue-200">
                         {getDeptDisplayName(dept)}
                       </td>
                     </tr>

                     {/* 부서별 요약 영역 */}
                     {filterDate && (
                       <tr className="bg-yellow-50">
                         <td colSpan={8} className="px-3 py-2">
                           <div className="flex items-start justify-between">
                             <div className="flex-1">
                               <span className="text-xs font-semibold text-yellow-800 mr-2">부서 요약</span>
                               {isEditingThisDeptSummary ? (
                                 <div className="mt-1 space-y-2">
                                   <textarea
                                     value={summaryFormData}
                                     onChange={(e) => setSummaryFormData(e.target.value)}
                                     rows={3}
                                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 text-sm"
                                     placeholder="부서 요약을 입력하세요..."
                                   />
                                   <div className="flex gap-2">
                                     <button
                                       onClick={() => handleSaveSummary(dept)}
                                       className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                                     >
                                       저장
                                     </button>
                                     <button
                                       onClick={handleCancelSummaryEdit}
                                       className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-xs"
                                     >
                                       취소
                                     </button>
                                   </div>
                                 </div>
                               ) : (
                                 <span className="text-sm text-gray-700">
                                   {deptSummary ? (
                                     <span className="whitespace-pre-wrap break-words">{deptSummary.summary}</span>
                                   ) : (
                                     <span className="text-gray-400 italic">요약이 작성되지 않았습니다.</span>
                                   )}
                                 </span>
                               )}
                             </div>
                             {!isEditingThisDeptSummary && canEdit && (
                               <div className="flex gap-1 ml-2 flex-shrink-0">
                                 <button
                                   onClick={() => handleGenerateSummary(dept)}
                                   disabled={isGeneratingThisDept}
                                   className={`text-xs font-medium px-2 py-1 rounded ${
                                     isGeneratingThisDept
                                       ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                       : 'bg-green-600 text-white hover:bg-green-700'
                                   }`}
                                 >
                                   {isGeneratingThisDept ? 'AI 생성 중...' : 'AI 자동생성'}
                                 </button>
                                 <button
                                   onClick={() => handleEditSummary(dept)}
                                   className="text-xs font-medium px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                                 >
                                   {deptSummary ? '수정' : '직접작성'}
                                 </button>
                               </div>
                             )}
                           </div>
                         </td>
                       </tr>
                     )}

                     {/* 보고서 행들 */}
                     {deptReports.map((report, index) => (
                       <tr key={`${dept}-${index}`} className="hover:bg-gray-50">
                         <td className="px-3 py-2 text-sm text-gray-900" style={{ width: '9%', verticalAlign: 'top' }}>
                           <div className="truncate" title={report.department}>
                             {report.department}
                           </div>
                         </td>
                         <td className="px-3 py-2 text-sm text-gray-900" style={{ width: '8%', verticalAlign: 'top' }}>
                           <div className="truncate" title={report.employeeName}>
                             {report.employeeName}
                           </div>
                         </td>
                         <td className={`px-3 py-2 text-sm ${report.workOverview === '작성 안됨' ? 'text-gray-500 italic' : 'text-gray-900'}`} style={{ width: '23%', verticalAlign: 'top' }}>
                           <div className="break-words whitespace-pre-wrap" style={{ lineHeight: '1.4', wordWrap: 'break-word' }} title={report.workOverview}>
                             {report.workOverview}
                           </div>
                         </td>
                         <td className={`px-3 py-2 text-sm ${report.progressGoal === '-' ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: '23%', verticalAlign: 'top' }}>
                           <div className="break-words whitespace-pre-wrap" style={{ lineHeight: '1.4', wordWrap: 'break-word' }} title={report.progressGoal}>
                             {report.progressGoal}
                           </div>
                         </td>
                         <td className="px-3 py-2 text-sm text-gray-900" style={{ width: '10%', verticalAlign: 'top' }}>
                           {report.workOverview === '작성 안됨' ? (
                             <span className="text-gray-500 text-sm">-</span>
                           ) : (
                             <div className="flex items-center">
                               <span className="text-sm font-medium mr-1 text-xs">{report.achievementRate}%</span>
                               <div className="flex-1 bg-gray-200 rounded-full h-2">
                                 <div
                                   className="bg-blue-600 h-2 rounded-full"
                                   style={{ width: `${Math.min(report.achievementRate, 100)}%` }}
                                 ></div>
                               </div>
                             </div>
                           )}
                         </td>
                         <td className={`px-3 py-2 text-sm ${report.remarks === '작성 안됨' ? 'text-gray-500 italic' : 'text-gray-900'}`} style={{ width: '18%', verticalAlign: 'top' }}>
                           <div className="break-words whitespace-pre-wrap" style={{ lineHeight: '1.4', wordWrap: 'break-word' }} title={report.remarks || '-'}>
                             {report.remarks || '-'}
                           </div>
                         </td>
                         <td className={`px-3 py-2 text-sm ${report.managerEvaluation === '-' ? 'text-gray-500' : 'text-gray-900'}`} style={{ width: '18%', verticalAlign: 'top' }}>
                           <div className="break-words whitespace-pre-wrap" style={{ lineHeight: '1.4', wordWrap: 'break-word' }} title={report.managerEvaluation || '-'}>
                             {report.managerEvaluation || '-'}
                           </div>
                         </td>
                         <td className="px-3 py-2 text-sm text-gray-900" style={{ width: '6%', verticalAlign: 'top' }}>
                           {report.workOverview === '작성 안됨' ? (
                             <span className="text-gray-400 text-sm">-</span>
                           ) : (
                             <button
                               onClick={() => handleEdit(report)}
                               className="text-blue-600 hover:text-blue-900 font-medium text-xs"
                               title="수정"
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
                  setShowDeleteConfirm(false);
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">진행 목표</label>
                <textarea
                  value={editFormData.progressGoal}
                  onChange={(e) => handleEditInputChange('progressGoal', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">달성률 (%)</label>
                  <input
                    type="number"
                    value={editFormData.achievementRate === 0 ? '' : editFormData.achievementRate}
                    onChange={(e) => handleEditInputChange('achievementRate', e.target.value === '' ? 0 : Number(e.target.value))}
                    min="0"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                <textarea
                  value={editFormData.remarks}
                  onChange={(e) => handleEditInputChange('remarks', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">팀장 평가</label>
                <textarea
                  value={editFormData.managerEvaluation}
                  onChange={(e) => handleEditInputChange('managerEvaluation', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              {user && (user.role === 'operator' || user.role === 'manager') && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
                  disabled={isDeletingReport}
                >
                  삭제
                </button>
              )}
              {user && user.role === 'user' && <div />}

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setEditingReport(null);
                    setEditFormData(null);
                    setShowDeleteConfirm(false);
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
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">보고서 삭제</h3>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500">
                다음 보고서를 삭제하시겠습니까?
              </p>
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-900">
                  {editingReport?.employeeName} - {editingReport?.date}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  업무: {editingReport?.workOverview}
                </p>
              </div>
              <p className="text-sm text-red-600 mt-2">
                ※ 삭제된 보고서는 복구할 수 없습니다.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                disabled={isDeletingReport}
              >
                취소
              </button>
              <button
                onClick={handleDeleteReport}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center"
                disabled={isDeletingReport}
              >
                {isDeletingReport ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    삭제 중...
                  </>
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 성공/실패 메시지 모달 */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                {modalMessage.includes('성공') ? (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  {modalMessage.includes('성공') ? '성공' : '알림'}
                </h3>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500">
                {modalMessage}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
