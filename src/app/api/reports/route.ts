import { NextRequest, NextResponse } from 'next/server';
import GoogleSheetsService from '@/lib/google-sheets';

const sheetsService = new GoogleSheetsService();

export async function GET() {
  try {
    const reports = await sheetsService.getDailyReports();
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Check if it's a bulk request (array of reports) or single report
    const isBulk = Array.isArray(data.reports || data);
    const isUpdate = data.isUpdate || false;
    const reports = data.reports || (isBulk ? data : [data]);
    
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
      
      // Manager evaluation is now free text, so no specific validation needed
      // Just ensure it's a string (can be empty)
      if (report.managerEvaluation !== undefined && typeof report.managerEvaluation !== 'string') {
        return NextResponse.json({ error: 'Manager evaluation must be a string' }, { status: 400 });
      }
    }
    
    let success = false;
    
    if (isUpdate && reports.length > 0) {
      // 기존 데이터 수정: 특정 날짜와 직원들의 기존 데이터를 삭제하고 새로운 데이터 추가
      const date = reports[0].date;
      const employeeNames = reports.map((report: any) => report.employeeName);
      success = await sheetsService.replaceReportsByDateAndEmployees(date, employeeNames, reports);
    } else {
      // 새로운 데이터 추가: 기존 로직 사용
      success = reports.length > 1
        ? await sheetsService.addDailyReports(reports)
        : await sheetsService.addDailyReport(reports[0]);
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
    const { rowIndex, report } = await request.json();
    
    if (rowIndex === undefined || !report) {
      return NextResponse.json({ error: 'Missing rowIndex or report data' }, { status: 400 });
    }
    
    const success = await sheetsService.updateDailyReport(rowIndex, report);
    
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
    const { date, employeeName, workOverview } = await request.json();
    
    if (!date || !employeeName) {
      return NextResponse.json({ error: 'Missing required fields: date and employeeName' }, { status: 400 });
    }
    
    // Get all reports to find the exact match
    const allReports = await sheetsService.getDailyReports();
    const reportToDelete = allReports.find((report: any) => 
      report.date === date && 
      report.employeeName === employeeName && 
      report.workOverview === workOverview
    );
    
    if (!reportToDelete) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    
    // Check if this employee has multiple reports on this date
    const employeeReportsOnDate = allReports.filter((report: any) => 
      report.date === date && report.employeeName === employeeName
    );
    
    if (employeeReportsOnDate.length === 1) {
      // If this is the only report for this employee on this date, delete it
      const success = await sheetsService.deleteReportsByDateAndEmployees(date, [employeeName]);
      
      if (success) {
        return NextResponse.json({ message: 'Report deleted successfully' });
      } else {
        return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
      }
    } else {
      // If there are multiple reports for this employee on this date,
      // we'll recreate all reports except the one to delete
      const reportsToKeep = employeeReportsOnDate.filter((report: any) =>
        report.workOverview !== workOverview
      );
      
      // First delete all reports for this employee on this date
      const deleteSuccess = await sheetsService.deleteReportsByDateAndEmployees(date, [employeeName]);
      
      if (!deleteSuccess) {
        return NextResponse.json({ error: 'Failed to delete reports' }, { status: 500 });
      }
      
      // Then add back the reports we want to keep
      if (reportsToKeep.length > 0) {
        const addSuccess = await sheetsService.addDailyReports(reportsToKeep);
        
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