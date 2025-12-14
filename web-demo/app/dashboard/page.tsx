import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import QRLogin from '@/components/zalo/QRLogin';
import SendMessageForm from '@/components/zalo/SendMessageForm';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has active Zalo session
  const zaloSession = await db.zaloSession.findFirst({
    where: {
      userId: user.userId,
      isActive: true,
    },
    orderBy: {
      lastUsedAt: 'desc',
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Quản lý tài khoản Zalo của bạn</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Zalo Connection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Kết nối Zalo</h2>
          {zaloSession ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-green-800 font-medium">Đã kết nối Zalo</p>
                {zaloSession.zaloName && (
                  <p className="text-sm text-green-600 mt-1">
                    Tên: {zaloSession.zaloName}
                  </p>
                )}
                {zaloSession.zaloUid && (
                  <p className="text-sm text-green-600">
                    UID: {zaloSession.zaloUid}
                  </p>
                )}
              </div>
              <QRLogin />
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                Chưa kết nối tài khoản Zalo. Vui lòng quét QR code để đăng nhập.
              </p>
              <QRLogin />
            </div>
          )}
        </div>

        {/* Send Message */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Gửi tin nhắn</h2>
          {zaloSession ? (
            <SendMessageForm />
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-yellow-800">
                Vui lòng kết nối Zalo trước khi gửi tin nhắn.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

