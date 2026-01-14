'use client';

import React, { useState, useEffect } from 'react';

interface Project {
  id: string;
  projectName: string;
  department: string;
  manager: string;
  targetEndDate: string;
  revisedEndDate: string;
  status: string;
  progressRate: number;
  mainIssues: string;
  detailedProgress: string;
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProjectName, setFilterProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Project>>({
    projectName: '',
    department: '',
    manager: '',
    targetEndDate: '',
    revisedEndDate: '',
    status: '진행중',
    progressRate: 0,
    mainIssues: '',
    detailedProgress: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);

  const statusOptions = ['진행중', '완료', '대기', '보류', '취소'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsResponse, departmentsResponse] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/departments')
      ]);

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(projectsData);
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

  const filteredProjects = projects.filter(project => {
    const matchesDepartment = !filterDepartment || project.department === filterDepartment;
    const matchesStatus = !filterStatus || project.status === filterStatus;
    const matchesProjectName = !filterProjectName || 
      project.projectName.toLowerCase().includes(filterProjectName.toLowerCase());
    return matchesDepartment && matchesStatus && matchesProjectName;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  // 필터가 변경될 때 첫 페이지로 이동
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterDepartment, filterStatus, filterProjectName, itemsPerPage]);

  const handleAddProject = () => {
    setFormData({
      projectName: '',
      department: departments[0] || '',
      manager: '',
      targetEndDate: '',
      revisedEndDate: '',
      status: '진행중',
      progressRate: 0,
      mainIssues: '',
      detailedProgress: ''
    });
    setIsSavingProject(false); // 로딩 상태 초기화
    setIsAddModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setFormData(project);
    setIsUpdatingProject(false); // 로딩 상태 초기화
    setIsEditModalOpen(true);
  };

  const handleViewDetail = (project: Project) => {
    setSelectedProject(project);
    setIsDetailModalOpen(true);
  };

  const handleSaveProject = async () => {
    if (isSavingProject) return; // 이미 저장 중이면 중복 실행 방지
    
    setIsSavingProject(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchData();
        setIsAddModalOpen(false);
        setFormData({
          projectName: '',
          department: '',
          manager: '',
          targetEndDate: '',
          revisedEndDate: '',
          status: '진행중',
          progressRate: 0,
          mainIssues: '',
          detailedProgress: ''
        });
      } else {
        console.error('Failed to save project');
      }
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject || isUpdatingProject) return; // 이미 업데이트 중이면 중복 실행 방지

    setIsUpdatingProject(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProject.id,
          project: formData,
        }),
      });

      if (response.ok) {
        await fetchData();
        setIsEditModalOpen(false);
        setSelectedProject(null);
      } else {
        console.error('Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
    } finally {
      setIsUpdatingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    setIsDeletingProject(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProject.id,
        }),
      });

      if (response.ok) {
        await fetchData();
        setIsEditModalOpen(false);
        setSelectedProject(null);
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleInputChange = (field: keyof Project, value: string | number) => {
    setFormData({
      ...formData,
      [field]: field === 'progressRate' ? Number(value) : value
    });
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
          <div className="flex-1">
            <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-1">
              상태 필터
            </label>
            <select
              id="filterStatus"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            >
              <option value="">모든 상태</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="filterProjectName" className="block text-sm font-medium text-gray-700 mb-1">
              프로젝트명 검색
            </label>
            <input
              type="text"
              id="filterProjectName"
              value={filterProjectName}
              onChange={(e) => setFilterProjectName(e.target.value)}
              placeholder="프로젝트명 입력"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setFilterDepartment('');
                setFilterStatus('');
                setFilterProjectName('');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              필터 초기화
            </button>
            <button
              onClick={handleAddProject}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              프로젝트 등록
            </button>
          </div>
        </div>

        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">
                프로젝트명
              </th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">
                부서
              </th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">
                담당자
              </th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">
                목표 종료일
              </th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">
                수정 종료일
              </th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">
                상태
              </th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">
                진행률
              </th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">
                주요 이슈
              </th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">
                상세보기
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedProjects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-sm text-gray-900">
                  {project.projectName}
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 text-center">
                  {project.department}
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 text-center">
                  {project.manager}
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 text-center">
                  {project.targetEndDate}
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 text-center">
                  {project.revisedEndDate || '-'}
                </td>
                <td className="px-3 py-2 text-sm text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.status === '완료' ? 'bg-green-100 text-green-800' :
                    project.status === '진행중' ? 'bg-blue-100 text-blue-800' :
                    project.status === '대기' ? 'bg-yellow-100 text-yellow-800' :
                    project.status === '보류' ? 'bg-purple-100 text-purple-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {project.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm text-gray-900">
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-1">{project.progressRate}%</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(project.progressRate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-sm text-gray-900">
                  <div className="truncate max-w-xs" title={project.mainIssues}>
                    {project.mainIssues || '-'}
                  </div>
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 text-center">
                  <button
                    onClick={() => handleViewDetail(project)}
                    className="text-blue-600 hover:text-blue-900 font-medium"
                  >
                    상세보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProjects.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            조건에 맞는 프로젝트가 없습니다.
          </div>
        )}

        {/* 페이지네이션 */}
        <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentPage === 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              이전
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentPage === totalPages
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              다음
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-gray-700">
                  총 <span className="font-medium">{filteredProjects.length}</span>개 중{' '}
                  <span className="font-medium">{startIndex + 1}</span>부터{' '}
                  <span className="font-medium">{Math.min(endIndex, filteredProjects.length)}</span>까지 표시
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="itemsPerPage" className="text-sm text-gray-700">
                  페이지당:
                </label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                >
                  <option value={20}>20개</option>
                  <option value={50}>50개</option>
                  <option value={100}>100개</option>
                </select>
              </div>
            </div>
            <div>
              {totalPages > 1 && (
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                      currentPage === 1 ? 'cursor-not-allowed' : 'hover:text-gray-600'
                    }`}
                  >
                    <span className="sr-only">이전</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;
                    const isCurrentPage = page === currentPage;
                    const shouldShow = page === 1 || page === totalPages || 
                      (page >= currentPage - 2 && page <= currentPage + 2);
                    
                    if (!shouldShow) {
                      if (page === currentPage - 3 || page === currentPage + 3) {
                        return (
                          <span key={page} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                          isCurrentPage
                            ? 'z-10 bg-blue-600 text-white focus:bg-blue-500'
                            : 'text-gray-900 hover:text-gray-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                      currentPage === totalPages ? 'cursor-not-allowed' : 'hover:text-gray-600'
                    }`}
                  >
                    <span className="sr-only">다음</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 프로젝트 등록 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">프로젝트 등록</h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsSavingProject(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트명 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.projectName || ''}
                  onChange={(e) => handleInputChange('projectName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">부서 <span className="text-red-500">*</span></label>
                  <select
                    value={formData.department || ''}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  >
                    <option value="">부서 선택</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.manager || ''}
                    onChange={(e) => handleInputChange('manager', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">목표 종료일 <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={formData.targetEndDate || ''}
                    onChange={(e) => handleInputChange('targetEndDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">수정 종료일</label>
                  <input
                    type="date"
                    value={formData.revisedEndDate || ''}
                    onChange={(e) => handleInputChange('revisedEndDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <select
                    value={formData.status || '진행중'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">진행률 (%)</label>
                  <input
                    type="number"
                    value={(formData.progressRate || 0) === 0 ? '' : (formData.progressRate || 0)}
                    onChange={(e) => handleInputChange('progressRate', e.target.value === '' ? 0 : Number(e.target.value))}
                    min="0"
                    max="100"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주요 이슈</label>
                <textarea
                  value={formData.mainIssues || ''}
                  onChange={(e) => handleInputChange('mainIssues', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">세부 진행 상황</label>
                <textarea
                  value={formData.detailedProgress || ''}
                  onChange={(e) => handleInputChange('detailedProgress', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsSavingProject(false);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleSaveProject}
                className={`px-4 py-2 text-white rounded-md flex items-center ${
                  isSavingProject 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={!formData.projectName || !formData.department || !formData.manager || !formData.targetEndDate || isSavingProject}
              >
                {isSavingProject ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 프로젝트 상세보기 모달 */}
      {isDetailModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">프로젝트 상세보기</h3>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">프로젝트명</h4>
                <p className="text-base text-gray-900">{selectedProject.projectName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">부서</h4>
                  <p className="text-base text-gray-900">{selectedProject.department}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">담당자</h4>
                  <p className="text-base text-gray-900">{selectedProject.manager}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">목표 종료일</h4>
                  <p className="text-base text-gray-900">{selectedProject.targetEndDate}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">수정 종료일</h4>
                  <p className="text-base text-gray-900">{selectedProject.revisedEndDate || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">상태</h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedProject.status === '완료' ? 'bg-green-100 text-green-800' :
                    selectedProject.status === '진행중' ? 'bg-blue-100 text-blue-800' :
                    selectedProject.status === '대기' ? 'bg-yellow-100 text-yellow-800' :
                    selectedProject.status === '보류' ? 'bg-purple-100 text-purple-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedProject.status}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">진행률</h4>
                  <div className="flex items-center mt-1">
                    <span className="text-base font-medium mr-2">{selectedProject.progressRate}%</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full"
                        style={{ width: `${Math.min(selectedProject.progressRate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">주요 이슈</h4>
                <p className="text-base text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                  {selectedProject.mainIssues || '없음'}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">세부 진행 상황</h4>
                <p className="text-base text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                  {selectedProject.detailedProgress || '없음'}
                </p>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setShowDeleteConfirm(true);
                }}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                삭제
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleEditProject(selectedProject);
                  }}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  수정
                </button>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 프로젝트 수정 모달 */}
      {isEditModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">프로젝트 수정</h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setShowDeleteConfirm(false);
                  setIsUpdatingProject(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트명 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.projectName || ''}
                  onChange={(e) => handleInputChange('projectName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">부서 <span className="text-red-500">*</span></label>
                  <select
                    value={formData.department || ''}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  >
                    <option value="">부서 선택</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.manager || ''}
                    onChange={(e) => handleInputChange('manager', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">목표 종료일 <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={formData.targetEndDate || ''}
                    onChange={(e) => handleInputChange('targetEndDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">수정 종료일</label>
                  <input
                    type="date"
                    value={formData.revisedEndDate || ''}
                    onChange={(e) => handleInputChange('revisedEndDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <select
                    value={formData.status || '진행중'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">진행률 (%)</label>
                  <input
                    type="number"
                    value={(formData.progressRate || 0) === 0 ? '' : (formData.progressRate || 0)}
                    onChange={(e) => handleInputChange('progressRate', e.target.value === '' ? 0 : Number(e.target.value))}
                    min="0"
                    max="100"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주요 이슈</label>
                <textarea
                  value={formData.mainIssues || ''}
                  onChange={(e) => handleInputChange('mainIssues', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">세부 진행 상황</label>
                <textarea
                  value={formData.detailedProgress || ''}
                  onChange={(e) => handleInputChange('detailedProgress', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
                disabled={isDeletingProject}
              >
                삭제
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setShowDeleteConfirm(false);
                    setIsUpdatingProject(false);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  취소
                </button>
                <button
                  onClick={handleUpdateProject}
                  className={`px-4 py-2 text-white rounded-md flex items-center ${
                    isUpdatingProject 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  disabled={!formData.projectName || !formData.department || !formData.manager || !formData.targetEndDate || isUpdatingProject}
                >
                  {isUpdatingProject ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      저장 중...
                    </>
                  ) : (
                    '저장'
                  )}
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
                <h3 className="text-lg font-medium text-gray-900">프로젝트 삭제</h3>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                다음 프로젝트를 삭제하시겠습니까?
              </p>
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-900">
                  {selectedProject?.projectName}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  부서: {selectedProject?.department} | 담당자: {selectedProject?.manager}
                </p>
              </div>
              <p className="text-sm text-red-600 mt-2">
                ※ 삭제된 프로젝트는 복구할 수 없습니다.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                disabled={isDeletingProject}
              >
                취소
              </button>
              <button
                onClick={handleDeleteProject}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center"
                disabled={isDeletingProject}
              >
                {isDeletingProject ? (
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
    </div>
  );
}