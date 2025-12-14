import { NextRequest, NextResponse } from 'next/server';
import { ZaloClientManager } from '@/lib/zalo-client';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Start QR login process
    const sessionId = await ZaloClientManager.startQRLogin(user.userId);

    return NextResponse.json({
      success: true,
      sessionId,
    });
  } catch (error) {
    console.error('QR login start error:', error);
    return NextResponse.json(
      { error: 'Failed to start QR login' },
      { status: 500 }
    );
  }
}

