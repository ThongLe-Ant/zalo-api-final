import { NextRequest, NextResponse } from 'next/server';
import { ThreadType } from 'zalo-api-final';
import { loadPrice, type PriceData } from '@/lib/price-storage';
import { generatePriceImage } from '@/lib/image-generator';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const ZALO_GROUP_ID = '9041068016343373871';

// Get Zalo instance from shared in-memory storage
const getZaloInstance = (sessionId: string) => {
  return (global as any).zaloInstances?.get(sessionId);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, priceData, priceChange, previousPrice } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    if (!priceData || !priceChange) {
      return NextResponse.json(
        { error: 'priceData and priceChange are required' },
        { status: 400 }
      );
    }

    // Get Zalo instance
    const api = getZaloInstance(sessionId);

    if (!api) {
      return NextResponse.json(
        { error: 'Zalo session not found. Please login with QR code first.' },
        { status: 404 }
      );
    }

    // Sử dụng previousPrice từ request hoặc load từ storage
    const prevPrice = previousPrice || await loadPrice();

    // Generate ảnh từ dữ liệu giá
    let imagePath: string | null = null;
    try {
      const imageBuffer = await generatePriceImage(priceData as PriceData, priceChange, prevPrice);
      
      // Lưu ảnh tạm thời
      imagePath = join(tmpdir(), `price-${Date.now()}.png`);
      await writeFile(imagePath, imageBuffer);
      
      // Gửi chỉ ảnh, không gửi text
      const result = await api.sendMessage(
        {
          msg: '', // Không gửi text, chỉ gửi ảnh
          attachments: [imagePath],
        },
        ZALO_GROUP_ID,
        ThreadType.Group
      );

      // Xóa file tạm sau khi gửi
      try {
        await unlink(imagePath);
      } catch (err) {
        console.error('Error deleting temp image:', err);
      }

      return NextResponse.json({
        success: true,
        result,
        imageSent: true,
      });
    } catch (imageError) {
      console.error('Error generating/sending image:', imageError);
      
      // Nếu không tạo được ảnh, trả về lỗi
      // Xóa file tạm nếu có
      if (imagePath) {
        try {
          await unlink(imagePath);
        } catch (err) {
          // Ignore
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to generate image: ' + (imageError as Error).message,
          imageSent: false,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message,
      result,
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

