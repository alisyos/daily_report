import { NextRequest } from 'next/server';
import { AuthUser, getAuthUser } from './auth';

/**
 * Reads and verifies the JWT directly from the request cookie.
 * No longer depends on middleware header injection.
 */
export async function getRequestUser(request: NextRequest): Promise<AuthUser | null> {
  return getAuthUser(request);
}

export function requireRole(user: AuthUser | null, ...roles: AuthUser['role'][]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function canAccessCompany(user: AuthUser, companyId: string): boolean {
  if (user.role === 'operator') return true;
  return user.companyId === companyId;
}

export function canAccessDepartment(user: AuthUser, companyId: string, department: string): boolean {
  if (user.role === 'operator') return true;
  if (user.companyId !== companyId) return false;
  if (user.role === 'company_manager' || user.role === 'manager') return true;
  // user role: only their own department
  return user.department === department;
}

/**
 * Returns the companyId filter based on user role.
 * - operator: returns undefined (no filter, sees all)
 * - manager/user: returns their own companyId
 */
export function getCompanyScope(user: AuthUser): string | undefined {
  if (user.role === 'operator') return undefined;
  return user.companyId;
}

/**
 * Returns the department filter based on user role.
 * - operator/manager: returns undefined (no department filter within company scope)
 * - user: returns their own department
 */
export function getDepartmentScope(user: AuthUser): string | undefined {
  if (user.role === 'operator' || user.role === 'company_manager' || user.role === 'manager') return undefined;
  return user.department;
}
