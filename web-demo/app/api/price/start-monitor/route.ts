import { NextRequest, NextResponse } from 'next/server';

/**
 * API route để start price monitoring
 * Sẽ được gọi bởi external cron service hoặc client
 * 
 * Usage:
 * - External cron: Gọi GET /api/price/monitor?sessionId=xxx mỗi X phút
 * - Client-side: Có thể poll endpoint này
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, interval } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Redirect to monitor endpoint
    // In production, this would be called by external cron service
    const monitorUrl = `${request.nextUrl.origin}/api/price/monitor?sessionId=${sessionId}`;
    
    return NextResponse.json({
      success: true,
      message: 'Monitor started. Use external cron service to call:',
      monitorUrl,
      instructions: [
        '1. Setup external cron service (cron-job.org, EasyCron, etc.)',
        `2. Call GET ${monitorUrl} every 5 minutes`,
        '3. Or use client-side polling (not recommended for production)',
      ],
    });
  } catch (error) {
    console.error('Start monitor error:', error);
    return NextResponse.json(
      { error: 'Failed to start monitor: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

