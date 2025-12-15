import { NextRequest, NextResponse } from 'next/server';
import { createPriceImageHTML } from '@/lib/image-generator';
import { type PriceData, type PriceChange, savePrice, getLast3Prices } from '@/lib/price-storage';

/**
 * API để tạo dữ liệu test với 5 giá gần nhất và preview chart
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create-test-data') {
      // Tạo 5 giá test với timestamp khác nhau
      const now = Date.now();
      const basePrice = 2329000; // Giá cơ bản
      
      // Helper function để tạo allProducts với sản phẩm cần thiết
      const createAllProducts = (buyPrice: number, sellPrice: number) => [
        {
          productName: 'BẠC MIẾNG PHÚ QUÝ 999 1 LƯỢNG',
          buyPrice: buyPrice,
          sellPrice: sellPrice,
          unit: 'Vnđ/Lượng',
          category: 'BẠC THƯƠNG HIỆU PHÚ QUÝ',
        },
      ];

      const testPrices: PriceData[] = [
        {
          buyPrice: basePrice - 80000, // Giá 1: 2,249,000
          sellPrice: 2401000 - 80000,
          unit: 'Vnđ/Lượng',
          updateTime: '13/12/2025 06:00',
          lastDate: '13/12/2025',
          lastTime: '06:00',
          timestamp: now - 3600000 * 4, // 4 giờ trước
          allProducts: createAllProducts(basePrice - 80000, 2401000 - 80000),
        },
        {
          buyPrice: basePrice - 50000, // Giá 2: 2,279,000
          sellPrice: 2401000 - 50000,
          unit: 'Vnđ/Lượng',
          updateTime: '13/12/2025 08:00',
          lastDate: '13/12/2025',
          lastTime: '08:00',
          timestamp: now - 3600000 * 2, // 2 giờ trước
          allProducts: createAllProducts(basePrice - 50000, 2401000 - 50000),
        },
        {
          buyPrice: basePrice - 20000, // Giá 3: 2,309,000
          sellPrice: 2401000 - 20000,
          unit: 'Vnđ/Lượng',
          updateTime: '13/12/2025 10:00',
          lastDate: '13/12/2025',
          lastTime: '10:00',
          timestamp: now - 3600000, // 1 giờ trước
          allProducts: createAllProducts(basePrice - 20000, 2401000 - 20000),
        },
        {
          buyPrice: basePrice - 10000, // Giá 4: 2,319,000
          sellPrice: 2401000 - 10000,
          unit: 'Vnđ/Lượng',
          updateTime: '13/12/2025 11:00',
          lastDate: '13/12/2025',
          lastTime: '11:00',
          timestamp: now - 1800000, // 30 phút trước
          allProducts: createAllProducts(basePrice - 10000, 2401000 - 10000),
        },
        {
          buyPrice: basePrice, // Giá 5: 2,329,000 (hiện tại)
          sellPrice: 2401000,
          unit: 'Vnđ/Lượng',
          updateTime: '13/12/2025 12:00',
          lastDate: '13/12/2025',
          lastTime: '12:00',
          timestamp: now, // Hiện tại
          allProducts: createAllProducts(basePrice, 2401000),
        },
      ];

      // Xóa lịch sử cũ trước khi tạo test data mới
      const { loadPriceHistory } = await import('@/lib/price-storage');
      const history = await loadPriceHistory();
      history.prices = []; // Xóa tất cả giá cũ
      await import('fs/promises').then(fs => 
        fs.writeFile(require('path').join(process.cwd(), '.price-history.json'), JSON.stringify(history, null, 2), 'utf-8')
      );
      
      // Xóa tất cả giá cũ và thêm 5 giá test mới
      history.prices = [...testPrices];
      
      // Đảm bảo maxHistory là 5
      history.maxHistory = 5;
      
      // Lưu toàn bộ lịch sử một lần
      const fs = await import('fs/promises');
      const path = require('path');
      await fs.writeFile(
        path.join(process.cwd(), '.price-history.json'), 
        JSON.stringify(history, null, 2), 
        'utf-8'
      );
      
      console.log(`[Test Chart] Đã lưu ${history.prices.length} giá vào lịch sử:`, 
        history.prices.map((p, i) => ({
          index: i + 1,
          buyPrice: p.buyPrice,
          hasAllProducts: !!p.allProducts,
          allProductsLength: p.allProducts?.length || 0,
          productName: p.allProducts?.[0]?.productName || 'N/A',
        }))
      );
      
      // Lưu giá cuối cùng vào storage file (KHÔNG gọi savePrice vì nó sẽ ghi đè lịch sử)
      // Thay vào đó, chỉ lưu vào storage file
      await import('fs/promises').then(fs => 
        fs.writeFile(require('path').join(process.cwd(), '.price-storage.json'), JSON.stringify(testPrices[testPrices.length - 1], null, 2), 'utf-8')
      );

      // Verify lại sau khi lưu
      const verifyHistory = await loadPriceHistory();
      console.log(`[Test Chart] Verify: Đã lưu ${verifyHistory.prices.length} giá, maxHistory=${verifyHistory.maxHistory}`);

      return NextResponse.json({
        success: true,
        message: `Đã tạo ${testPrices.length} giá test thành công`,
        prices: testPrices.map(p => ({
          buyPrice: p.buyPrice,
          lastTime: p.lastTime,
          timestamp: p.timestamp,
          hasAllProducts: !!p.allProducts,
          allProductsLength: p.allProducts?.length || 0,
        })),
        savedCount: verifyHistory.prices.length,
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
        currentPrice: currentPrice, // Trả về toàn bộ currentPrice với allProducts
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

