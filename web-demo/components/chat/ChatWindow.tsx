'use client';

import { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface Message {
  id: string;
  content: string;
  userId: string;
  timestamp: Date;
  isSelf?: boolean;
}

interface ChatWindowProps {
  threadId: string;
  threadType?: 'user' | 'group';
}

export default function ChatWindow({ threadId, threadType = 'user' }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/zalo/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: threadId,
          message,
          threadType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Gửi tin nhắn thất bại');
        return;
      }

      // Add sent message to list
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: message,
          userId: threadId,
          timestamp: new Date(),
          isSelf: true,
        },
      ]);
    } catch (error) {
      console.error('Send message error:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // TODO: Poll for new messages or use WebSocket
  useEffect(() => {
    // This would be replaced with WebSocket or polling
    // For now, messages are only shown when sent
  }, [threadId]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Chat: {threadId}</h2>
      </div>
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} />
      </div>
      <MessageInput onSend={handleSendMessage} disabled={loading} />
    </div>
  );
}

