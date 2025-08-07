'use client';

import React from 'react';

interface SummaryModalProps {
  show: boolean;
  onClose: () => void;
  filterType: string;
  filterMonth: string;
  filterStartDate: string;
  filterEndDate: string;
  filterDepartment: string;
  filterEmployee: string;
  filteredReportsCount: number;
  summary: string;
}

export default function SummaryModal({
  show,
  onClose,
  filterType,
  filterMonth,
  filterStartDate,
  filterEndDate,
  filterDepartment,
  filterEmployee,
  filteredReportsCount,
  summary
}: SummaryModalProps) {
  if (!show) return null;

  // 마크다운 텍스트를 파싱하여 구조화
  const parseSummary = (text: string) => {
    const sections = text.split(/##\s+/);
    return sections.map((section, index) => {
      if (index === 0) return null; // 첫 번째는 제목이므로 스킵
      
      const lines = section.split('\n');
      const title = lines[0];
      const content = lines.slice(1).join('\n');
      
      return { title, content };
    }).filter(Boolean);
  };

  const renderContent = (content: string) => {
    // 테이블 파싱
    if (content.includes('|------|')) {
      const lines = content.split('\n');
      const tableStart = lines.findIndex(line => line.includes('|------|'));
      const beforeTable = lines.slice(0, tableStart - 1).join('\n');
      const tableLines = lines.slice(tableStart - 1).filter(line => line.includes('|'));
      const afterTable = lines.slice(tableStart + tableLines.length).join('\n');
      
      const headers = tableLines[0].split('|').filter(Boolean).map(h => h.trim());
      const rows = tableLines.slice(2).map(line => 
        line.split('|').filter(Boolean).map(cell => cell.trim())
      );
      
      return (
        <>
          {beforeTable && renderNonTableContent(beforeTable)}
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {headers.map((header, i) => (
                    <th key={i} className="border border-gray-300 px-4 py-2 text-left text-sm font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {row.map((cell, j) => (
                      <td key={j} className="border border-gray-300 px-4 py-2 text-sm">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {afterTable && renderNonTableContent(afterTable)}
        </>
      );
    }
    
    return renderNonTableContent(content);
  };

  const renderNonTableContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // H3 헤더 처리
      if (line.startsWith('### ')) {
        return (
          <h4 key={index} className="text-base font-semibold text-gray-800 mt-4 mb-2">
            {line.replace('### ', '')}
          </h4>
        );
      }
      
      // 굵은 텍스트가 포함된 라인
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={index} className="text-sm text-gray-700 mb-1">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        );
      }
      
      // 리스트 아이템
      if (line.startsWith('- ')) {
        const indent = line.match(/^\s*/)?.[0].length || 0;
        const marginLeft = indent > 2 ? 'ml-6' : '';
        return (
          <li key={index} className={`text-sm text-gray-700 mb-1 list-disc ${marginLeft} ml-4`}>
            {line.replace(/^[\s-]+/, '')}
          </li>
        );
      }
      
      // 구분선
      if (line.startsWith('---')) {
        return <hr key={index} className="my-4 border-gray-300" />;
      }
      
      // 일반 텍스트
      if (line.trim()) {
        return (
          <p key={index} className="text-sm text-gray-700 mb-2">
            {line}
          </p>
        );
      }
      
      return null;
    });
  };

  const sections = parseSummary(summary);
  
  // 헤더에서 제목과 기본 정보 추출
  const titleMatch = summary.match(/^#\s+(.+)/);
  const mainTitle = titleMatch ? titleMatch[1] : '업무 보고 요약';
  
  // 기본 정보 추출
  const periodMatch = summary.match(/📅 기간:\s+(.+)/);
  const targetMatch = summary.match(/👥 대상:\s+(.+)/);
  const achievementMatch = summary.match(/📊 전체 달성률:\s+(.+)/);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-3">{mainTitle}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {periodMatch && (
                  <div className="flex items-center">
                    <span className="mr-2">📅</span>
                    <span>{periodMatch[1]}</span>
                  </div>
                )}
                {targetMatch && (
                  <div className="flex items-center">
                    <span className="mr-2">👥</span>
                    <span>{targetMatch[1]}</span>
                  </div>
                )}
                {achievementMatch && (
                  <div className="flex items-center">
                    <span className="mr-2">📊</span>
                    <span>달성률 {achievementMatch[1]}</span>
                  </div>
                )}
              </div>
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

        {/* 필터 정보 */}
        <div className="bg-blue-50 px-6 py-3 border-b border-blue-100">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="bg-white px-3 py-1 rounded-full text-blue-700">
              📅 {filterType === 'month' ? `${filterMonth}` : `${filterStartDate} ~ ${filterEndDate}`}
            </span>
            {filterDepartment && (
              <span className="bg-white px-3 py-1 rounded-full text-blue-700">
                🏢 {filterDepartment}
              </span>
            )}
            {filterEmployee && (
              <span className="bg-white px-3 py-1 rounded-full text-blue-700">
                👤 {filterEmployee}
              </span>
            )}
            <span className="bg-white px-3 py-1 rounded-full text-blue-700">
              📊 {filteredReportsCount}건
            </span>
          </div>
        </div>

        {/* 본문 내용 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {sections.map((section, index) => {
              if (!section) return null;
              
              // 아이콘 매핑
              const getIcon = (title: string) => {
                if (title.includes('✅')) return '';
                if (title.includes('인원별')) return '👥';
                if (title.includes('종합 정리')) return '📊';
                if (title.includes('기타')) return '🗓️';
                return '📌';
              };
              
              const icon = getIcon(section.title);
              const cleanTitle = section.title.replace(/[✅📌📊👥🗓️💡]/g, '').trim();
              
              return (
                <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      {icon && <span className="mr-2 text-xl">{icon}</span>}
                      {cleanTitle}
                    </h3>
                  </div>
                  <div className="p-4">
                    {renderContent(section.content)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 하단 안내 메시지 */}
          {summary.includes('💡') && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-start">
                <span className="mr-2">💡</span>
                <span>필요하시면 위 내용을 주간보고, 월간보고 또는 회의자료용으로 재구성해드릴 수 있습니다.</span>
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl flex justify-between items-center">
          <div className="text-sm text-gray-600">
            AI 요약 생성 완료
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const blob = new Blob([summary], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `업무보고_요약_${new Date().toISOString().split('T')[0]}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              📥 다운로드
            </button>
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