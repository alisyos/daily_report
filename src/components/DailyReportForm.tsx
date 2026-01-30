'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface Employee {
  employeeCode: string;
  employeeName: string;
  position: string;
  department: string;
}

interface WorkItem {
  workOverview: string;
  progressGoal: string;
  remarks: string;
  achievementRate: string | number;
  managerEvaluation: string;
}

interface DailyReportFormData {
  date: string;
  employeeName: string;
  isOnLeave: boolean;
  workItems: WorkItem[];
}

export default function DailyReportForm() {
  const { user } = useAuth();
  const isOperator = user?.role === 'operator';
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [reportDate, setReportDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [reports, setReports] = useState<DailyReportFormData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  // 관리자/사용자는 본인 부서로 자동 고정
  useEffect(() => {
    if (user && !isOperator && user.department) {
      setSelectedDepartment(user.department);
    }
  }, [user, isOperator]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchEmployeesByDepartment(selectedDepartment);
      setSelectedEmployees([]); // Reset selected employees when department changes
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedEmployees.length > 0) {
      fetchExistingReports();
    } else {
      setReports([]);
      setHasExistingData(false);
    }
  }, [selectedEmployees, reportDate, selectedDepartment]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchEmployeesByDepartment = async (department: string) => {
    setIsLoadingEmployees(true);
    try {
      const response = await fetch(`/api/employees/${encodeURIComponent(department)}`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const fetchExistingReports = async () => {
    setIsLoadingReports(true);
    setHasExistingData(false);
    try {
      const response = await fetch('/api/reports');
      if (response.ok) {
        const allReports = await response.json();
        
        // Filter reports for the selected date and selected employees
        const selectedEmployeeObjects = employees.filter(emp => 
          selectedEmployees.includes(emp.employeeName)
        );
        
        const existingReports = allReports.filter((report: any) => 
          report.date === reportDate && 
          selectedEmployees.includes(report.employeeName)
        );

        if (existingReports.length > 0) {
          setHasExistingData(true);
          // Group existing reports by employee
          const reportsByEmployee = existingReports.reduce((acc: any, report: any) => {
            if (!acc[report.employeeName]) {
              acc[report.employeeName] = [];
            }
            acc[report.employeeName].push(report);
            return acc;
          }, {});

          // Create reports array with existing data
          const newReports = selectedEmployeeObjects.map(employee => {
            const employeeReports = reportsByEmployee[employee.employeeName] || [];
            
            if (employeeReports.length > 0) {
              // Check if it's annual leave
              const isOnLeave = employeeReports.some((report: any) => report.workOverview === '연차');
              
              if (isOnLeave) {
                return {
                  date: reportDate,
                  employeeName: employee.employeeName,
                  isOnLeave: true,
                  workItems: [{
                    workOverview: '',
                    progressGoal: '',
                    remarks: '',
                    achievementRate: '',
                    managerEvaluation: '',
                  }]
                };
              } else {
                // Regular work reports
                return {
                  date: reportDate,
                  employeeName: employee.employeeName,
                  isOnLeave: false,
                  workItems: employeeReports.map((report: any) => ({
                    workOverview: report.workOverview,
                    progressGoal: report.progressGoal,
                    remarks: report.remarks,
                    achievementRate: report.achievementRate,
                    managerEvaluation: report.managerEvaluation,
                  }))
                };
              }
            } else {
              // No existing reports for this employee
              return {
                date: reportDate,
                employeeName: employee.employeeName,
                isOnLeave: false,
                workItems: [{
                  workOverview: '',
                  progressGoal: '',
                  remarks: '',
                  achievementRate: '',
                  managerEvaluation: '',
                }]
              };
            }
          });

          setReports(newReports);
        } else {
          // No existing reports, create empty forms
          setReports(selectedEmployeeObjects.map(employee => ({
            date: reportDate,
            employeeName: employee.employeeName,
            isOnLeave: false,
            workItems: [{
              workOverview: '',
              progressGoal: '',
              remarks: '',
              achievementRate: '',
              managerEvaluation: '',
            }]
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching existing reports:', error);
      // Fallback to empty forms
      const selectedEmployeeObjects = employees.filter(emp => 
        selectedEmployees.includes(emp.employeeName)
      );
      setReports(selectedEmployeeObjects.map(employee => ({
        date: reportDate,
        employeeName: employee.employeeName,
        isOnLeave: false,
        workItems: [{
          workOverview: '',
          progressGoal: '',
          remarks: '',
          achievementRate: '',
          managerEvaluation: '',
        }]
      })));
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleLeaveToggle = (employeeIndex: number) => {
    setReports(prev => {
      const newReports = [...prev];
      newReports[employeeIndex] = {
        ...newReports[employeeIndex],
        isOnLeave: !newReports[employeeIndex].isOnLeave
      };
      return newReports;
    });
  };

  const handleWorkItemChange = (
    employeeIndex: number,
    workItemIndex: number,
    field: keyof WorkItem,
    value: string | number
  ) => {
    setReports(prev => {
      const newReports = [...prev];
      newReports[employeeIndex] = {
        ...newReports[employeeIndex],
        workItems: newReports[employeeIndex].workItems.map((item, idx) => 
          idx === workItemIndex 
            ? { ...item, [field]: value }
            : item
        )
      };
      return newReports;
    });
  };

  const addWorkItem = (employeeIndex: number) => {
    setReports(prev => {
      const newReports = [...prev];
      newReports[employeeIndex] = {
        ...newReports[employeeIndex],
        workItems: [
          ...newReports[employeeIndex].workItems,
          {
            workOverview: '',
            progressGoal: '',
            remarks: '',
            achievementRate: '',
            managerEvaluation: '',
          }
        ]
      };
      return newReports;
    });
  };

  const removeWorkItem = (employeeIndex: number, workItemIndex: number) => {
    setReports(prev => {
      const newReports = [...prev];
      newReports[employeeIndex] = {
        ...newReports[employeeIndex],
        workItems: newReports[employeeIndex].workItems.filter((_, idx) => idx !== workItemIndex)
      };
      return newReports;
    });
  };

  const handleDateChange = (newDate: string) => {
    setReportDate(newDate);
    setReports(prev => prev.map(report => ({ ...report, date: newDate })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // Convert reports to flat structure for API
      const flatReports = reports.flatMap(report => {
        // Find employee's department
        const employee = employees.find(emp => emp.employeeName === report.employeeName);
        const department = employee?.department || selectedDepartment;

        if (report.isOnLeave) {
          // 연차인 경우 workOverview를 '연차'로 설정
          return [{
            date: report.date,
            employeeName: report.employeeName,
            department: department,
            workOverview: '연차',
            progressGoal: '-',
            achievementRate: 0,
            managerEvaluation: '-',
            remarks: '연차',
          }];
        } else {
          // 일반 업무 보고 - 내용이 있는 workItem만 필터링
          return report.workItems
            .filter(workItem =>
              workItem.workOverview.trim() ||
              workItem.progressGoal.trim() ||
              workItem.remarks.trim() ||
              workItem.managerEvaluation.trim()
            )
            .map(workItem => ({
              date: report.date,
              employeeName: report.employeeName,
              department: department,
              workOverview: workItem.workOverview,
              progressGoal: workItem.progressGoal,
              achievementRate: Number(workItem.achievementRate) || 0,
              managerEvaluation: workItem.managerEvaluation,
              remarks: workItem.remarks,
            }));
        }
      });

      // Validate that at least one report exists (either work report or leave report)
      if (flatReports.length === 0) {
        setSubmitMessage('저장할 내용이 없습니다. 최소 1개 이상의 항목을 입력하거나 연차를 체크해주세요.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reports: flatReports,
          isUpdate: hasExistingData,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSubmitMessage(result.message);
        // 등록 완료 후 등록된 내용을 확인할 수 있도록 데이터 새로고침
        setTimeout(() => {
          fetchExistingReports();
        }, 1000);
      } else {
        const error = await response.json();
        setSubmitMessage(`오류: ${error.error}`);
      }
    } catch (error) {
      setSubmitMessage('서버 오류가 발생했습니다.');
      console.error('Error submitting reports:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmployeeSelection = (employeeName: string, isSelected: boolean) => {
    setSelectedEmployees(prev => {
      if (isSelected) {
        return [...prev, employeeName];
      } else {
        return prev.filter(name => name !== employeeName);
      }
    });
  };

  const handleSelectAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(emp => emp.employeeName));
    }
  };

  const getTotalWorkItems = () => {
    return reports
      .filter(report => !report.isOnLeave)
      .reduce((total, report) => total + report.workItems.length, 0);
  };

  const getActiveEmployees = () => {
    return reports.filter(report => !report.isOnLeave).length;
  };

  const getOnLeaveEmployees = () => {
    return reports.filter(report => report.isOnLeave).length;
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-4">
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700 mb-1">
            보고 날짜
          </label>
          <input
            type="date"
            id="reportDate"
            value={reportDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          />
        </div>

        <div>
          <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
            부서 선택
          </label>
          {isOperator ? (
            <select
              id="department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            >
              <option value="">부서를 선택하세요</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={selectedDepartment}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 cursor-not-allowed"
            />
          )}
        </div>
      </div>

      {selectedDepartment && isLoadingEmployees && (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">직원 목록을 불러오는 중...</span>
        </div>
      )}

      {selectedDepartment && !isLoadingEmployees && employees.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              사원명 선택 ({selectedEmployees.length}/{employees.length}명)
            </label>
            <button
              type="button"
              onClick={handleSelectAllEmployees}
              className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              {selectedEmployees.length === employees.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
            {employees.map((employee) => (
              <label key={employee.employeeCode} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedEmployees.includes(employee.employeeName)}
                  onChange={(e) => handleEmployeeSelection(employee.employeeName, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-gray-700">
                  {employee.employeeName} ({employee.position})
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {selectedEmployees.length > 0 && isLoadingReports && (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">기존 보고서 데이터를 불러오는 중...</span>
        </div>
      )}

      {selectedEmployees.length > 0 && !isLoadingReports && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {hasExistingData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>기존 데이터 수정 중:</strong> {reportDate} 날짜의 선택된 사원 보고서를 불러왔습니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              {selectedDepartment} 부서 (선택된 {selectedEmployees.length}명 중 근무 {getActiveEmployees()}명, 연차 {getOnLeaveEmployees()}명, 총 {getTotalWorkItems()}개 업무)
            </h3>
            
            <div className="space-y-4">
              {reports.map((report, employeeIndex) => {
                const employee = employees.find(emp => emp.employeeName === report.employeeName);
                if (!employee) return null;
                
                return (
                  <div key={employee.employeeCode} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-semibold text-gray-800">
                          {employee.employeeName} ({employee.position})
                        </h4>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={report.isOnLeave}
                            onChange={() => handleLeaveToggle(employeeIndex)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span className="text-sm text-gray-600">연차</span>
                        </label>
                      </div>
                      {!report.isOnLeave && (
                        <button
                          type="button"
                          onClick={() => addWorkItem(employeeIndex)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          + 업무 추가
                        </button>
                      )}
                    </div>
                    
                    {report.isOnLeave ? (
                      <div className="text-center py-4 text-gray-500">
                        연차로 인해 업무 보고서를 작성하지 않습니다.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {report.workItems.map((workItem, workItemIndex) => (
                          <div key={workItemIndex} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-sm font-medium text-gray-700">
                                업무 #{workItemIndex + 1}
                              </h5>
                              {report.workItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeWorkItem(employeeIndex, workItemIndex)}
                                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                  삭제
                                </button>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              {/* 업무 & 진행 목표 */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    업무
                                  </label>
                                  <textarea
                                    value={workItem.workOverview}
                                    onChange={(e) => handleWorkItemChange(employeeIndex, workItemIndex, 'workOverview', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                                    placeholder="수행한 업무를 입력하세요"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    진행 목표
                                  </label>
                                  <textarea
                                    value={workItem.progressGoal}
                                    onChange={(e) => handleWorkItemChange(employeeIndex, workItemIndex, 'progressGoal', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                                    placeholder="진행 목표를 입력하세요"
                                  />
                                </div>
                              </div>
                              
                              {/* 달성률 */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    달성률 (%)
                                  </label>
                                  <input
                                    type="number"
                                    value={workItem.achievementRate}
                                    onChange={(e) => handleWorkItemChange(employeeIndex, workItemIndex, 'achievementRate', e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    min="0"
                                    placeholder="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                                  />
                                </div>
                              </div>
                              
                              {/* 비고 & 팀장 평가 */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    비고
                                  </label>
                                  <textarea
                                    value={workItem.remarks}
                                    onChange={(e) => handleWorkItemChange(employeeIndex, workItemIndex, 'remarks', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                                    placeholder="추가 사항이나 특이사항을 입력하세요"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    팀장 평가
                                  </label>
                                  <textarea
                                    value={workItem.managerEvaluation}
                                    onChange={(e) => handleWorkItemChange(employeeIndex, workItemIndex, 'managerEvaluation', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                                    placeholder="팀장 평가를 입력하세요"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                if (isOperator) setSelectedDepartment('');
                setEmployees([]);
                setSelectedEmployees([]);
                setReports([]);
                setHasExistingData(false);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              초기화
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 
                (hasExistingData ? '수정 중...' : '등록 중...') : 
                `${getTotalWorkItems()}개 업무 ${hasExistingData ? '수정' : '등록'}`
              }
            </button>
          </div>
        </form>
      )}

      {submitMessage && (
        <div className={`mt-3 p-3 rounded-md ${
          submitMessage.includes('오류') || submitMessage.includes('입력해주세요') 
            ? 'bg-red-100 text-red-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {submitMessage}
        </div>
      )}
    </div>
  );
}