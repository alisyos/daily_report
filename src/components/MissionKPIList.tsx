'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface MissionKpi {
  id: string;
  missionId: string;
  kpiName: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  achievementRate: number;
}

interface Mission {
  id: string;
  missionName: string;
  description: string;
  assignee: string;
  department: string;
  companyId?: string;
  startDate: string;
  endDate: string;
  status: '대기' | '진행중' | '완료';
  progressRate: number;
  kpis: MissionKpi[];
}

interface Employee {
  employeeName: string;
  department: string;
}

export default function MissionKPIList() {
  const { user } = useAuth();
  const isOperator = user?.role === 'operator';
  const isUser = user?.role === 'user';

  const [missions, setMissions] = useState<Mission[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Expanded missions (to show KPIs)
  const [expandedMissions, setExpandedMissions] = useState<Set<string>>(new Set());

  // Mission modal
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [missionForm, setMissionForm] = useState({
    missionName: '',
    description: '',
    assignee: '',
    department: '',
    startDate: '',
    endDate: '',
    status: '대기' as '대기' | '진행중' | '완료',
    progressRate: 0,
  });
  const [isSavingMission, setIsSavingMission] = useState(false);

  // KPI modal
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<MissionKpi | null>(null);
  const [kpiMissionId, setKpiMissionId] = useState<string>('');
  const [kpiForm, setKpiForm] = useState({
    kpiName: '',
    targetValue: 0,
    currentValue: 0,
    unit: '%',
  });
  const [isSavingKpi, setIsSavingKpi] = useState(false);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'mission' | 'kpi'; id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const statusOptions = ['대기', '진행중', '완료'];
  const unitOptions = ['%', '건', '원', '개', '명', '시간', '점'];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user && !isOperator && user.department) {
      setFilterDepartment(user.department);
    }
  }, [user, isOperator]);

  // Reset assignee filter when department changes
  useEffect(() => {
    setFilterAssignee('');
  }, [filterDepartment]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDepartment, filterAssignee, filterStatus, itemsPerPage]);

  const fetchData = async () => {
    try {
      const [missionsRes, departmentsRes, employeesRes] = await Promise.all([
        fetch('/api/missions'),
        fetch('/api/departments'),
        fetch('/api/employees'),
      ]);

      if (missionsRes.ok) {
        const data = await missionsRes.json();
        setMissions(data);
      }
      if (departmentsRes.ok) {
        const data = await departmentsRes.json();
        setDepartments(data);
      }
      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = filterDepartment
    ? employees.filter(e => e.department === filterDepartment)
    : employees;

  const filteredMissions = missions.filter(m => {
    const matchesDept = !filterDepartment || m.department === filterDepartment;
    const matchesAssignee = !filterAssignee || m.assignee === filterAssignee;
    const matchesStatus = !filterStatus || m.status === filterStatus;
    return matchesDept && matchesAssignee && matchesStatus;
  });

  const totalPages = Math.ceil(filteredMissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMissions = filteredMissions.slice(startIndex, endIndex);

  const toggleExpand = (missionId: string) => {
    setExpandedMissions(prev => {
      const next = new Set(prev);
      if (next.has(missionId)) {
        next.delete(missionId);
      } else {
        next.add(missionId);
      }
      return next;
    });
  };

  // Mission CRUD
  const openAddMission = () => {
    setEditingMission(null);
    const defaultAssignee = isUser ? (user?.employeeName || '') : '';
    const defaultDept = !isOperator && user?.department ? user.department : '';
    setMissionForm({
      missionName: '',
      description: '',
      assignee: defaultAssignee,
      department: defaultDept,
      startDate: '',
      endDate: '',
      status: '대기',
      progressRate: 0,
    });
    setIsSavingMission(false);
    setIsMissionModalOpen(true);
  };

  const openEditMission = (mission: Mission) => {
    setEditingMission(mission);
    setMissionForm({
      missionName: mission.missionName,
      description: mission.description || '',
      assignee: mission.assignee,
      department: mission.department || '',
      startDate: mission.startDate,
      endDate: mission.endDate,
      status: mission.status,
      progressRate: mission.progressRate,
    });
    setIsSavingMission(false);
    setIsMissionModalOpen(true);
  };

  const handleSaveMission = async () => {
    if (isSavingMission) return;
    setIsSavingMission(true);
    try {
      if (editingMission) {
        const res = await fetch('/api/missions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingMission.id, mission: missionForm }),
        });
        if (res.ok) {
          await fetchData();
          setIsMissionModalOpen(false);
        }
      } else {
        const res = await fetch('/api/missions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(missionForm),
        });
        if (res.ok) {
          await fetchData();
          setIsMissionModalOpen(false);
        }
      }
    } catch (error) {
      console.error('Error saving mission:', error);
    } finally {
      setIsSavingMission(false);
    }
  };

  const confirmDeleteMission = (mission: Mission) => {
    setDeleteTarget({ type: 'mission', id: mission.id, name: mission.missionName });
    setShowDeleteConfirm(true);
  };

  // KPI CRUD
  const openAddKpi = (missionId: string) => {
    setEditingKpi(null);
    setKpiMissionId(missionId);
    setKpiForm({ kpiName: '', targetValue: 0, currentValue: 0, unit: '%' });
    setIsSavingKpi(false);
    setIsKpiModalOpen(true);
  };

  const openEditKpi = (kpi: MissionKpi) => {
    setEditingKpi(kpi);
    setKpiMissionId(kpi.missionId);
    setKpiForm({
      kpiName: kpi.kpiName,
      targetValue: kpi.targetValue,
      currentValue: kpi.currentValue,
      unit: kpi.unit,
    });
    setIsSavingKpi(false);
    setIsKpiModalOpen(true);
  };

  const handleSaveKpi = async () => {
    if (isSavingKpi) return;
    setIsSavingKpi(true);
    try {
      if (editingKpi) {
        const res = await fetch('/api/missions/kpis', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingKpi.id, kpi: kpiForm }),
        });
        if (res.ok) {
          await fetchData();
          setIsKpiModalOpen(false);
        }
      } else {
        const res = await fetch('/api/missions/kpis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...kpiForm, missionId: kpiMissionId }),
        });
        if (res.ok) {
          await fetchData();
          setIsKpiModalOpen(false);
        }
      }
    } catch (error) {
      console.error('Error saving KPI:', error);
    } finally {
      setIsSavingKpi(false);
    }
  };

  const confirmDeleteKpi = (kpi: MissionKpi) => {
    setDeleteTarget({ type: 'kpi', id: kpi.id, name: kpi.kpiName });
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      const url = deleteTarget.type === 'mission' ? '/api/missions' : '/api/missions/kpis';
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        await fetchData();
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
      }
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Auto-set department when assignee changes in mission form
  const handleAssigneeChange = (assigneeName: string) => {
    setMissionForm(prev => {
      const emp = employees.find(e => e.employeeName === assigneeName);
      return {
        ...prev,
        assignee: assigneeName,
        department: emp?.department || prev.department,
      };
    });
  };

  const getAchievementColor = (rate: number) => {
    if (rate >= 100) return 'text-green-700 bg-green-100';
    if (rate >= 70) return 'text-blue-700 bg-blue-100';
    if (rate >= 40) return 'text-yellow-700 bg-yellow-100';
    return 'text-red-700 bg-red-100';
  };

  const getAchievementBarColor = (rate: number) => {
    if (rate >= 100) return 'bg-green-500';
    if (rate >= 70) return 'bg-blue-500';
    if (rate >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Employees available for the modal assignee select (filtered by modal's department context)
  const modalEmployees = isOperator
    ? (missionForm.department ? employees.filter(e => e.department === missionForm.department) : employees)
    : employees.filter(e => e.department === user?.department);

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
        {/* Filter bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          {isOperator && (
            <div className="flex-1">
              <label htmlFor="filterDept" className="block text-sm font-medium text-gray-700 mb-1">부서 필터</label>
              <select
                id="filterDept"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="">모든 부서</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          <div className="flex-1">
            <label htmlFor="filterAssignee" className="block text-sm font-medium text-gray-700 mb-1">담당자 필터</label>
            <select
              id="filterAssignee"
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="">모든 담당자</option>
              {filteredEmployees.map(e => (
                <option key={e.employeeName} value={e.employeeName}>{e.employeeName}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-1">상태 필터</label>
            <select
              id="filterStatus"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="">모든 상태</option>
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                if (isOperator) setFilterDepartment('');
                setFilterAssignee('');
                setFilterStatus('');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              필터 초기화
            </button>
            <button
              onClick={openAddMission}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              미션 등록
            </button>
          </div>
        </div>

        {/* Mission table */}
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider w-8"></th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">미션명</th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">담당자</th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">기간</th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">상태</th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">진행률</th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">KPI</th>
              <th className="px-3 py-3 text-center text-sm font-bold text-gray-800 uppercase tracking-wider">액션</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedMissions.map((mission) => (
              <React.Fragment key={mission.id}>
                <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(mission.id)}>
                  <td className="px-3 py-2 text-sm text-gray-500 text-center">
                    <svg
                      className={`w-4 h-4 transition-transform inline-block ${expandedMissions.has(mission.id) ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">{mission.missionName}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-center">{mission.assignee}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-center">
                    {mission.startDate} ~ {mission.endDate}
                  </td>
                  <td className="px-3 py-2 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      mission.status === '완료' ? 'bg-green-100 text-green-800' :
                      mission.status === '진행중' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {mission.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-1">{mission.progressRate}%</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(mission.progressRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-center">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      {mission.kpis.length}개
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEditMission(mission)}
                      className="text-blue-600 hover:text-blue-900 font-medium mr-2"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => confirmDeleteMission(mission)}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
                {/* KPI sub-table */}
                {expandedMissions.has(mission.id) && (
                  <tr>
                    <td colSpan={8} className="px-0 py-0">
                      <div className="bg-gray-50 border-l-4 border-blue-400 px-6 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-gray-700">KPI 목록</h4>
                          <button
                            onClick={() => openAddKpi(mission.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs flex items-center"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            KPI 추가
                          </button>
                        </div>
                        {mission.kpis.length === 0 ? (
                          <p className="text-sm text-gray-500 py-2">등록된 KPI가 없습니다.</p>
                        ) : (
                          <table className="w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-center text-xs font-bold text-gray-700">KPI명</th>
                                <th className="px-3 py-2 text-center text-xs font-bold text-gray-700">목표값</th>
                                <th className="px-3 py-2 text-center text-xs font-bold text-gray-700">현재값</th>
                                <th className="px-3 py-2 text-center text-xs font-bold text-gray-700">단위</th>
                                <th className="px-3 py-2 text-center text-xs font-bold text-gray-700">달성률</th>
                                <th className="px-3 py-2 text-center text-xs font-bold text-gray-700">액션</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {mission.kpis.map(kpi => (
                                <tr key={kpi.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-sm text-gray-900">{kpi.kpiName}</td>
                                  <td className="px-3 py-2 text-sm text-gray-900 text-center">
                                    {Number(kpi.targetValue).toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-900 text-center">
                                    {Number(kpi.currentValue).toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-900 text-center">{kpi.unit}</td>
                                  <td className="px-3 py-2 text-sm text-center">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full ${getAchievementBarColor(Number(kpi.achievementRate))}`}
                                          style={{ width: `${Math.min(Number(kpi.achievementRate), 100)}%` }}
                                        ></div>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getAchievementColor(Number(kpi.achievementRate))}`}>
                                        {Number(kpi.achievementRate).toFixed(1)}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-sm text-center">
                                    <button
                                      onClick={() => openEditKpi(kpi)}
                                      className="text-blue-600 hover:text-blue-900 font-medium mr-2 text-xs"
                                    >
                                      수정
                                    </button>
                                    <button
                                      onClick={() => confirmDeleteKpi(kpi)}
                                      className="text-red-600 hover:text-red-900 font-medium text-xs"
                                    >
                                      삭제
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {filteredMissions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            조건에 맞는 미션이 없습니다.
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              이전
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              다음
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-gray-700">
                  총 <span className="font-medium">{filteredMissions.length}</span>개 중{' '}
                  <span className="font-medium">{filteredMissions.length > 0 ? startIndex + 1 : 0}</span>부터{' '}
                  <span className="font-medium">{Math.min(endIndex, filteredMissions.length)}</span>까지 표시
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="missionItemsPerPage" className="text-sm text-gray-700">페이지당:</label>
                <select
                  id="missionItemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
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
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 ${
                      currentPage === 1 ? 'cursor-not-allowed' : 'hover:text-gray-600'
                    }`}
                  >
                    <span className="sr-only">이전</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
                  </button>
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;
                    const isCurrentPage = page === currentPage;
                    const shouldShow = page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2);
                    if (!shouldShow) {
                      if (page === currentPage - 3 || page === currentPage + 3) {
                        return <span key={page} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">...</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 ${
                          isCurrentPage ? 'z-10 bg-blue-600 text-white' : 'text-gray-900 hover:text-gray-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 ${
                      currentPage === totalPages ? 'cursor-not-allowed' : 'hover:text-gray-600'
                    }`}
                  >
                    <span className="sr-only">다음</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                  </button>
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mission Add/Edit Modal */}
      {isMissionModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingMission ? '미션 수정' : '미션 등록'}
              </h3>
              <button
                onClick={() => setIsMissionModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">미션명 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={missionForm.missionName}
                  onChange={(e) => setMissionForm({ ...missionForm, missionName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={missionForm.description}
                  onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자 <span className="text-red-500">*</span></label>
                  {isUser ? (
                    <input
                      type="text"
                      value={missionForm.assignee}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                    />
                  ) : (
                    <select
                      value={missionForm.assignee}
                      onChange={(e) => handleAssigneeChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    >
                      <option value="">담당자 선택</option>
                      {modalEmployees.map(e => (
                        <option key={e.employeeName} value={e.employeeName}>{e.employeeName}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                  <input
                    type="text"
                    value={missionForm.department}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작일 <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={missionForm.startDate}
                    onChange={(e) => setMissionForm({ ...missionForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료일 <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={missionForm.endDate}
                    onChange={(e) => setMissionForm({ ...missionForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <select
                    value={missionForm.status}
                    onChange={(e) => setMissionForm({ ...missionForm, status: e.target.value as '대기' | '진행중' | '완료' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">진행률 (%)</label>
                  <input
                    type="number"
                    value={missionForm.progressRate === 0 ? '' : missionForm.progressRate}
                    onChange={(e) => setMissionForm({ ...missionForm, progressRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                    min="0"
                    max="100"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setIsMissionModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleSaveMission}
                disabled={!missionForm.missionName || !missionForm.assignee || !missionForm.startDate || !missionForm.endDate || isSavingMission}
                className={`px-4 py-2 text-white rounded-md flex items-center ${
                  isSavingMission ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSavingMission ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    저장 중...
                  </>
                ) : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Add/Edit Modal */}
      {isKpiModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingKpi ? 'KPI 수정' : 'KPI 추가'}
              </h3>
              <button
                onClick={() => setIsKpiModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KPI명 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={kpiForm.kpiName}
                  onChange={(e) => setKpiForm({ ...kpiForm, kpiName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">목표값 <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={kpiForm.targetValue === 0 ? '' : kpiForm.targetValue}
                    onChange={(e) => setKpiForm({ ...kpiForm, targetValue: e.target.value === '' ? 0 : Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">현재값</label>
                  <input
                    type="number"
                    value={kpiForm.currentValue === 0 ? '' : kpiForm.currentValue}
                    onChange={(e) => setKpiForm({ ...kpiForm, currentValue: e.target.value === '' ? 0 : Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">단위 <span className="text-red-500">*</span></label>
                  <select
                    value={kpiForm.unit}
                    onChange={(e) => setKpiForm({ ...kpiForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setIsKpiModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleSaveKpi}
                disabled={!kpiForm.kpiName || !kpiForm.unit || isSavingKpi}
                className={`px-4 py-2 text-white rounded-md flex items-center ${
                  isSavingKpi ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSavingKpi ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    저장 중...
                  </>
                ) : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 ml-3">
                {deleteTarget.type === 'mission' ? '미션 삭제' : 'KPI 삭제'}
              </h3>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                다음 {deleteTarget.type === 'mission' ? '미션' : 'KPI'}을(를) 삭제하시겠습니까?
              </p>
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-900">{deleteTarget.name}</p>
              </div>
              {deleteTarget.type === 'mission' && (
                <p className="text-sm text-red-600 mt-2">
                  ※ 미션 삭제 시 연결된 모든 KPI도 함께 삭제됩니다.
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    삭제 중...
                  </>
                ) : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
