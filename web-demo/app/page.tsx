'use client';

import { useState, useEffect } from 'react';
import QRLogin from '@/components/zalo/QRLogin';
import GroupSelector from '@/components/zalo/GroupSelector';
import PriceMonitor from '@/components/price/PriceMonitor';

export default function HomePage() {
  const [isConnected, setIsConnected] = useState(false);
  const [zaloInfo, setZaloInfo] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('zalo_session_id');
    if (stored) {
      setSessionId(stored);
      setIsConnected(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Zalo API Demo</h1>
          <p className="text-sm text-gray-600 mt-1">Gửi tin nhắn vào nhóm Zalo - Không cần database</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Login */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">1. Kết nối Zalo</h2>
            <QRLogin 
              onConnected={(info) => {
                setIsConnected(true);
                setZaloInfo(info);
                const stored = localStorage.getItem('zalo_session_id');
                if (stored) setSessionId(stored);
              }}
            />
            {isConnected && zaloInfo && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 font-medium">✅ Đã kết nối thành công!</p>
                {zaloInfo.name && <p className="text-sm text-green-600 mt-1">Tên: {zaloInfo.name}</p>}
              </div>
            )}
          </div>

          {/* Send Message */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">2. Gửi tin nhắn vào nhóm</h2>
            {isConnected ? (
              <GroupSelector sessionId={sessionId} />
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-yellow-800">
                  Vui lòng kết nối Zalo trước khi gửi tin nhắn.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">📋 Hướng dẫn sử dụng:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Click nút <strong>"Kết nối Zalo bằng QR Code"</strong> ở bên trái</li>
            <li>Quét mã QR bằng ứng dụng Zalo trên điện thoại của bạn</li>
            <li>Xác nhận đăng nhập trên điện thoại</li>
            <li>Sau khi kết nối thành công, click <strong>"Tải lại danh sách"</strong> để xem các nhóm bạn đã tham gia</li>
            <li>Chọn nhóm từ danh sách (hoặc nhập Group ID thủ công)</li>
            <li>Nhập tin nhắn bạn muốn gửi</li>
            <li>Click <strong>"Gửi tin nhắn vào nhóm"</strong> và kiểm tra trong nhóm Zalo</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-100 rounded-md">
            <p className="text-sm text-blue-900">
              <strong>💡 Lấy Group ID:</strong> Hệ thống sẽ tự động lấy danh sách nhóm từ API <code>getAllGroups()</code>. Bạn chỉ cần chọn nhóm từ danh sách!
            </p>
          </div>
        </div>

        {/* Price Monitor */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <PriceMonitor sessionId={sessionId} />
        </div>

        {/* Info */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            <strong>ℹ️ Lưu ý:</strong> Demo này không cần database. Session được lưu trong memory và sẽ mất khi restart server.
          </p>
        </div>
      </main>
    </div>
  );
}
