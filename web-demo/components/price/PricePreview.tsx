'use client';

import { useState, useEffect } from 'react';

interface PriceData {
  productName?: string;
  buyPrice: number;
  sellPrice: number;
  unit?: string;
  category?: string;
  updateTime: string;
  lastDate: string;
  lastTime: string;
  allProducts?: Array<{
    productName: string;
    buyPrice: number;
    sellPrice: number;
    unit: string;
    category?: string;
  }>;
}

interface PriceChange {
  hasChanged: boolean;
  buyPriceChange?: number;
  sellPriceChange?: number;
  buyPricePercent?: number;
  sellPricePercent?: number;
  buyPriceDirection?: 'up' | 'down' | 'same';
  sellPriceDirection?: 'up' | 'down' | 'same';
}

interface PricePreviewProps {
  priceData: PriceData | null;
  priceChange: PriceChange | null;
}

export default function PricePreview({ priceData, priceChange }: PricePreviewProps) {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const generatePreview = async () => {
    if (!priceData) {
      setPreviewHtml('');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/price/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceData,
          priceChange: priceChange || { hasChanged: false },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewHtml(data.html);
        setLastUpdate(new Date());
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to generate preview:', errorData);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!priceData) {
      setPreviewHtml('');
      return;
    }

    // Debounce để tránh gọi quá nhiều lần khi dữ liệu thay đổi nhanh
    const timeoutId = setTimeout(() => {
      generatePreview();
    }, 100);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceData, priceChange]);

  if (!priceData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center text-gray-500">
        Chưa có dữ liệu giá để hiển thị preview
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Đang tạo preview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">📄 Preview Template</h3>
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            {priceData.updateTime && (
              <p>Dữ liệu cập nhật: {priceData.updateTime}</p>
            )}
            {lastUpdate && (
              <p>Preview tạo lúc: {lastUpdate.toLocaleString('vi-VN')}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generatePreview}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            title="Làm mới preview"
          >
            {loading ? '⏳ Đang tải...' : '🔄 Làm mới'}
          </button>
          <button
            onClick={() => {
              const blob = new Blob([previewHtml], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
            }}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            🔗 Mở trong tab mới
          </button>
        </div>
      </div>
      
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-lg">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Preview Template</span>
            <span className="text-xs text-gray-500">720px width</span>
          </div>
        </div>
        <div className="overflow-auto bg-gray-100 p-4" style={{ maxHeight: '600px' }}>
          <div 
            className="mx-auto"
            style={{ width: '720px' }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  );
}

