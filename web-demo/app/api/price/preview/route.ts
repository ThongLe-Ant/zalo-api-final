import { NextRequest, NextResponse } from 'next/server';
import { createPriceImageHTML } from '@/lib/image-generator';
import { type PriceData, type PriceChange } from '@/lib/price-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceData, priceChange } = body;

    if (!priceData) {
      return NextResponse.json(
        { error: 'priceData is required' },
        { status: 400 }
      );
    }

    // Generate HTML template
    try {
      const html = await createPriceImageHTML(
        priceData as PriceData,
        priceChange as PriceChange || { hasChanged: false }
      );

      return NextResponse.json({
        success: true,
        html,
      });
    } catch (htmlError) {
      console.error('Error generating HTML:', htmlError);
      return NextResponse.json(
        { error: 'Failed to generate HTML: ' + (htmlError as Error).message, details: (htmlError as Error).stack },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview: ' + (error as Error).message, details: (error as Error).stack },
      { status: 500 }
    );
  }
}

