import { NextRequest, NextResponse } from 'next/server';
import { parsePriceHTML, parseAllProducts } from '@/lib/price-parser';

const PRICE_API_URL = 'https://giabac.phuquygroup.vn/PhuQuyPrice/SilverPricePartial';
const DATETIME_API_URL = 'https://giabac.phuquygroup.vn/PhuQuyPrice/GetDateTimeUpdate';

const DEFAULT_HEADERS = {
  'accept': 'text/html, */*; q=0.01',
  'accept-language': 'vi,en-US;q=0.9,en;q=0.8',
  'referer': 'https://giabac.phuquygroup.vn/',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  'x-requested-with': 'XMLHttpRequest',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productName = searchParams.get('productName') || undefined;

    // Fetch giá từ SilverPricePartial
    const priceResponse = await fetch(PRICE_API_URL, {
      headers: DEFAULT_HEADERS,
    });

    if (!priceResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch price data' },
        { status: priceResponse.status }
      );
    }

    const priceHTML = await priceResponse.text();
    
    // Parse tất cả sản phẩm
    const allProducts = parseAllProducts(priceHTML);
    
    // Nếu có productName, lấy sản phẩm cụ thể, nếu không lấy sản phẩm đầu tiên
    let parsedPrice = productName 
      ? allProducts.find(p => p.productName.includes(productName)) || allProducts[0]
      : allProducts[0];

    if (!parsedPrice && allProducts.length > 0) {
      parsedPrice = allProducts[0];
    }

    if (!parsedPrice) {
      return NextResponse.json(
        { error: 'Could not parse price data from HTML' },
        { status: 500 }
      );
    }

    // Fetch thời gian cập nhật
    const datetimeResponse = await fetch(DATETIME_API_URL, {
      headers: {
        ...DEFAULT_HEADERS,
        'accept': '*/*',
      },
    });

    let updateTime = '';
    let lastDate = '';
    let lastTime = '';

    if (datetimeResponse.ok) {
      try {
        const datetimeData = await datetimeResponse.json();
        if (datetimeData.success) {
          lastDate = datetimeData.lastDate || '';
          lastTime = datetimeData.lastTime || '';
          updateTime = lastDate && lastTime ? `${lastDate} ${lastTime}` : '';
        }
      } catch (error) {
        console.error('Error parsing datetime response:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        productName: parsedPrice.productName,
        buyPrice: parsedPrice.buyPrice,
        sellPrice: parsedPrice.sellPrice,
        unit: parsedPrice.unit,
        category: parsedPrice.category,
        updateTime,
        lastDate,
        lastTime,
        timestamp: Date.now(),
      },
      allProducts: allProducts.map(p => ({
        productName: p.productName,
        buyPrice: p.buyPrice,
        sellPrice: p.sellPrice,
        unit: p.unit,
        category: p.category,
      })),
    });
  } catch (error) {
    console.error('Fetch price error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

