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

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const status = ZaloClientManager.getQRLoginStatus(sessionId);

    if (!status) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('QR login status error:', error);
    return NextResponse.json(
      { error: 'Failed to get QR login status' },
      { status: 500 }
    );
  }
}

