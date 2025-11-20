import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';

const dbService = new SupabaseService();

export async function GET() {
  try {
    const projects = await dbService.getProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const projectData = await request.json();

    const success = await dbService.addProject(projectData);

    if (success) {
      return NextResponse.json({ message: 'Project added successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to add project' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error adding project:', error);
    return NextResponse.json(
      { error: 'Failed to add project' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { projectId, project } = await request.json();

    const success = await dbService.updateProject(projectId, project);

    if (success) {
      return NextResponse.json({ message: 'Project updated successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    const success = await dbService.deleteProject(projectId);

    if (success) {
      return NextResponse.json({ message: 'Project deleted successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}