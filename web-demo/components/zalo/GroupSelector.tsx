'use client';

import { useState, useEffect } from 'react';
import SendMessageForm from './SendMessageForm';

interface Group {
  groupId: string;
  name: string;
  avatar?: string;
  totalMember?: number;
  desc?: string;
}

interface GroupSelectorProps {
  sessionId: string;
}

export default function GroupSelector({ sessionId }: GroupSelectorProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadGroups = async () => {
    if (!sessionId) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/test/groups?sessionId=${sessionId}`);
      
      if (!response.ok) {
        let errorMsg = 'Không thể lấy danh sách nhóm';
        try {
          const data = await response.json();
          errorMsg = data.error || errorMsg;
          console.error('API Error:', data);
          setError(`${errorMsg}${data.debug ? ` (Debug: ${JSON.stringify(data.debug)})` : ''}`);
        } catch (parseError) {
          // Nếu không parse được JSON, dùng status text
          errorMsg = response.statusText || `HTTP ${response.status}`;
          console.error('API Error (non-JSON):', errorMsg);
          setError(errorMsg);
        }
        return;
      }

      const data = await response.json();

      console.log('Groups response:', data);
      setGroups(data.groups || []);
      
      // Auto-select first group if available
      if (data.groups && data.groups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(data.groups[0].groupId);
      }
      
      if (data.groups && data.groups.length === 0) {
        setError('Không tìm thấy nhóm nào. Bạn có thể chưa tham gia nhóm nào hoặc cần đợi vài giây để đồng bộ.');
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải danh sách nhóm');
      console.error('Load groups error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      loadGroups();
    }
  }, [sessionId]);

  return (
    <div className="space-y-4">
      {/* Load Groups Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Chọn nhóm:</h3>
        <button
          onClick={loadGroups}
          disabled={loading || !sessionId}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang tải...' : '🔄 Tải lại danh sách'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Group List */}
      {groups.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
          {groups.map((group) => (
            <button
              key={group.groupId}
              onClick={() => setSelectedGroupId(group.groupId)}
              className={`w-full text-left p-3 rounded-md border transition-colors ${
                selectedGroupId === group.groupId
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                {group.avatar && (
                  <img
                    src={group.avatar}
                    alt={group.name}
                    className="w-10 h-10 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{group.name}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                    <span>ID: {group.groupId}</span>
                    {group.totalMember !== undefined && (
                      <span>• {group.totalMember} thành viên</span>
                    )}
                  </div>
                </div>
                {selectedGroupId === group.groupId && (
                  <span className="text-blue-600">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        !loading && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center text-sm text-gray-600">
            {sessionId ? 'Chưa có nhóm nào. Click "Tải lại danh sách" để tải.' : 'Vui lòng đăng nhập Zalo trước.'}
          </div>
        )
      )}

      {/* Send Message Form */}
      {selectedGroupId && (
        <div className="mt-4 pt-4 border-t">
          <SendMessageForm 
            threadType="group" 
            sessionId={sessionId}
            groupId={selectedGroupId}
          />
        </div>
      )}
    </div>
  );
}

