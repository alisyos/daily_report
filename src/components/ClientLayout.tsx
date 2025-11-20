'use client';

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Login from "@/components/Login";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const loginStatus = localStorage.getItem('isLoggedIn');
    setIsLoggedIn(loginStatus === 'true');
    setIsLoading(false);
  }, []);

  const handleLogin = (success: boolean) => {
    setIsLoggedIn(success);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="flex items-center justify-center h-8">
                <Image 
                  src="/gptlogo.svg" 
                  alt="GPT코리아 로고" 
                  width={67} 
                  height={34}
                  className="object-contain h-full w-auto"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 leading-none mt-1.5">
                ㅣ 업무 보고 시스템
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href="/"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                pathname === '/' || pathname === '/reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              일일 업무 보고
            </Link>
            <Link
              href="/create"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                pathname === '/create'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              업무 보고 작성
            </Link>
            <Link
              href="/personal"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                pathname === '/personal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              개인 업무 보고
            </Link>
            <Link
              href="/projects"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                pathname === '/projects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              프로젝트 관리
            </Link>
            <Link
              href="/admin"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                pathname === '/admin'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              관리자
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
} 