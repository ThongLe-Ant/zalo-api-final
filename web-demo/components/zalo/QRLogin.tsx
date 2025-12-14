'use client';

import { useState, useEffect } from 'react';

interface QRLoginStatus {
  qrCode: string | null;
  qrImage: string | null;
  status: 'generating' | 'generated' | 'scanned' | 'confirmed' | 'expired' | 'declined' | 'error';
  userInfo: {
    avatar?: string;
    display_name?: string;
  } | null;
  error?: string;
  hasInstance?: boolean;
}

interface QRLoginProps {
  onConnected?: (info: { name?: string; avatar?: string }) => void;
}

export default function QRLogin({ onConnected }: QRLoginProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<QRLoginStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const startQRLogin = async () => {
    setLoading(true);
    setStatus(null);
    setSessionId(null);

    try {
      const response = await fetch('/api/test/login-qr', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to start QR login');
        return;
      }

      setSessionId(data.sessionId);
      pollStatus(data.sessionId);
    } catch (error) {
      console.error('Start QR login error:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = async (sid: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/test/login-qr?sessionId=${sid}`);
        const data = await response.json();

        if (!response.ok) {
          clearInterval(interval);
          return;
        }

        setStatus(data);

        // Stop polling if login is confirmed or error
        if (data.status === 'confirmed' && data.hasInstance) {
          clearInterval(interval);
          
          // Store sessionId in localStorage
          localStorage.setItem('zalo_session_id', sid);
          
          // Call onConnected callback
          if (onConnected && data.userInfo) {
            onConnected({
              name: data.userInfo.display_name,
              avatar: data.userInfo.avatar,
            });
          }
        } else if (data.status === 'error' || data.status === 'expired') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Poll status error:', error);
        clearInterval(interval);
      }
    }, 1000); // Poll every second

    // Cleanup on unmount
    return () => clearInterval(interval);
  };

  useEffect(() => {
    if (sessionId) {
      pollStatus(sessionId);
    }
  }, [sessionId]);

  const getStatusMessage = () => {
    if (!status) return null;

    switch (status.status) {
      case 'generating':
        return 'Đang tạo mã QR...';
      case 'generated':
        return 'Quét mã QR bằng ứng dụng Zalo của bạn';
      case 'scanned':
        return 'Đã quét mã QR. Vui lòng xác nhận trên điện thoại.';
      case 'confirmed':
        return 'Đăng nhập thành công!';
      case 'expired':
        return 'Mã QR đã hết hạn. Vui lòng thử lại.';
      case 'declined':
        return 'Đăng nhập bị từ chối. Vui lòng thử lại.';
      case 'error':
        return `Lỗi: ${status.error || 'Unknown error'}`;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {!sessionId && (
        <button
          onClick={startQRLogin}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang khởi tạo...' : 'Kết nối Zalo bằng QR Code'}
        </button>
      )}

      {status && (
        <div className="space-y-4">
          {status.qrImage && status.status === 'generated' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                <img
                  src={`data:image/png;base64,${status.qrImage}`}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              </div>
              {status.userInfo && status.userInfo.display_name && (
                <div className="text-center">
                  <p className="text-sm text-gray-600">Đang đăng nhập với:</p>
                  <p className="font-semibold">{status.userInfo.display_name}</p>
                </div>
              )}
            </div>
          )}

          {getStatusMessage() && (
            <div
              className={`p-3 rounded-md text-center ${
                status.status === 'confirmed'
                  ? 'bg-green-50 text-green-700'
                  : status.status === 'error' || status.status === 'expired' || status.status === 'declined'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              {getStatusMessage()}
            </div>
          )}

          {(status.status === 'expired' || status.status === 'error' || status.status === 'declined') && (
            <button
              onClick={startQRLogin}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Thử lại
            </button>
          )}
        </div>
      )}
    </div>
  );
}
