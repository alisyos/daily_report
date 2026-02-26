'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Employee {
  id?: string;
  employeeCode: string;
  employeeName: string;
  position: string;
  department: string;
  companyId?: string;
  companyName?: string;
  email?: string;
  role?: 'operator' | 'company_manager' | 'manager' | 'user';
}

interface Company {
  id: string;
  companyName: string;
}

interface Department {
  id: string;
  departmentName: string;
  companyId: string;
}

const PAGE_SIZE = 20;

export default function EmployeeManagement() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Employee & { password?: string }>({
    employeeCode: '',
    employeeName: '',
    position: '',
    department: '',
    companyId: '',
    email: '',
    role: 'user',
    password: '',
  });
  const [message, setMessage] = useState('');
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Filter & search state
  const [filterCompany, setFilterCompany] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  // Derive unique departments from employees (for filters)
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    employees.forEach((e) => {
      if (e.department) deptSet.add(e.department);
    });
    return Array.from(deptSet).sort();
  }, [employees]);

  // Filter departments based on selected company in form (for add/edit form)
  const filteredFormDepartments = useMemo(() => {
    if (!formData.companyId) return [];
    return allDepartments.filter((d) => d.companyId === formData.companyId);
  }, [allDepartments, formData.companyId]);

  // Filtered + searched employees
  const filteredEmployees = useMemo(() => {
    let result = employees;

    if (filterCompany) {
      result = result.filter((e) => e.companyId === filterCompany);
    }
    if (filterDepartment) {
      result = result.filter((e) => e.department === filterDepartment);
    }
    if (filterRole) {
      result = result.filter((e) => (e.role || 'user') === filterRole);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.employeeName.toLowerCase().includes(q) ||
          (e.email && e.email.toLowerCase().includes(q))
      );
    }

    return result;
  }, [employees, filterCompany, filterDepartment, filterRole, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCompany, filterDepartment, filterRole, searchQuery]);

  const fetchData = async () => {
    try {
      const promises: Promise<Response>[] = [
        fetch('/api/admin/employees'),
        fetch('/api/admin/departments'),
      ];
      if (user?.role === 'operator' || user?.role === 'company_manager') {
        promises.push(fetch('/api/admin/companies'));
      }

      const responses = await Promise.all(promises);

      if (responses[0].ok) {
        const data = await responses[0].json();
        const sortedData = data.sort((a: Employee, b: Employee) =>
          a.employeeCode.localeCompare(b.employeeCode, undefined, { numeric: true, sensitivity: 'base' })
        );
        setEmployees(sortedData);
      }

      if (responses[1].ok) {
        const departmentsData = await responses[1].json();
        setAllDepartments(departmentsData);
      }

      if (responses[2] && responses[2].ok) {
        const companiesData = await responses[2].json();
        setCompanies(companiesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingEmployee(null);
    setFormData({
      employeeCode: '',
      employeeName: '',
      position: '',
      department: user?.role === 'manager' ? user.department : '',
      companyId: (user?.role === 'manager' || user?.role === 'company_manager') ? user.companyId : '',
      email: '',
      role: 'user',
      password: '',
    });
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsAdding(false);
    setFormData({ ...employee, password: '' });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingEmployee(null);
    setFormData({
      employeeCode: '',
      employeeName: '',
      position: '',
      department: '',
      companyId: '',
      email: '',
      role: 'user',
      password: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const submitData = { ...formData };
    if (!submitData.password) {
      delete submitData.password;
    }

    try {
      if (isAdding) {
        const response = await fetch('/api/admin/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });

        if (response.ok) {
          setMessage('사원이 추가되었습니다.');
          fetchData();
          handleCancel();
        } else {
          const error = await response.json();
          setMessage(`오류: ${error.error}`);
        }
      } else if (editingEmployee) {
        const response = await fetch('/api/admin/employees', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingEmployee.id, employee: submitData }),
        });

        if (response.ok) {
          setMessage('사원 정보가 수정되었습니다.');
          fetchData();
          handleCancel();
        } else {
          const error = await response.json();
          setMessage(`오류: ${error.error}`);
        }
      }
    } catch (error) {
      setMessage('서버 오류가 발생했습니다.');
      console.error('Error:', error);
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`${employee.employeeName} 사원을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/employees', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: employee.id }),
      });

      if (response.ok) {
        setMessage('사원이 삭제되었습니다.');
        fetchData();
      } else {
        const error = await response.json();
        setMessage(`오류: ${error.error}`);
      }
    } catch (error) {
      setMessage('서버 오류가 발생했습니다.');
      console.error('Error:', error);
    }
  };

  const handleResetPassword = async (employeeId: string) => {
    if (!newPassword || newPassword.length < 6) {
      setMessage('오류: 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    try {
      const response = await fetch('/api/admin/employees/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, newPassword }),
      });

      if (response.ok) {
        setMessage('비밀번호가 재설정되었습니다.');
        setResetPasswordId(null);
        setNewPassword('');
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
    setFilterDepartment('');
    setFilterRole('');
    setSearchQuery('');
  };

  const roleLabel = (role?: string) => {
    switch (role) {
      case 'operator': return '운영자';
      case 'company_manager': return '회사 관리자';
      case 'manager': return '부서 관리자';
      case 'user': return '사용자';
      default: return '사용자';
    }
  };

  const hasActiveFilters = filterCompany || filterDepartment || filterRole || searchQuery.trim();

  if (loading) {
    return <div className="flex justify-center p-8">로딩 중...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold dark:text-gray-100">사원 관리</h2>
        {!isAdding && !editingEmployee && (
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + 사원 추가
          </button>
        )}
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.includes('오류') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        }`}>
          {message}
        </div>
      )}

      {/* Filter & Search Bar */}
      {!isAdding && !editingEmployee && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {user?.role === 'operator' && (
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
            {/* Hide department filter for managers (they can only see their own department) */}
            {(user?.role === 'operator' || user?.role === 'company_manager') && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">부서</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체 부서</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">역할</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체 역할</option>
                <option value="operator">운영자</option>
                <option value="company_manager">회사 관리자</option>
                <option value="manager">부서 관리자</option>
                <option value="user">사용자</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">검색 (사원명/이메일)</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름 또는 이메일 검색"
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
            총 {filteredEmployees.length}명{filteredEmployees.length !== employees.length && ` (전체 ${employees.length}명 중)`}
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAdding || editingEmployee) && (
        <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">
            {isAdding ? '사원 추가' : '사원 정보 수정'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  역할
                </label>
                <select
                  value={formData.role || 'user'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Employee['role'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="user">사용자</option>
                  <option value="manager">부서 관리자</option>
                  {(user?.role === 'operator' || user?.role === 'company_manager') && (
                    <option value="company_manager">회사 관리자</option>
                  )}
                  {user?.role === 'operator' && (
                    <option value="operator">운영자</option>
                  )}
                </select>
              </div>
              {user?.role === 'operator' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    업체 {formData.role !== 'operator' && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.companyId || ''}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value, department: '' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required={formData.role !== 'operator'}
                  >
                    <option value="">업체 선택</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {user?.role === 'company_manager' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    업체 <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(자사 고정)</span>
                  </label>
                  <input
                    type="text"
                    value={user.companyName}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 cursor-not-allowed text-gray-900 dark:text-gray-100"
                    readOnly
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  부서 {(formData.role === 'manager' || formData.role === 'user') && <span className="text-red-500">*</span>}
                  {user?.role === 'manager' && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(본인 부서로 고정)</span>
                  )}
                </label>
                {user?.role === 'manager' ? (
                  <input
                    type="text"
                    value={formData.department}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 cursor-not-allowed text-gray-900 dark:text-gray-100"
                    required={formData.role === 'manager' || formData.role === 'user'}
                    readOnly
                  />
                ) : (
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required={formData.role === 'manager' || formData.role === 'user'}
                    disabled={!formData.companyId}
                  >
                    <option value="">
                      {formData.companyId ? '부서 선택' : '먼저 업체를 선택하세요'}
                    </option>
                    {filteredFormDepartments.map((dept) => (
                      <option key={dept.id} value={dept.departmentName}>
                        {dept.departmentName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  사원코드 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.employeeCode}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  사원명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  직책 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              {isAdding && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    초기 비밀번호
                  </label>
                  <input
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="최소 6자 이상"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {isAdding ? '추가' : '수정'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                사원코드
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                사원명
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                직책
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                부서
              </th>
              {user?.role === 'operator' && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  업체
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                이메일
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                역할
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedEmployees.length === 0 ? (
              <tr>
                <td colSpan={user?.role === 'operator' ? 8 : 7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {hasActiveFilters ? '조건에 맞는 사원이 없습니다.' : '등록된 사원이 없습니다.'}
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {employee.employeeCode}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {employee.employeeName}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {employee.position}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {employee.department}
                  </td>
                  {user?.role === 'operator' && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {employee.companyName || '-'}
                    </td>
                  )}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {employee.email || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      employee.role === 'operator' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                      employee.role === 'company_manager' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' :
                      employee.role === 'manager' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                    }`}>
                      {roleLabel(employee.role)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(employee)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => {
                        setResetPasswordId(employee.id!);
                        setNewPassword('');
                      }}
                      className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                    >
                      비밀번호
                    </button>
                    <button
                      onClick={() => handleDelete(employee)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      삭제
                    </button>
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
            {(currentPage - 1) * PAGE_SIZE + 1}~{Math.min(currentPage * PAGE_SIZE, filteredEmployees.length)} / {filteredEmployees.length}명
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

      {/* Password Reset Modal */}
      {resetPasswordId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">비밀번호 재설정</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                새 비밀번호
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="최소 6자 이상"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setResetPasswordId(null);
                  setNewPassword('');
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                취소
              </button>
              <button
                onClick={() => handleResetPassword(resetPasswordId)}
                disabled={!newPassword || newPassword.length < 6}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                재설정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
