import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';
import { getRequestUser, requireRole, getCompanyScope } from '@/lib/auth-helpers';
import { hashPassword } from '@/lib/auth';

const dbService = new SupabaseService();

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(user, 'operator', 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const companyId = getCompanyScope(user);
    // Manager can only see employees in their own department
    const department = user.role === 'manager' ? user.department : undefined;
    const employees = await dbService.getEmployees(companyId, department);
    // Strip password hashes from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const safeEmployees = employees.map(({ passwordHash, ...rest }) => rest);
    return NextResponse.json(safeEmployees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(user, 'operator', 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const employeeData = await request.json();

    if (!employeeData.employeeCode || !employeeData.employeeName || !employeeData.department) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Manager can only add to their own company and department
    if (user.role === 'manager') {
      employeeData.companyId = user.companyId;
      employeeData.department = user.department; // Force to manager's department
    }

    // Hash password if provided
    if (employeeData.password) {
      employeeData.passwordHash = await hashPassword(employeeData.password);
      delete employeeData.password;
    }

    const success = await dbService.addEmployee(employeeData);

    if (success) {
      return NextResponse.json({ message: 'Employee added successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to add employee' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error adding employee:', error);
    return NextResponse.json({ error: 'Failed to add employee' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(user, 'operator', 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, employee } = await request.json();

    if (!id || !employee) {
      return NextResponse.json({ error: 'Missing id or employee data' }, { status: 400 });
    }

    // Manager can only edit within their own company and department
    if (user.role === 'manager') {
      // Verify the target employee belongs to manager's department
      const employees = await dbService.getEmployees(user.companyId, user.department);
      const targetEmployee = employees.find(e => e.id === id);
      if (!targetEmployee) {
        return NextResponse.json({ error: '다른 부서의 사원을 수정할 수 없습니다.' }, { status: 403 });
      }
      employee.companyId = user.companyId;
      employee.department = user.department; // Force to manager's department
    }

    // Hash password if provided
    if (employee.password) {
      employee.passwordHash = await hashPassword(employee.password);
      delete employee.password;
    }

    const success = await dbService.updateEmployee(id, employee);

    if (success) {
      return NextResponse.json({ message: 'Employee updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(user, 'operator', 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });
    }

    // Manager can only delete employees in their own department
    if (user.role === 'manager') {
      const employees = await dbService.getEmployees(user.companyId, user.department);
      const targetEmployee = employees.find(e => e.id === id);
      if (!targetEmployee) {
        return NextResponse.json({ error: '다른 부서의 사원을 삭제할 수 없습니다.' }, { status: 403 });
      }
    }

    const success = await dbService.deleteEmployee(id);

    if (success) {
      return NextResponse.json({ message: 'Employee deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
