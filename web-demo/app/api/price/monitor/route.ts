import { NextRequest, NextResponse } from 'next/server';
import { loadPrice, comparePrice, savePrice, type PriceData } from '@/lib/price-storage';
import { generatePriceImage } from '@/lib/image-generator';
import { ThreadType } from 'zalo-api-final';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const ZALO_GROUP_ID = '9041068016343373871';

// Get Zalo instance from shared in-memory storage
const getZaloInstance = (sessionId: string) => {
  return (global as any).zaloInstances?.get(sessionId);
};

/**
 * API route để check giá và tự động gửi thông báo nếu có thay đổi
 * Có thể được gọi định kỳ bởi cron job hoặc external service
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Fetch giá mới từ API
    const fetchResponse = await fetch(`${request.nextUrl.origin}/api/price/fetch`);
    
    if (!fetchResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch new price' },
        { status: fetchResponse.status }
      );
    }

    const fetchData = await fetchResponse.json();
    const newPrice: PriceData = fetchData.data;

    // Load giá cũ
    const oldPrice = await loadPrice();

    // So sánh giá
    const priceChange = comparePrice(oldPrice, newPrice);

    // Lưu giá mới
    await savePrice(newPrice);

    // Nếu có thay đổi, gửi thông báo
    if (priceChange.hasChanged) {
      try {
        // Get Zalo instance
        const api = getZaloInstance(sessionId);

        if (api) {
          // Generate ảnh và gửi (chỉ ảnh, không gửi text)
          let imagePath: string | null = null;
          try {
            const imageBuffer = await generatePriceImage(newPrice, priceChange, oldPrice);
            imagePath = join(tmpdir(), `price-${Date.now()}.png`);
            await writeFile(imagePath, imageBuffer);

            await api.sendMessage(
              {
                msg: '', // Không gửi text, chỉ gửi ảnh
                attachments: [imagePath],
              },
              ZALO_GROUP_ID,
              ThreadType.Group
            );

            // Xóa file tạm
            try {
              await unlink(imagePath);
            } catch (err) {
              // Ignore
            }
          } catch (imageError) {
            console.error('Error generating image:', imageError);
            // Nếu không tạo được ảnh, không gửi gì cả
            if (imagePath) {
              try {
                await unlink(imagePath);
              } catch (err) {
                // Ignore
              }
            }
            throw imageError; // Re-throw để báo lỗi
          }

          return NextResponse.json({
            success: true,
            priceChanged: true,
            message: 'Price changed and notification sent',
            currentPrice: newPrice,
            change: priceChange,
          });
        } else {
          return NextResponse.json({
            success: true,
            priceChanged: true,
            message: 'Price changed but Zalo session not found',
            currentPrice: newPrice,
            change: priceChange,
            warning: 'Notification not sent - Zalo session expired',
          });
        }
      } catch (error) {
        console.error('Error sending notification:', error);
        return NextResponse.json({
          success: true,
          priceChanged: true,
          message: 'Price changed but failed to send notification',
          currentPrice: newPrice,
          change: priceChange,
          error: (error as Error).message,
        });
      }
    }

    // Không có thay đổi
    return NextResponse.json({
      success: true,
      priceChanged: false,
      message: 'No price change detected',
      currentPrice: newPrice,
      previousPrice: oldPrice,
    });
  } catch (error) {
    console.error('Monitor price error:', error);
    return NextResponse.json(
      { error: 'Failed to monitor price: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

