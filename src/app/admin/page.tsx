'use client';

import { useState } from 'react';
import EmployeeManagement from '@/components/admin/EmployeeManagement';
import PromptManagement from '@/components/admin/PromptManagement';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'employees' | 'prompts'>('employees');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">관리자 페이지</h1>

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
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'employees' && <EmployeeManagement />}
        {activeTab === 'prompts' && <PromptManagement />}
      </div>
    </div>
  );
}
