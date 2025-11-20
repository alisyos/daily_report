import { createClient } from '@supabase/supabase-js';

// Types for the database entities
export interface DailyReport {
  id?: string;
  date: string;
  employeeName: string;
  department?: string;
  workOverview: string;
  progressGoal: string;
  achievementRate: number;
  managerEvaluation: string;
  remarks: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  id?: string;
  employeeCode: string;
  employeeName: string;
  position: string;
  department: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StatsDashboard {
  id?: string;
  monthlyAverageRate: number;
  weeklyAverageRate: number;
  departmentStats: { [key: string]: number };
  calculatedAt?: string;
  createdAt?: string;
}

export interface DailySummary {
  id?: string;
  date: string;
  summary: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id?: string;
  projectName: string;
  department: string;
  manager: string;
  targetEndDate: string;
  revisedEndDate: string;
  status: string;
  progressRate: number;
  mainIssues: string;
  detailedProgress: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonalReport {
  id?: string;
  employeeName: string;
  period: string;
  totalReports: number;
  averageAchievementRate: number;
  mainAchievements: string;
  improvements: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Prompt {
  id?: string;
  promptKey: string;
  promptName: string;
  description?: string;
  systemPrompt: string;
  userPromptTemplate: string;
  createdAt?: string;
  updatedAt?: string;
}

// Database column name mapping (camelCase to snake_case)
const toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

const convertKeysToSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      acc[toSnakeCase(key)] = convertKeysToSnakeCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

const convertKeysToCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      acc[toCamelCase(key)] = convertKeysToCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

class SupabaseService {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Daily Reports Methods
  async getDailyReports(): Promise<DailyReport[]> {
    try {
      const { data, error } = await this.supabase
        .from('daily_reports')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      return convertKeysToCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching daily reports:', error);
      return [];
    }
  }

  async addDailyReport(report: DailyReport): Promise<boolean> {
    try {
      const dbReport = convertKeysToSnakeCase(report);
      const { error } = await this.supabase
        .from('daily_reports')
        .insert([dbReport]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding daily report:', error);
      return false;
    }
  }

  async addDailyReports(reports: DailyReport[]): Promise<boolean> {
    try {
      const dbReports = convertKeysToSnakeCase(reports);
      const { error } = await this.supabase
        .from('daily_reports')
        .insert(dbReports);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding daily reports:', error);
      return false;
    }
  }

  async updateDailyReport(id: string, report: DailyReport): Promise<boolean> {
    try {
      const dbReport = convertKeysToSnakeCase(report);
      const { error } = await this.supabase
        .from('daily_reports')
        .update(dbReport)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating daily report:', error);
      return false;
    }
  }

  async deleteReportsByDateAndEmployees(date: string, employeeNames: string[]): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('daily_reports')
        .delete()
        .eq('date', date)
        .in('employee_name', employeeNames);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting reports:', error);
      return false;
    }
  }

  async replaceReportsByDateAndEmployees(
    date: string,
    employeeNames: string[],
    newReports: DailyReport[]
  ): Promise<boolean> {
    try {
      // Delete existing reports
      await this.deleteReportsByDateAndEmployees(date, employeeNames);

      // Add new reports
      return await this.addDailyReports(newReports);
    } catch (error) {
      console.error('Error replacing reports:', error);
      return false;
    }
  }

  // Employee Methods
  async getEmployees(): Promise<Employee[]> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .order('employee_code', { ascending: true });

      if (error) throw error;

      return convertKeysToCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  }

  async addEmployee(employee: Employee): Promise<boolean> {
    try {
      const dbEmployee = convertKeysToSnakeCase(employee);
      const { error } = await this.supabase
        .from('employees')
        .insert([dbEmployee]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding employee:', error);
      return false;
    }
  }

  async updateEmployee(id: string, employee: Employee): Promise<boolean> {
    try {
      const dbEmployee = convertKeysToSnakeCase(employee);
      const { error } = await this.supabase
        .from('employees')
        .update(dbEmployee)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating employee:', error);
      return false;
    }
  }

  async getEmployeesByDepartment(department: string): Promise<Employee[]> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .eq('department', department)
        .order('employee_code', { ascending: true });

      if (error) throw error;

      return convertKeysToCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching employees by department:', error);
      return [];
    }
  }

  async getDepartments(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('department')
        .order('department', { ascending: true });

      if (error) throw error;

      const departments = [...new Set((data || []).map((item: any) => item.department))];
      return departments.filter(dept => dept !== '');
    } catch (error) {
      console.error('Error fetching departments:', error);
      return [];
    }
  }

  // Project Methods
  async getProjects(): Promise<Project[]> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return convertKeysToCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  async addProject(project: Omit<Project, 'id'>): Promise<boolean> {
    try {
      const dbProject = convertKeysToSnakeCase(project);
      const { error } = await this.supabase
        .from('projects')
        .insert([dbProject]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding project:', error);
      return false;
    }
  }

  async updateProject(projectId: string, project: Omit<Project, 'id'>): Promise<boolean> {
    try {
      const dbProject = convertKeysToSnakeCase(project);
      const { error } = await this.supabase
        .from('projects')
        .update(dbProject)
        .eq('id', projectId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      return false;
    }
  }

  async deleteProject(projectId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  // Daily Summary Methods
  async getDailySummary(date: string): Promise<DailySummary | null> {
    try {
      const { data, error } = await this.supabase
        .from('daily_summaries')
        .select('*')
        .eq('date', date)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return convertKeysToCamelCase(data);
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      return null;
    }
  }

  async addDailySummary(summary: DailySummary): Promise<boolean> {
    try {
      const dbSummary = convertKeysToSnakeCase(summary);
      const { error } = await this.supabase
        .from('daily_summaries')
        .insert([dbSummary]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding daily summary:', error);
      return false;
    }
  }

  async addDailySummaries(summaries: DailySummary[]): Promise<boolean> {
    try {
      const dbSummaries = convertKeysToSnakeCase(summaries);
      const { error } = await this.supabase
        .from('daily_summaries')
        .insert(dbSummaries);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding daily summaries:', error);
      return false;
    }
  }

  async updateDailySummary(date: string, summary: DailySummary): Promise<boolean> {
    try {
      const dbSummary = convertKeysToSnakeCase(summary);

      // Try to update first
      const { data, error: updateError } = await this.supabase
        .from('daily_summaries')
        .update(dbSummary)
        .eq('date', date)
        .select();

      // If no rows were updated, insert a new one
      if (!updateError && (!data || data.length === 0)) {
        return await this.addDailySummary(summary);
      }

      if (updateError) throw updateError;
      return true;
    } catch (error) {
      console.error('Error updating daily summary:', error);
      return false;
    }
  }

  // Stats Dashboard Methods
  async getStatsDashboard(): Promise<StatsDashboard> {
    try {
      const { data, error } = await this.supabase
        .from('stats_dashboard')
        .select('*')
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No stats found, return default
          return {
            monthlyAverageRate: 0,
            weeklyAverageRate: 0,
            departmentStats: {},
          };
        }
        throw error;
      }

      return convertKeysToCamelCase(data);
    } catch (error) {
      console.error('Error fetching stats dashboard:', error);
      return {
        monthlyAverageRate: 0,
        weeklyAverageRate: 0,
        departmentStats: {},
      };
    }
  }

  async updateStatsDashboard(stats: Omit<StatsDashboard, 'id' | 'createdAt'>): Promise<boolean> {
    try {
      const dbStats = convertKeysToSnakeCase(stats);
      const { error } = await this.supabase
        .from('stats_dashboard')
        .insert([dbStats]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating stats dashboard:', error);
      return false;
    }
  }

  // Personal Report Methods
  async getPersonalReports(): Promise<PersonalReport[]> {
    try {
      const { data, error } = await this.supabase
        .from('personal_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return convertKeysToCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching personal reports:', error);
      return [];
    }
  }

  async addPersonalReport(report: PersonalReport): Promise<boolean> {
    try {
      const dbReport = convertKeysToSnakeCase(report);
      const { error } = await this.supabase
        .from('personal_reports')
        .insert([dbReport]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding personal report:', error);
      return false;
    }
  }

  // Prompt Methods
  async getPrompts(): Promise<Prompt[]> {
    try {
      const { data, error } = await this.supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return convertKeysToCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      return [];
    }
  }

  async getPromptByKey(promptKey: string): Promise<Prompt | null> {
    try {
      const { data, error } = await this.supabase
        .from('prompts')
        .select('*')
        .eq('prompt_key', promptKey)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return convertKeysToCamelCase(data);
    } catch (error) {
      console.error('Error fetching prompt:', error);
      return null;
    }
  }

  async updatePrompt(id: string, prompt: Partial<Prompt>): Promise<boolean> {
    try {
      const dbPrompt = convertKeysToSnakeCase({
        ...prompt,
        updatedAt: new Date().toISOString()
      });

      const { error } = await this.supabase
        .from('prompts')
        .update(dbPrompt)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating prompt:', error);
      return false;
    }
  }

  async addPrompt(prompt: Omit<Prompt, 'id'>): Promise<boolean> {
    try {
      const dbPrompt = convertKeysToSnakeCase(prompt);
      const { error } = await this.supabase
        .from('prompts')
        .insert([dbPrompt]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding prompt:', error);
      return false;
    }
  }

  async deleteEmployee(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting employee:', error);
      return false;
    }
  }
}

export default SupabaseService;
