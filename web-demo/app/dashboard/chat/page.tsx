import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import ChatWindow from '@/components/chat/ChatWindow';

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { threadId?: string; threadType?: 'user' | 'group' };
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const threadId = searchParams.threadId || '';

  return (
    <div className="h-[calc(100vh-8rem)]">
      {threadId ? (
        <ChatWindow
          threadId={threadId}
          threadType={searchParams.threadType || 'user'}
        />
      ) : (
        <div className="flex items-center justify-center h-full bg-white rounded-lg shadow">
          <div className="text-center">
            <p className="text-gray-500">Chọn một cuộc trò chuyện để bắt đầu</p>
            <p className="text-sm text-gray-400 mt-2">
              Hoặc truy cập với ?threadId=USER_ID trong URL
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

