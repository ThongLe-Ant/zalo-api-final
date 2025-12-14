'use client';

import { useState, useEffect } from 'react';

interface SendMessageFormProps {
  threadType?: 'user' | 'group';
  sessionId?: string;
  groupId?: string;
}

export default function SendMessageForm({ threadType: initialThreadType = 'user', sessionId: propSessionId, groupId: propGroupId }: SendMessageFormProps) {
  const [groupId, setGroupId] = useState(propGroupId || '');
  const [message, setMessage] = useState('');
  const [threadType, setThreadType] = useState<'user' | 'group'>(initialThreadType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionId, setSessionId] = useState(propSessionId || '');

  // Get sessionId from localStorage or prop
  useEffect(() => {
    if (propSessionId) {
      setSessionId(propSessionId);
    } else {
      const stored = localStorage.getItem('zalo_session_id');
      if (stored) setSessionId(stored);
    }
  }, [propSessionId]);

  // Update groupId when prop changes
  useEffect(() => {
    if (propGroupId) {
      setGroupId(propGroupId);
    }
  }, [propGroupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (!sessionId) {
      setError('Vui lòng đăng nhập Zalo trước');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/test/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          groupId: threadType === 'group' ? groupId : groupId, // For now, use same field
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gửi tin nhắn thất bại');
        return;
      }

      setSuccess(true);
      setMessage('');
      
      // Clear success message after 2 seconds
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          Gửi tin nhắn thành công!
        </div>
      )}

      {!propGroupId && (
        <div>
          <label htmlFor="groupId" className="block text-sm font-medium text-gray-700 mb-1">
            Group ID (Thread ID của nhóm)
          </label>
          <input
            id="groupId"
            type="text"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nhập Group ID (ví dụ: 123456789)"
          />
          <p className="mt-1 text-xs text-gray-500">
            Hoặc chọn nhóm từ danh sách ở trên
          </p>
        </div>
      )}
      
      {propGroupId && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">
            <strong>Nhóm đã chọn:</strong> {groupId}
          </p>
        </div>
      )}

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          Tin nhắn
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Nhập tin nhắn..."
        />
      </div>

      <button
        type="submit"
        disabled={loading || !sessionId}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Đang gửi...' : 'Gửi tin nhắn vào nhóm'}
      </button>
    </form>
  );
}
