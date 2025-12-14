import { NextRequest, NextResponse } from 'next/server';
import { ZaloClientManager } from '@/lib/zalo-client';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Zalo instance
    const api = await ZaloClientManager.getInstance(user.userId);
    if (!api) {
      return NextResponse.json(
        { error: 'Zalo session not found. Please login with QR code first.' },
        { status: 404 }
      );
    }

    // Get friends list
    const friends = await api.getAllFriends();

    return NextResponse.json({
      success: true,
      friends: friends.data || [],
    });
  } catch (error) {
    console.error('Get friends error:', error);
    return NextResponse.json(
      { error: 'Failed to get friends list' },
      { status: 500 }
    );
  }
}

