import { promises as fs } from 'fs';
import path from 'path';

export interface PriceData {
  productName?: string;
  buyPrice: number;
  sellPrice: number;
  unit?: string;
  category?: string;
  buyPriceChange?: number;
  sellPriceChange?: number;
  buyPricePercent?: number;
  sellPricePercent?: number;
  updateTime: string;
  lastDate: string;
  lastTime: string;
  timestamp: number;
  allProducts?: Array<{
    productName: string;
    buyPrice: number;
    sellPrice: number;
    unit: string;
    category?: string;
  }>;
}

export interface PriceChange {
  hasChanged: boolean;
  buyPriceChange?: number;
  sellPriceChange?: number;
  buyPricePercent?: number;
  sellPricePercent?: number;
  buyPriceDirection?: 'up' | 'down' | 'same';
  sellPriceDirection?: 'up' | 'down' | 'same';
}

const STORAGE_FILE = path.join(process.cwd(), '.price-storage.json');

/**
 * Lưu giá vào file
 */
export async function savePrice(priceData: PriceData): Promise<void> {
  try {
    await fs.writeFile(STORAGE_FILE, JSON.stringify(priceData, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving price:', error);
    throw error;
  }
}

/**
 * Đọc giá từ file
 */
export async function loadPrice(): Promise<PriceData | null> {
  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf-8');
    return JSON.parse(data) as PriceData;
  } catch (error) {
    // File không tồn tại hoặc lỗi đọc
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.error('Error loading price:', error);
    return null;
  }
}

/**
 * So sánh giá mới với giá cũ
 */
export function comparePrice(oldPrice: PriceData | null, newPrice: PriceData): PriceChange {
  if (!oldPrice) {
    return {
      hasChanged: false, // Lần đầu tiên, không có thay đổi
    };
  }

  const buyPriceChange = newPrice.buyPrice - oldPrice.buyPrice;
  const sellPriceChange = newPrice.sellPrice - oldPrice.sellPrice;

  const buyPricePercent = oldPrice.buyPrice > 0 
    ? (buyPriceChange / oldPrice.buyPrice) * 100 
    : 0;
  
  const sellPricePercent = oldPrice.sellPrice > 0 
    ? (sellPriceChange / oldPrice.sellPrice) * 100 
    : 0;

  const hasChanged = buyPriceChange !== 0 || sellPriceChange !== 0;

  return {
    hasChanged,
    buyPriceChange: buyPriceChange !== 0 ? buyPriceChange : undefined,
    sellPriceChange: sellPriceChange !== 0 ? sellPriceChange : undefined,
    buyPricePercent: buyPriceChange !== 0 ? buyPricePercent : undefined,
    sellPricePercent: sellPriceChange !== 0 ? sellPricePercent : undefined,
    buyPriceDirection: buyPriceChange > 0 ? 'up' : buyPriceChange < 0 ? 'down' : 'same',
    sellPriceDirection: sellPriceChange > 0 ? 'up' : sellPriceChange < 0 ? 'down' : 'same',
  };
}

