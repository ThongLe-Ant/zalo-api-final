import { NextRequest, NextResponse } from 'next/server';
import { ZaloClientManager } from '@/lib/zalo-client';
import { getCurrentUser } from '@/lib/auth';

// Simple in-memory message store (in production, use database or Redis)
const messageStore = new Map<string, any[]>();

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');

    // For now, return empty array
    // In production, this would fetch from database or message store
    const messages = messageStore.get(`${user.userId}:${threadId}`) || [];

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}

