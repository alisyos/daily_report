import { google } from 'googleapis';

// Types for the daily report data
export interface DailyReport {
  date: string;
  employeeName: string;
  department: string;
  workOverview: string;
  progressGoal: string;
  achievementRate: number;
  managerEvaluation: string;
  remarks: string;
}

export interface Employee {
  employeeCode: string;
  employeeName: string;
  position: string;
  department: string;
}

export interface StatsDashboard {
  monthlyAverageRate: number;
  weeklyAverageRate: number;
  departmentStats: { [key: string]: number };
}

export interface DailySummary {
  date: string;
  summary: string;
}

class GoogleSheetsService {
  private sheets: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private spreadsheetId: string;

  constructor() {
    // Initialize Google Sheets API
    let auth;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
      // For local development with key file
      auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else {
      // For production with environment variables
      auth = new google.auth.GoogleAuth({
        credentials: {
          type: 'service_account',
          project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
          private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
          private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
          client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }
    
    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
  }

  async getDailyReports(): Promise<DailyReport[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: '일일업무관리!A2:G',
      });

      const rows = response.data.values || [];
      const employees = await this.getEmployees();
      
      return rows.map((row: string[]) => {
        const employee = employees.find(emp => emp.employeeName === row[1]);
        return {
          date: row[0] || '',
          employeeName: row[1] || '',
          department: employee?.department || '',
          workOverview: row[2] || '',
          progressGoal: row[3] || '',
          achievementRate: parseInt(row[4]) || 0,
          managerEvaluation: row[5] || '',
          remarks: row[6] || '',
        };
      });
    } catch (error) {
      console.error('Error fetching daily reports:', error);
      return [];
    }
  }

  async addDailyReport(report: DailyReport): Promise<boolean> {
    try {
      const values = [
        [
          report.date,
          report.employeeName,
          report.workOverview,
          report.progressGoal,
          report.achievementRate,
          report.managerEvaluation,
          report.remarks,
        ],
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: '일일업무관리!A:G',
        valueInputOption: 'RAW',
        resource: { values },
      });

      return true;
    } catch (error) {
      console.error('Error adding daily report:', error);
      return false;
    }
  }

  async updateDailyReport(rowIndex: number, report: DailyReport): Promise<boolean> {
    try {
      const values = [
        [
          report.date,
          report.employeeName,
          report.workOverview,
          report.progressGoal,
          report.achievementRate,
          report.managerEvaluation,
          report.remarks,
        ],
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `일일업무관리!A${rowIndex + 2}:G${rowIndex + 2}`,
        valueInputOption: 'RAW',
        resource: { values },
      });

      return true;
    } catch (error) {
      console.error('Error updating daily report:', error);
      return false;
    }
  }

  async getEmployees(): Promise<Employee[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: '사원마스터!A2:D',
      });

      const rows = response.data.values || [];
      return rows.map((row: string[]) => ({
        employeeCode: row[0] || '',
        employeeName: row[1] || '',
        position: row[2] || '',
        department: row[3] || '',
      }));
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  }

  async getStatsDashboard(): Promise<StatsDashboard> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: '통계대시보드!A2:C',
      });

      const rows = response.data.values || [];
      const stats: StatsDashboard = {
        monthlyAverageRate: 0,
        weeklyAverageRate: 0,
        departmentStats: {},
      };

      if (rows.length > 0) {
        stats.monthlyAverageRate = parseFloat(rows[0][0]) || 0;
        stats.weeklyAverageRate = parseFloat(rows[0][1]) || 0;
        
        // Parse department stats (assuming format: "부서:비율,부서:비율,...")
        const deptStatsStr = rows[0][2] || '';
        if (deptStatsStr) {
          deptStatsStr.split(',').forEach((pair: string) => {
            const [dept, rate] = pair.split(':');
            if (dept && rate) {
              stats.departmentStats[dept.trim()] = parseFloat(rate.trim()) || 0;
            }
          });
        }
      }

      return stats;
    } catch (error) {
      console.error('Error fetching stats dashboard:', error);
      return {
        monthlyAverageRate: 0,
        weeklyAverageRate: 0,
        departmentStats: {},
      };
    }
  }

  async getDepartments(): Promise<string[]> {
    try {
      const employees = await this.getEmployees();
      const departments = [...new Set(employees.map(emp => emp.department))];
      return departments.filter(dept => dept !== '');
    } catch (error) {
      console.error('Error fetching departments:', error);
      return [];
    }
  }

  async getEmployeesByDepartment(department: string): Promise<Employee[]> {
    try {
      const employees = await this.getEmployees();
      return employees.filter(emp => emp.department === department);
    } catch (error) {
      console.error('Error fetching employees by department:', error);
      return [];
    }
  }

  async addDailyReports(reports: DailyReport[]): Promise<boolean> {
    try {
      const values = reports.map(report => [
        report.date,
        report.employeeName,
        report.workOverview,
        report.progressGoal,
        report.achievementRate,
        report.managerEvaluation,
        report.remarks,
      ]);

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: '일일업무관리!A:G',
        valueInputOption: 'RAW',
        resource: { values },
      });

      return true;
    } catch (error) {
      console.error('Error adding daily reports:', error);
      return false;
    }
  }

  async deleteReportsByDateAndEmployees(date: string, employeeNames: string[]): Promise<boolean> {
    try {
      // 먼저 전체 데이터를 가져옴
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: '일일업무관리!A2:G',
      });

      const rows = response.data.values || [];
      
      // 삭제할 행들의 인덱스를 찾음 (역순으로 정렬하여 삭제 시 인덱스 변경 방지)
      const rowsToDelete: number[] = [];
      rows.forEach((row: any[], index: number) => {
        if (row[0] === date && employeeNames.includes(row[1])) {
          rowsToDelete.push(index + 2); // +2 because rows start from A2
        }
      });

      // 역순으로 정렬하여 뒤에서부터 삭제
      rowsToDelete.sort((a, b) => b - a);

      // 각 행을 삭제
      for (const rowIndex of rowsToDelete) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId: 0, // 첫 번째 시트 (일일업무관리)
                    dimension: 'ROWS',
                    startIndex: rowIndex - 1,
                    endIndex: rowIndex,
                  },
                },
              },
            ],
          },
        });
      }

      return true;
    } catch (error) {
      console.error('Error deleting reports:', error);
      return false;
    }
  }

  async replaceReportsByDateAndEmployees(date: string, employeeNames: string[], newReports: DailyReport[]): Promise<boolean> {
    try {
      // 먼저 기존 데이터를 삭제
      await this.deleteReportsByDateAndEmployees(date, employeeNames);
      
      // 새로운 데이터를 추가
      return await this.addDailyReports(newReports);
    } catch (error) {
      console.error('Error replacing reports:', error);
      return false;
    }
  }

  async getDailySummary(date: string): Promise<DailySummary | null> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: '일일보고요약!A2:B',
      });

      const rows = response.data.values || [];
      const summaryRow = rows.find((row: any[]) => row[0] === date);
      
      if (summaryRow) {
        return {
          date: summaryRow[0] || '',
          summary: summaryRow[1] || '',
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      return null;
    }
  }

  async addDailySummary(summary: DailySummary): Promise<boolean> {
    try {
      const values = [
        [
          summary.date,
          summary.summary,
        ],
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: '일일보고요약!A:B',
        valueInputOption: 'RAW',
        resource: { values },
      });

      return true;
    } catch (error) {
      console.error('Error adding daily summary:', error);
      return false;
    }
  }

  async updateDailySummary(date: string, summary: DailySummary): Promise<boolean> {
    try {
      // 먼저 기존 요약을 찾아서 행 번호를 구함
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: '일일보고요약!A2:B',
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row: any[]) => row[0] === date);
      
      if (rowIndex === -1) {
        // 기존 요약이 없으면 새로 추가
        return await this.addDailySummary(summary);
      }

      const values = [
        [
          summary.date,
          summary.summary,
        ],
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `일일보고요약!A${rowIndex + 2}:B${rowIndex + 2}`,
        valueInputOption: 'RAW',
        resource: { values },
      });

      return true;
    } catch (error) {
      console.error('Error updating daily summary:', error);
      return false;
    }
  }
}

export default GoogleSheetsService;