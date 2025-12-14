# Zalo API Final - Web Demo

Web UI demo để test thư viện zalo-api-final sử dụng Next.js 16 và PostgreSQL.

## Tính năng

- ✅ Đăng ký/Đăng nhập với JWT
- ✅ Đăng nhập Zalo bằng QR Code
- ✅ Gửi tin nhắn Zalo
- ✅ Quản lý session Zalo
- ✅ Chat interface

## Yêu cầu

- Node.js >= 18.0.0
- PostgreSQL database
- npm hoặc yarn

## Cài đặt

1. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

2. **Setup database:**
   - Tạo PostgreSQL database
   - Copy `.env.example` thành `.env` và cập nhật `DATABASE_URL`
   - Chạy migrations:
     ```bash
     npx prisma migrate dev
     ```

3. **Chạy development server:**
   ```bash
   npm run dev
   ```

4. **Mở trình duyệt:**
   - Truy cập http://localhost:3000
   - Đăng ký tài khoản mới hoặc đăng nhập
   - Kết nối Zalo bằng QR Code
   - Bắt đầu gửi tin nhắn!

## Cấu trúc thư mục

```
web-demo/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   ├── (auth)/             # Auth pages
│   └── dashboard/          # Dashboard pages
├── components/             # React components
│   ├── zalo/              # Zalo-specific components
│   └── chat/              # Chat components
├── lib/                    # Utilities
│   ├── db.ts              # Prisma client
│   ├── auth.ts            # JWT utilities
│   └── zalo-client.ts     # Zalo client wrapper
└── prisma/                # Prisma schema
```

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/zalo_demo"
JWT_SECRET="your-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất

### Zalo
- `POST /api/zalo/login-qr` - Bắt đầu QR login
- `GET /api/zalo/login-qr/status` - Lấy QR login status
- `POST /api/zalo/send-message` - Gửi tin nhắn
- `GET /api/zalo/friends` - Lấy danh sách bạn bè
- `GET /api/zalo/messages` - Lấy tin nhắn

## Notes

- Zalo sessions được lưu trong database để có thể reconnect
- Zalo instances được quản lý trong memory
- Real-time messaging có thể được mở rộng với WebSocket
