import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';

const dbService = new SupabaseService();

export async function GET() {
  try {
    const employees = await dbService.getEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await request.json();

    if (!employee.employeeCode || !employee.employeeName || !employee.department) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const success = await dbService.addEmployee(employee);

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
    const { id, employee } = await request.json();

    if (!id || !employee) {
      return NextResponse.json({ error: 'Missing id or employee data' }, { status: 400 });
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
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });
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
