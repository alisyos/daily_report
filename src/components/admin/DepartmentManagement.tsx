'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Department {
  id?: string;
  departmentName: string;
  companyId: string;
  companyName?: string;
  createdAt?: string;
}

interface Company {
  id: string;
  companyName: string;
}

const PAGE_SIZE = 20;

export default function DepartmentManagement() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ departmentName: '', companyId: '' });
  const [message, setMessage] = useState('');

  // Filter state
  const [filterCompany, setFilterCompany] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered departments
  const filteredDepartments = useMemo(() => {
    let result = departments;

    if (filterCompany) {
      result = result.filter((d) => d.companyId === filterCompany);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (d) => d.departmentName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [departments, filterCompany, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / PAGE_SIZE));
  const paginatedDepartments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredDepartments.slice(start, start + PAGE_SIZE);
  }, [filteredDepartments, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCompany, searchQuery]);

  const fetchData = async () => {
    try {
      const promises: Promise<Response>[] = [fetch('/api/admin/departments')];
      if (user?.role === 'operator') {
        promises.push(fetch('/api/admin/companies'));
      }

      const responses = await Promise.all(promises);

      if (responses[0].ok) {
        const data = await responses[0].json();
        setDepartments(data);
      }

      if (responses[1] && responses[1].ok) {
        const companiesData = await responses[1].json();
        setCompanies(companiesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.departmentName.trim() || !formData.companyId) {
      setMessage('오류: 업체와 부서명을 모두 입력해주세요.');
      return;
    }
    setMessage('');

    try {
      const response = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage('부서가 추가되었습니다.');
        setIsAdding(false);
        setFormData({ departmentName: '', companyId: '' });
        fetchData();
      } else {
        const error = await response.json();
        setMessage(`오류: ${error.error}`);
      }
    } catch {
      setMessage('서버 오류가 발생했습니다.');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.departmentName.trim()) {
      setMessage('오류: 부서명을 입력해주세요.');
      return;
    }
    setMessage('');

    try {
      const response = await fetch('/api/admin/departments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, department: formData }),
      });

      if (response.ok) {
        setMessage('부서 정보가 수정되었습니다.');
        setEditingId(null);
        setFormData({ departmentName: '', companyId: '' });
        fetchData();
      } else {
        const error = await response.json();
        setMessage(`오류: ${error.error}`);
      }
    } catch {
      setMessage('서버 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 부서를 삭제하시겠습니까?\n이 부서에 소속된 사원이 있으면 문제가 발생할 수 있습니다.`)) return;
    setMessage('');

    try {
      const response = await fetch('/api/admin/departments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setMessage('부서가 삭제되었습니다.');
        fetchData();
      } else {
        const error = await response.json();
        setMessage(`오류: ${error.error}`);
      }
    } catch {
      setMessage('서버 오류가 발생했습니다.');
    }
  };

  const handleClearFilters = () => {
    setFilterCompany('');
    setSearchQuery('');
  };

  const hasActiveFilters = filterCompany || searchQuery.trim();

  if (loading) {
    return <div className="flex justify-center p-8">로딩 중...</div>;
  }

  const isOperator = user?.role === 'operator';
  const isCompanyManager = user?.role === 'company_manager';

  // Only operator and company_manager can access this page
  if (!isOperator && !isCompanyManager) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        부서 관리는 운영자 또는 회사 관리자만 사용할 수 있습니다.
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold dark:text-gray-100">부서 관리</h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ departmentName: '', companyId: isCompanyManager ? (user?.companyId || '') : '' });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          부서 추가
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.includes('오류') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        }`}>
          {message}
        </div>
      )}

      {/* Filter Bar */}
      {!isAdding && !editingId && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isOperator && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">업체</label>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체 업체</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">검색 (부서명)</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="부서명 검색"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {hasActiveFilters && (
              <div className="flex items-end">
                <button
                  onClick={handleClearFilters}
                  className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  필터 초기화
                </button>
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            총 {filteredDepartments.length}개 부서{filteredDepartments.length !== departments.length && ` (전체 ${departments.length}개 중)`}
          </div>
        </div>
      )}

      {/* Add Form */}
      {isAdding && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium mb-3 dark:text-gray-100">새 부서 추가</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isOperator ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                업체 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">업체 선택</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>
            ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                업체 <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(자사 고정)</span>
              </label>
              <input
                type="text"
                value={user?.companyName || ''}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 cursor-not-allowed text-gray-900 dark:text-gray-100"
                readOnly
              />
            </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                부서명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.departmentName}
                onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                placeholder="부서명"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleAdd}
                disabled={!formData.departmentName.trim() || !formData.companyId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setFormData({ departmentName: '', companyId: '' });
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">부서명</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">업체</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300 w-48">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedDepartments.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {hasActiveFilters ? '조건에 맞는 부서가 없습니다.' : '등록된 부서가 없습니다.'}
                </td>
              </tr>
            ) : (
              paginatedDepartments.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    {editingId === dept.id ? (
                      <input
                        type="text"
                        value={formData.departmentName}
                        onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    ) : (
                      <span className="text-gray-900 dark:text-gray-100">{dept.departmentName}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                    {dept.companyName || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {editingId === dept.id ? (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleUpdate(dept.id!)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setFormData({ departmentName: '', companyId: '' });
                          }}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-500"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingId(dept.id!);
                            setIsAdding(false);
                            setFormData({ departmentName: dept.departmentName, companyId: dept.companyId });
                          }}
                          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id!, dept.departmentName)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {(currentPage - 1) * PAGE_SIZE + 1}~{Math.min(currentPage * PAGE_SIZE, filteredDepartments.length)} / {filteredDepartments.length}개
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              &laquo;
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              &lsaquo;
            </button>
            {(() => {
              const pages: number[] = [];
              let start = Math.max(1, currentPage - 2);
              const end = Math.min(totalPages, start + 4);
              if (end - start < 4) start = Math.max(1, end - 4);
              for (let i = start; i <= end; i++) pages.push(i);
              return pages.map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`px-3 py-1 text-sm rounded border ${
                    p === currentPage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {p}
                </button>
              ));
            })()}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              &rsaquo;
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              &raquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
