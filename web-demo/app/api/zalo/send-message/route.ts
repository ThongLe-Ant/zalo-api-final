import { NextRequest, NextResponse } from 'next/server';
import { ZaloClientManager } from '@/lib/zalo-client';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { ThreadType } from 'zalo-api-final';

const sendMessageSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  message: z.string().min(1, 'Message is required'),
  threadType: z.enum(['user', 'group']).optional().default('user'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = sendMessageSchema.parse(body);

    // Get Zalo instance
    const api = await ZaloClientManager.getInstance(user.userId);
    if (!api) {
      return NextResponse.json(
        { error: 'Zalo session not found. Please login with QR code first.' },
        { status: 404 }
      );
    }


    // Send message
    const result = await api.sendMessage(
      {
        msg: validatedData.message,
      },
      validatedData.userId,
      validatedData.threadType === 'group' ? ThreadType.Group : ThreadType.User
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
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

