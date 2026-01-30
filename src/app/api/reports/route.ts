import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';
import { getRequestUser, getCompanyScope, getDepartmentScope, requireRole } from '@/lib/auth-helpers';

const dbService = new SupabaseService();

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = getCompanyScope(user);
    const department = getDepartmentScope(user);
    const reports = await dbService.getDailyReports(companyId, department);
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();

    // Check if it's a bulk request (array of reports) or single report
    const isBulk = Array.isArray(data.reports || data);
    const isUpdate = data.isUpdate || false;
    const reports = data.reports || (isBulk ? data : [data]);

    // Inject companyId into each report
    for (const report of reports) {
      if (!report.companyId) {
        report.companyId = user.companyId;
      }
    }

    // Validate each report
    for (const report of reports) {
      // Validate required fields
      if (!report.date || !report.employeeName) {
        return NextResponse.json({ error: 'Missing required fields: date and employeeName' }, { status: 400 });
      }

      // Check if at least one content field is provided (unless it's annual leave)
      const hasContent = report.workOverview?.trim() ||
                        report.progressGoal?.trim() ||
                        report.remarks?.trim() ||
                        report.managerEvaluation?.trim();

      if (report.workOverview !== '연차' && !hasContent) {
        return NextResponse.json({ error: 'At least one field must be filled' }, { status: 400 });
      }

      // Validate achievement rate
      if (report.achievementRate < 0) {
        return NextResponse.json({ error: 'Achievement rate must be 0 or greater' }, { status: 400 });
      }

      if (report.managerEvaluation !== undefined && typeof report.managerEvaluation !== 'string') {
        return NextResponse.json({ error: 'Manager evaluation must be a string' }, { status: 400 });
      }
    }

    let success = false;

    if (isUpdate && reports.length > 0) {
      const date = reports[0].date;
      const employeeNames = reports.map((report: any) => report.employeeName);
      success = await dbService.replaceReportsByDateAndEmployees(date, employeeNames, reports);
    } else {
      success = reports.length > 1
        ? await dbService.addDailyReports(reports)
        : await dbService.addDailyReport(reports[0]);
    }

    if (success) {
      return NextResponse.json({
        message: reports.length > 1
          ? `${reports.length} reports ${isUpdate ? 'updated' : 'added'} successfully`
          : `Report ${isUpdate ? 'updated' : 'added'} successfully`
      });
    } else {
      return NextResponse.json({ error: `Failed to ${isUpdate ? 'update' : 'add'} report(s)` }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing report(s):', error);
    return NextResponse.json({ error: 'Failed to process report(s)' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, report } = await request.json();

    if (!id || !report) {
      return NextResponse.json({ error: 'Missing id or report data' }, { status: 400 });
    }

    const success = await dbService.updateDailyReport(id, report);

    if (success) {
      return NextResponse.json({ message: 'Report updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only operator and manager can delete reports
    if (!requireRole(user, 'operator', 'manager')) {
      return NextResponse.json({ error: '보고서 삭제 권한이 없습니다.' }, { status: 403 });
    }

    const { date, employeeName, workOverview } = await request.json();

    if (!date || !employeeName) {
      return NextResponse.json({ error: 'Missing required fields: date and employeeName' }, { status: 400 });
    }

    // Get reports scoped to user's access level
    const companyId = getCompanyScope(user);
    const allReports = await dbService.getDailyReports(companyId);
    const reportToDelete = allReports.find((report: any) =>
      report.date === date &&
      report.employeeName === employeeName &&
      report.workOverview === workOverview
    );

    if (!reportToDelete) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const employeeReportsOnDate = allReports.filter((report: any) =>
      report.date === date && report.employeeName === employeeName
    );

    if (employeeReportsOnDate.length === 1) {
      const success = await dbService.deleteReportsByDateAndEmployees(date, [employeeName]);

      if (success) {
        return NextResponse.json({ message: 'Report deleted successfully' });
      } else {
        return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
      }
    } else {
      const reportsToKeep = employeeReportsOnDate.filter((report: any) =>
        report.workOverview !== workOverview
      );

      const deleteSuccess = await dbService.deleteReportsByDateAndEmployees(date, [employeeName]);

      if (!deleteSuccess) {
        return NextResponse.json({ error: 'Failed to delete reports' }, { status: 500 });
      }

      if (reportsToKeep.length > 0) {
        const addSuccess = await dbService.addDailyReports(reportsToKeep);

        if (!addSuccess) {
          return NextResponse.json({ error: 'Failed to restore remaining reports' }, { status: 500 });
        }
      }

      return NextResponse.json({ message: 'Report deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
  }
}
