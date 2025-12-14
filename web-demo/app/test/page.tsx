'use client';

import { useState, useEffect } from 'react';
import QRLogin from '@/components/zalo/QRLogin';
import SendMessageForm from '@/components/zalo/SendMessageForm';

export default function TestPage() {
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test Zalo API - Gửi tin nhắn nhóm</h1>
          <p className="mt-2 text-gray-600">Test tính năng gửi tin nhắn vào nhóm Zalo (không cần database)</p>
        </div>

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
              <SendMessageForm threadType="group" sessionId={sessionId} />
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Hướng dẫn:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Click "Kết nối Zalo bằng QR Code" và quét mã QR bằng ứng dụng Zalo</li>
            <li>Sau khi kết nối thành công, nhập Group ID (Thread ID của nhóm)</li>
            <li>Nhập tin nhắn và click "Gửi tin nhắn"</li>
            <li>Kiểm tra tin nhắn trong nhóm Zalo của bạn</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

