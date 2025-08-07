'use client';

import React from 'react';

interface Task {
  title: string;
  description: string;
  assignees?: string[];
  frequency?: number;
  dateRange?: string;
  achievementRate: number;
}

interface ProjectSummary {
  projectName: string;
  order: number;
  tasks: Task[];
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

interface SummaryModalAIProps {
  show: boolean;
  onClose: () => void;
  summaryData: AIResponseStructure | null;
  isLoading?: boolean;
}

export default function SummaryModalAI({
  show,
  onClose,
  summaryData,
  isLoading = false
}: SummaryModalAIProps) {
  if (!show) return null;

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      '완료': 'bg-green-100 text-green-800',
      '진행중': 'bg-blue-100 text-blue-800',
      '지연': 'bg-red-100 text-red-800',
      '우수': 'bg-green-100 text-green-800',
      '양호': 'bg-blue-100 text-blue-800',
      '개선필요': 'bg-orange-100 text-orange-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const downloadJSON = () => {
    if (!summaryData) return;
    const blob = new Blob([JSON.stringify(summaryData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `업무보고_요약_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-3">
                {summaryData?.title || '업무 보고 요약'}
              </h2>
              {summaryData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center">
                    <span className="mr-2">📅</span>
                    <span>{summaryData.period}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">👥</span>
                    <span>{summaryData.target}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">📊</span>
                    <span>평균 달성률 {summaryData.overallAchievementRate}%</span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 본문 내용 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : summaryData ? (
            <div className="space-y-6">
              {/* 프로젝트별 요약 */}
              {summaryData.projects.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">프로젝트별 업무 현황</h3>
                  <div className="space-y-4">
                    {summaryData.projects.map((project) => (
                      <div key={project.order} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                          <div className="flex justify-between items-center">
                            <h4 className="text-base font-semibold text-gray-800">
                              ✅ {project.order}. {project.projectName}
                            </h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(project.results.status)}`}>
                              {project.results.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          {/* 주요 작업 내용 */}
                          <div className="mb-4">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">주요 작업 내용</h5>
                            <div className="space-y-2">
                              {project.tasks.map((task, idx) => (
                                <div key={idx} className="pl-4 border-l-2 border-blue-200">
                                  <div className="text-sm font-medium text-gray-800">{task.title}</div>
                                  <div className="text-sm text-gray-600">{task.description}</div>
                                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                                    {task.assignees && task.assignees.length > 0 && (
                                      <span>담당: {task.assignees.join(', ')}</span>
                                    )}
                                    {task.frequency && task.frequency > 1 && (
                                      <span>• 수행: {task.frequency}회</span>
                                    )}
                                    {task.dateRange && (
                                      <span>• {task.dateRange}</span>
                                    )}
                                    <span className="font-medium text-blue-600">달성률: {task.achievementRate}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* 결과 및 성과 */}
                          <div className="bg-blue-50 rounded-lg p-3">
                            <h5 className="text-sm font-semibold text-blue-900 mb-2">결과 및 성과</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">기간:</span>
                                <span className="ml-1 font-medium">{project.results.period}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">참여:</span>
                                <span className="ml-1 font-medium">{project.results.participants.length}명</span>
                              </div>
                              <div>
                                <span className="text-gray-600">달성률:</span>
                                <span className="ml-1 font-medium">{project.results.avgAchievementRate}%</span>
                              </div>
                              <div>
                                <span className="text-gray-600">작업 수:</span>
                                <span className="ml-1 font-medium">{project.results.totalTasks}건</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 인원별 업무 요약 */}
              {summaryData.employees.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📌 인원별 업무 요약</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {summaryData.employees.map((employee, idx) => (
                      <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-800">{employee.name}</h4>
                            <p className="text-sm text-gray-600">{employee.department}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(employee.performance)}`}>
                            {employee.performance}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">보고서:</span>
                            <span className="font-medium">{employee.totalReports}건</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">평균 달성률:</span>
                            <span className="font-medium">{employee.avgAchievementRate}%</span>
                          </div>
                          {employee.mainProjects.length > 0 && (
                            <div>
                              <span className="text-gray-600">주요 프로젝트:</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {employee.mainProjects.map((project, i) => (
                                  <span key={i} className="inline-block px-2 py-1 bg-gray-100 rounded text-xs">
                                    {project}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 종합 정리 테이블 */}
              {summaryData.summaryTable.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 종합 정리</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse bg-white rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium">구분</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">주요 업무</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">달성률</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryData.summaryTable.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 text-sm">{item.projectName}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center">{item.taskCount}개 작업</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center">{item.achievementRate}%</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center">{item.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 특이사항 */}
              {summaryData.specialNotes && summaryData.specialNotes.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">🗓️ 기타 사항</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <ul className="space-y-1">
                      {summaryData.specialNotes.map((note, idx) => (
                        <li key={idx} className="text-sm text-gray-700">
                          • {note.type}: {note.content}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* 종합 평가 */}
              {summaryData.recommendation && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">✨ 종합 평가</h3>
                  <p className="text-sm text-gray-700">{summaryData.recommendation}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500">요약 데이터가 없습니다.</div>
          )}
        </div>

        {/* 푸터 */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {isLoading ? 'AI 요약 생성 중...' : 'AI 요약 생성 완료'}
          </div>
          <div className="flex gap-2">
            {summaryData && (
              <button
                onClick={downloadJSON}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                📥 JSON 다운로드
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}