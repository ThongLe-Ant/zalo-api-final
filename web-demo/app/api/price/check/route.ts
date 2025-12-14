import { NextRequest, NextResponse } from 'next/server';
import { loadPrice, comparePrice, savePrice, type PriceData } from '@/lib/price-storage';
import { parseAllProducts } from '@/lib/price-parser';

export async function GET(request: NextRequest) {
  try {
    // Fetch giá mới từ API
    const fetchResponse = await fetch(`${request.nextUrl.origin}/api/price/fetch`);
    
    if (!fetchResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch new price' },
        { status: fetchResponse.status }
      );
    }

    const fetchData = await fetchResponse.json();
    const newPrice: PriceData = {
      ...fetchData.data,
      allProducts: fetchData.allProducts, // Include all products
    };

    // Load giá cũ
    const oldPrice = await loadPrice();

    // So sánh giá
    const priceChange = comparePrice(oldPrice, newPrice);

    // Lưu giá mới
    await savePrice(newPrice);

    return NextResponse.json({
      success: true,
      currentPrice: newPrice,
      previousPrice: oldPrice,
      change: priceChange,
    });
  } catch (error) {
    console.error('Check price error:', error);
    return NextResponse.json(
      { error: 'Failed to check price: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

