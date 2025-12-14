import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ThreadType } from 'zalo-api-final';

const sendMessageSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  groupId: z.string().min(1, 'Group ID is required'),
  message: z.string().min(1, 'Message is required'),
});

// Import from the test login route's in-memory storage
// In a real app, this would be in a shared module
const getZaloInstance = (sessionId: string) => {
  // This is a workaround - in production, use a shared module
  return (global as any).zaloInstances?.get(sessionId);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = sendMessageSchema.parse(body);

    // Get Zalo instance from in-memory storage
    // Note: This is a simplified version. In production, use a proper shared storage
    const api = getZaloInstance(validatedData.sessionId);

    if (!api) {
      return NextResponse.json(
        { error: 'Zalo session not found. Please login with QR code first.' },
        { status: 404 }
      );
    }

    // Send message to group
    const result = await api.sendMessage(
      {
        msg: validatedData.message,
      },
      validatedData.groupId,
      ThreadType.Group
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

