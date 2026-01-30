import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';
import { getRequestUser, requireRole } from '@/lib/auth-helpers';

const dbService = new SupabaseService();

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(user, 'operator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const companies = await dbService.getCompanies();
    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(user, 'operator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const companyData = await request.json();

    if (!companyData.companyName) {
      return NextResponse.json({ error: '업체명을 입력해주세요.' }, { status: 400 });
    }

    const company = await dbService.addCompany(companyData);

    if (company) {
      return NextResponse.json({ message: 'Company added successfully', company });
    } else {
      return NextResponse.json({ error: 'Failed to add company' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error adding company:', error);
    return NextResponse.json({ error: 'Failed to add company' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(user, 'operator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, company } = await request.json();

    if (!id || !company) {
      return NextResponse.json({ error: 'Missing id or company data' }, { status: 400 });
    }

    const success = await dbService.updateCompany(id, company);

    if (success) {
      return NextResponse.json({ message: 'Company updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(user, 'operator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing company id' }, { status: 400 });
    }

    const success = await dbService.deleteCompany(id);

    if (success) {
      return NextResponse.json({ message: 'Company deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
