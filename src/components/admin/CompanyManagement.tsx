'use client';

import { useState, useEffect } from 'react';

interface Company {
  id?: string;
  companyName: string;
}

export default function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ companyName: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/admin/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.companyName.trim()) return;
    setMessage('');

    try {
      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage('업체가 추가되었습니다.');
        setIsAdding(false);
        setFormData({ companyName: '' });
        fetchCompanies();
      } else {
        const error = await response.json();
        setMessage(`오류: ${error.error}`);
      }
    } catch {
      setMessage('서버 오류가 발생했습니다.');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.companyName.trim()) return;
    setMessage('');

    try {
      const response = await fetch('/api/admin/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, company: formData }),
      });

      if (response.ok) {
        setMessage('업체 정보가 수정되었습니다.');
        setEditingId(null);
        setFormData({ companyName: '' });
        fetchCompanies();
      } else {
        const error = await response.json();
        setMessage(`오류: ${error.error}`);
      }
    } catch {
      setMessage('서버 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 업체를 삭제하시겠습니까?\n이 업체에 소속된 사원이 있으면 삭제할 수 없습니다.`)) return;
    setMessage('');

    try {
      const response = await fetch('/api/admin/companies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setMessage('업체가 삭제되었습니다.');
        fetchCompanies();
      } else {
        const error = await response.json();
        setMessage(`오류: ${error.error}`);
      }
    } catch {
      setMessage('서버 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">로딩 중...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">업체 관리</h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ companyName: '' });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          업체 추가
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.includes('오류') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {isAdding && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-medium mb-3">새 업체 추가</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ companyName: e.target.value })}
              placeholder="업체명"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            />
            <button
              onClick={handleAdd}
              disabled={!formData.companyName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              저장
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setFormData({ companyName: '' });
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">업체명</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-700 w-48">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {companies.map((company) => (
              <tr key={company.id}>
                <td className="px-6 py-4">
                  {editingId === company.id ? (
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ companyName: e.target.value })}
                      className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    />
                  ) : (
                    <span className="text-gray-900">{company.companyName}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {editingId === company.id ? (
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleUpdate(company.id!)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setFormData({ companyName: '' });
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditingId(company.id!);
                          setIsAdding(false);
                          setFormData({ companyName: company.companyName });
                        }}
                        className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(company.id!, company.companyName)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {companies.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            등록된 업체가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
