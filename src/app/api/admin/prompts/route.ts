import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';
import { getRequestUser, requireRole } from '@/lib/auth-helpers';

const dbService = new SupabaseService();

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(user, 'operator', 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const prompts = await dbService.getPrompts();
    return NextResponse.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(user, 'operator', 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, prompt } = await request.json();

    if (!id || !prompt) {
      return NextResponse.json({ error: 'Missing id or prompt data' }, { status: 400 });
    }

    const success = await dbService.updatePrompt(id, prompt);

    if (success) {
      return NextResponse.json({ message: 'Prompt updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(user, 'operator', 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const prompt = await request.json();

    if (!prompt.promptKey || !prompt.promptName || !prompt.systemPrompt || !prompt.userPromptTemplate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const success = await dbService.addPrompt(prompt);

    if (success) {
      return NextResponse.json({ message: 'Prompt added successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to add prompt' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error adding prompt:', error);
    return NextResponse.json({ error: 'Failed to add prompt' }, { status: 500 });
  }
}
