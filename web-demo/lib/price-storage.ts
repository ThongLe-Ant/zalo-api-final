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
const HISTORY_FILE = path.join(process.cwd(), '.price-history.json');

interface PriceHistory {
  prices: PriceData[];
  maxHistory: number; // Tối đa số giá lưu trữ
}

/**
 * Lưu giá vào file
 */
export async function savePrice(priceData: PriceData): Promise<void> {
  try {
    // Đảm bảo có timestamp (nếu chưa có thì set timestamp hiện tại)
    if (!priceData.timestamp) {
      priceData.timestamp = Date.now();
    }
    
    // Lưu giá hiện tại
    await fs.writeFile(STORAGE_FILE, JSON.stringify(priceData, null, 2), 'utf-8');
    
    // Lưu vào lịch sử (tối đa 5 giá gần nhất)
    const history = await loadPriceHistory();
    
    // Kiểm tra xem giá này đã có trong lịch sử chưa (tránh duplicate)
    const existingIndex = history.prices.findIndex(p => 
      p.timestamp === priceData.timestamp || 
      (p.updateTime === priceData.updateTime && p.lastTime === priceData.lastTime)
    );
    
    if (existingIndex >= 0) {
      // Nếu đã có, cập nhật giá đó
      history.prices[existingIndex] = priceData;
    } else {
      // Nếu chưa có, thêm mới
      history.prices.push(priceData);
    }
    
    // Sắp xếp lại theo timestamp (tăng dần)
    history.prices.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    // Chỉ giữ lại 5 giá gần nhất
    if (history.prices.length > history.maxHistory) {
      history.prices = history.prices.slice(-history.maxHistory);
    }
    
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
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
 * Đọc lịch sử giá
 */
export async function loadPriceHistory(): Promise<PriceHistory> {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf-8');
    const history = JSON.parse(data) as PriceHistory;
    // Đảm bảo maxHistory luôn là 5 (nếu file cũ có maxHistory = 3)
    if (history.maxHistory !== 5) {
      history.maxHistory = 5;
      // Nếu có nhiều hơn 5 giá, chỉ giữ lại 5 giá gần nhất
      if (history.prices.length > 5) {
        history.prices = history.prices.slice(-5);
      }
    }
    return history;
  } catch (error) {
    // File không tồn tại, tạo mới
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { prices: [], maxHistory: 5 };
    }
    console.error('Error loading price history:', error);
    return { prices: [], maxHistory: 5 };
  }
}

/**
 * Lấy 5 giá gần nhất từ lịch sử
 */
export async function getLast3Prices(): Promise<PriceData[]> {
  const history = await loadPriceHistory();
  return history.prices.slice(-5); // Lấy 5 giá cuối cùng
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

