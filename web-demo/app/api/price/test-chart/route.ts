import { NextRequest, NextResponse } from 'next/server';
import { createPriceImageHTML } from '@/lib/image-generator';
import { type PriceData, type PriceChange, savePrice, getLast3Prices } from '@/lib/price-storage';

/**
 * API để tạo dữ liệu test với 3 giá gần nhất và preview chart
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create-test-data') {
      // Tạo 3 giá test với timestamp khác nhau
      const now = Date.now();
      const basePrice = 2329000; // Giá cơ bản
      
      const testPrices: PriceData[] = [
        {
          buyPrice: basePrice - 50000, // Giá 1: 2,279,000
          sellPrice: 2401000 - 50000,
          unit: 'Vnđ/Lượng',
          updateTime: '13/12/2025 08:00',
          lastDate: '13/12/2025',
          lastTime: '08:00',
          timestamp: now - 3600000 * 2, // 2 giờ trước
          allProducts: [],
        },
        {
          buyPrice: basePrice - 20000, // Giá 2: 2,309,000
          sellPrice: 2401000 - 20000,
          unit: 'Vnđ/Lượng',
          updateTime: '13/12/2025 10:00',
          lastDate: '13/12/2025',
          lastTime: '10:00',
          timestamp: now - 3600000, // 1 giờ trước
          allProducts: [],
        },
        {
          buyPrice: basePrice, // Giá 3: 2,329,000 (hiện tại)
          sellPrice: 2401000,
          unit: 'Vnđ/Lượng',
          updateTime: '13/12/2025 12:00',
          lastDate: '13/12/2025',
          lastTime: '12:00',
          timestamp: now, // Hiện tại
          allProducts: [],
        },
      ];

      // Xóa lịch sử cũ trước khi tạo test data mới
      const { loadPriceHistory } = await import('@/lib/price-storage');
      const history = await loadPriceHistory();
      history.prices = []; // Xóa tất cả giá cũ
      await import('fs/promises').then(fs => 
        fs.writeFile(require('path').join(process.cwd(), '.price-history.json'), JSON.stringify(history, null, 2), 'utf-8')
      );
      
      // Lưu từng giá vào lịch sử (không gọi savePrice để tránh ghi đè)
      for (const price of testPrices) {
        history.prices.push(price);
      }
      
      // Chỉ giữ lại 3 giá gần nhất
      if (history.prices.length > history.maxHistory) {
        history.prices = history.prices.slice(-history.maxHistory);
      }
      
      // Lưu toàn bộ lịch sử một lần
      await import('fs/promises').then(fs => 
        fs.writeFile(require('path').join(process.cwd(), '.price-history.json'), JSON.stringify(history, null, 2), 'utf-8')
      );
      
      // Lưu giá cuối cùng vào storage file
      await savePrice(testPrices[testPrices.length - 1]);

      return NextResponse.json({
        success: true,
        message: 'Đã tạo 3 giá test thành công',
        prices: testPrices.map(p => ({
          buyPrice: p.buyPrice,
          lastTime: p.lastTime,
          timestamp: p.timestamp,
        })),
      });
    }

    if (action === 'preview') {
      // Lấy giá hiện tại (giá cuối cùng)
      const last3Prices = await getLast3Prices();
      const currentPrice = last3Prices[last3Prices.length - 1] || last3Prices[0];

      if (!currentPrice) {
        return NextResponse.json(
          { error: 'Chưa có dữ liệu giá. Vui lòng tạo test data trước.' },
          { status: 400 }
        );
      }

      // Generate HTML với chart
      const html = await createPriceImageHTML(
        currentPrice,
        { hasChanged: true } as PriceChange,
        last3Prices[last3Prices.length - 2] || null
      );

      return NextResponse.json({
        success: true,
        html,
        currentPrice: {
          buyPrice: currentPrice.buyPrice,
          lastTime: currentPrice.lastTime,
        },
        historyCount: last3Prices.length,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "create-test-data" or "preview"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Test chart error:', error);
    return NextResponse.json(
      { error: 'Failed: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

