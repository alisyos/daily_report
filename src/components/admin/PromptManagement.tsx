'use client';

import { useState, useEffect } from 'react';

interface Prompt {
  id?: string;
  promptKey: string;
  promptName: string;
  description?: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

export default function PromptManagement() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/admin/prompts');
      if (response.ok) {
        const data = await response.json();
        setPrompts(data);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt({ ...prompt });
  };

  const handleCancel = () => {
    setEditingPrompt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrompt) return;

    setMessage('');

    try {
      const response = await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingPrompt.id, prompt: editingPrompt }),
      });

      if (response.ok) {
        setMessage('프롬프트가 수정되었습니다.');
        fetchPrompts();
        setEditingPrompt(null);
      } else {
        const error = await response.json();
        setMessage(`오류: ${error.error}`);
      }
    } catch (error) {
      setMessage('서버 오류가 발생했습니다.');
      console.error('Error:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">로딩 중...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">프롬프트 관리</h2>
        <p className="text-sm text-gray-600 mt-2">
          AI 요약 생성에 사용되는 프롬프트를 확인하고 수정할 수 있습니다.
        </p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.includes('오류') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {prompts.map((prompt) => (
          <div key={prompt.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{prompt.promptName}</h3>
                  <p className="text-sm text-gray-600 mt-1">키: {prompt.promptKey}</p>
                  {prompt.description && (
                    <p className="text-sm text-gray-600 mt-1">{prompt.description}</p>
                  )}
                </div>
                {editingPrompt?.id !== prompt.id && (
                  <button
                    onClick={() => handleEdit(prompt)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    수정
                  </button>
                )}
              </div>
            </div>

            {editingPrompt?.id === prompt.id ? (
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      시스템 프롬프트
                    </label>
                    <textarea
                      value={editingPrompt.systemPrompt}
                      onChange={(e) => setEditingPrompt({ ...editingPrompt, systemPrompt: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      사용자 프롬프트 템플릿
                    </label>
                    <textarea
                      value={editingPrompt.userPromptTemplate}
                      onChange={(e) => setEditingPrompt({ ...editingPrompt, userPromptTemplate: e.target.value })}
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      required
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      템플릿 변수: {'{'}{'{'} REPORT_DATA {'}'}{'}'}, {'{'}{'{'} PERIOD {'}'}{'}'}, {'{'}{'{'} DEPARTMENT {'}'}{'}'}, {'{'}{'{'} EMPLOYEE {'}'}{'}'}, {'{'}{'{'} LEAVE_DATA {'}'}{'}'}<br/>
                    </p>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">시스템 프롬프트:</h4>
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {prompt.systemPrompt}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">사용자 프롬프트 템플릿:</h4>
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {prompt.userPromptTemplate}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {prompts.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">프롬프트가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
