'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import PricePreview from './PricePreview';

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

export default function PriceMonitor({ sessionId }: { sessionId: string }) {
  const [currentPrice, setCurrentPrice] = useState<PriceData | null>(null);
  const [priceChange, setPriceChange] = useState<PriceChange | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [monitoring, setMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [checkInterval, setCheckInterval] = useState(5); // phút
  const [minChangePercent, setMinChangePercent] = useState(0); // % thay đổi tối thiểu để gửi

  const checkPrice = async () => {
    if (!sessionId) {
      setError('Vui lòng đăng nhập Zalo trước');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/price/check?sessionId=${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || 'Không thể kiểm tra giá';
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      setCurrentPrice(data.currentPrice);
      setPriceChange(data.change);
      setLastCheck(new Date());

      // Nếu có thay đổi và đang monitoring, kiểm tra threshold trước khi gửi
      if (data.change.hasChanged && monitoring) {
        const shouldNotify = checkNotificationThreshold(data.change);
        if (shouldNotify) {
          const success = await sendNotification(data.currentPrice, data.change, data.previousPrice);
          if (success) {
            toast.success('📤 Đã gửi thông báo giá thay đổi vào nhóm Zalo!');
          }
        } else {
          toast.info(`Giá thay đổi nhưng chưa đạt ngưỡng ${minChangePercent}%`);
        }
      }
    } catch (err) {
      const errorMsg = 'Có lỗi xảy ra khi kiểm tra giá';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Check price error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async (priceData: PriceData, change: PriceChange, previousPrice?: PriceData | null) => {
    try {
      const response = await fetch('/api/price/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          priceData,
          priceChange: change,
          previousPrice,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data.error || 'Không thể gửi tin nhắn';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Send notification error:', err);
      const errorMsg = 'Có lỗi xảy ra khi gửi tin nhắn';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    }
  };

  const sendTestMessage = async () => {
    if (!currentPrice) {
      const errorMsg = 'Chưa có dữ liệu giá. Vui lòng kiểm tra giá trước.';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (!sessionId) {
      const errorMsg = 'Vui lòng đăng nhập Zalo trước';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Tạo priceChange giả (không có thay đổi) để test
      const testChange: PriceChange = {
        hasChanged: false,
      };

      const success = await sendNotification(currentPrice, testChange);
      
      if (success) {
        toast.success('✅ Đã gửi tin nhắn thành công vào nhóm Zalo!');
      }
    } catch (err) {
      console.error('Send test message error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkNotificationThreshold = (change: PriceChange): boolean => {
    if (minChangePercent === 0) return true; // Gửi mọi thay đổi
    
    const buyChange = Math.abs(change.buyPricePercent || 0);
    const sellChange = Math.abs(change.sellPricePercent || 0);
    
    return buyChange >= minChangePercent || sellChange >= minChangePercent;
  };

  const startMonitoring = async () => {
    setMonitoring(true);
    // Check ngay lập tức
    await checkPrice();
  };

  const stopMonitoring = () => {
    setMonitoring(false);
  };

  // Auto-check khi monitoring
  useEffect(() => {
    if (!monitoring || !sessionId) return;

    const intervalMs = checkInterval * 60 * 1000; // Convert phút sang milliseconds
    const interval = setInterval(() => {
      checkPrice();
    }, intervalMs);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitoring, sessionId, checkInterval]);

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const getDirectionIcon = (direction?: 'up' | 'down' | 'same') => {
    switch (direction) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      case 'same':
        return '➡️';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Theo dõi giá bạc</h3>
        <div className="flex items-center space-x-2">
          {monitoring ? (
            <button
              onClick={stopMonitoring}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              ⏹️ Dừng theo dõi
            </button>
          ) : (
            <button
              onClick={startMonitoring}
              disabled={!sessionId}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              ▶️ Bắt đầu theo dõi
            </button>
          )}
          <button
            onClick={checkPrice}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang kiểm tra...' : '🔄 Kiểm tra ngay'}
          </button>
          <button
            onClick={sendTestMessage}
            disabled={loading || !currentPrice || !sessionId}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            title="Gửi tin nhắn với giá hiện tại vào nhóm Zalo để test"
          >
            📤 Gửi tin ngay
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Configuration Panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
        <h4 className="font-semibold text-gray-700 mb-3">⚙️ Cấu hình</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thời gian kiểm tra (phút)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={checkInterval}
              onChange={(e) => setCheckInterval(parseInt(e.target.value) || 5)}
              disabled={monitoring}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              {monitoring ? `Đang kiểm tra mỗi ${checkInterval} phút` : 'Thời gian giữa các lần kiểm tra'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ngưỡng thay đổi tối thiểu (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={minChangePercent}
              onChange={(e) => setMinChangePercent(parseFloat(e.target.value) || 0)}
              disabled={monitoring}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              {minChangePercent === 0 
                ? 'Gửi mọi thay đổi' 
                : `Chỉ gửi khi thay đổi ≥ ${minChangePercent}%`}
            </p>
          </div>
        </div>
      </div>

      {monitoring && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
          ⏰ Đang theo dõi tự động (kiểm tra mỗi {checkInterval} phút)
          {minChangePercent > 0 && (
            <span className="ml-2">• Chỉ gửi khi thay đổi ≥ {minChangePercent}%</span>
          )}
        </div>
      )}

      {currentPrice && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            {currentPrice.productName && (
              <div>
                <h4 className="font-semibold text-gray-700">Sản phẩm:</h4>
                <p className="text-gray-900">{currentPrice.productName}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Giá mua:</h4>
                <p className="text-2xl font-bold text-red-600">
                  {formatNumber(currentPrice.buyPrice)} VNĐ
                </p>
                {priceChange?.buyPriceChange !== undefined && (
                  <p className="text-sm mt-1">
                    {getDirectionIcon(priceChange.buyPriceDirection)}{' '}
                    {priceChange.buyPriceChange >= 0 ? '+' : ''}
                    {formatNumber(priceChange.buyPriceChange)} VNĐ
                    {priceChange.buyPricePercent !== undefined && (
                      <span className="ml-2">
                        ({priceChange.buyPricePercent >= 0 ? '+' : ''}
                        {priceChange.buyPricePercent.toFixed(2)}%)
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Giá bán:</h4>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(currentPrice.sellPrice)} VNĐ
                </p>
                {priceChange?.sellPriceChange !== undefined && (
                  <p className="text-sm mt-1">
                    {getDirectionIcon(priceChange.sellPriceDirection)}{' '}
                    {priceChange.sellPriceChange >= 0 ? '+' : ''}
                    {formatNumber(priceChange.sellPriceChange)} VNĐ
                    {priceChange.sellPricePercent !== undefined && (
                      <span className="ml-2">
                        ({priceChange.sellPricePercent >= 0 ? '+' : ''}
                        {priceChange.sellPricePercent.toFixed(2)}%)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {currentPrice.updateTime && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">
                  🕐 Cập nhật: {currentPrice.updateTime}
                </p>
              </div>
            )}

            {lastCheck && (
              <div>
                <p className="text-xs text-gray-500">
                  Lần kiểm tra cuối: {lastCheck.toLocaleString('vi-VN')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {!currentPrice && !loading && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center text-gray-600">
          Chưa có dữ liệu giá. Click "Kiểm tra ngay" để lấy giá hiện tại.
        </div>
      )}

      {/* Price Preview */}
      {currentPrice && (
        <div className="mt-6">
          <PricePreview priceData={currentPrice} priceChange={priceChange} />
        </div>
      )}
    </div>
  );
}

