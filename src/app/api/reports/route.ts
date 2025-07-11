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
      if (!report.date || !report.employeeName || !report.workOverview) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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