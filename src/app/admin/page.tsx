'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import EmployeeManagement from '@/components/admin/EmployeeManagement';
import PromptManagement from '@/components/admin/PromptManagement';
import CompanyManagement from '@/components/admin/CompanyManagement';
import DepartmentManagement from '@/components/admin/DepartmentManagement';

type TabType = 'employees' | 'prompts' | 'companies' | 'departments';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('employees');

  if (!user || (user.role !== 'operator' && user.role !== 'company_manager' && user.role !== 'manager')) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center py-12 text-gray-500">
          관리자 페이지에 접근할 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('employees')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'employees'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            사원 관리
          </button>
          {user.role === 'operator' && (
            <button
              onClick={() => setActiveTab('prompts')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'prompts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              프롬프트 관리
            </button>
          )}
          {user.role === 'operator' && (
            <button
              onClick={() => setActiveTab('companies')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'companies'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              업체 관리
            </button>
          )}
          {(user.role === 'operator' || user.role === 'company_manager') && (
            <button
              onClick={() => setActiveTab('departments')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'departments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              부서 관리
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'employees' && <EmployeeManagement />}
        {activeTab === 'prompts' && user.role === 'operator' && <PromptManagement />}
        {activeTab === 'companies' && user.role === 'operator' && <CompanyManagement />}
        {activeTab === 'departments' && (user.role === 'operator' || user.role === 'company_manager') && <DepartmentManagement />}
      </div>
    </div>
  );
}
