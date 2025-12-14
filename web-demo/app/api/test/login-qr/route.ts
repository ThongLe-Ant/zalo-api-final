import { NextRequest, NextResponse } from 'next/server';
import { Zalo } from 'zalo-api-final';
import { LoginQRCallbackEventType } from 'zalo-api-final';

// In-memory storage for test (no database needed)
const qrSessions = new Map<string, any>();
const zaloInstances = new Map<string, any>();

// Make zaloInstances available globally for other routes
if (typeof global !== 'undefined') {
  (global as any).zaloInstances = zaloInstances;
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = `test-${Date.now()}`;
    
    // Initialize session
    qrSessions.set(sessionId, {
      qrCode: null,
      qrImage: null,
      status: 'generating',
      userInfo: null,
    });

    // Start QR login in background
    const zalo = new Zalo({
      logging: true,
    });

    const callback = (event: any) => {
      const session = qrSessions.get(sessionId);
      if (!session) return;

      switch (event.type) {
        case LoginQRCallbackEventType.QRCodeGenerated:
          qrSessions.set(sessionId, {
            ...session,
            qrCode: event.data.code,
            qrImage: event.data.image,
            status: 'generated',
          });
          break;

        case LoginQRCallbackEventType.QRCodeExpired:
          qrSessions.set(sessionId, {
            ...session,
            status: 'expired',
          });
          break;

        case LoginQRCallbackEventType.QRCodeScanned:
          qrSessions.set(sessionId, {
            ...session,
            status: 'scanned',
            userInfo: {
              avatar: event.data.avatar,
              display_name: event.data.display_name,
            },
          });
          break;

        case LoginQRCallbackEventType.QRCodeDeclined:
          qrSessions.set(sessionId, {
            ...session,
            status: 'declined',
          });
          break;

        case LoginQRCallbackEventType.GotLoginInfo:
          // Store instance in memory
          zalo.login({
            cookie: event.data.cookie,
            imei: event.data.imei,
            userAgent: event.data.userAgent,
            language: 'vi',
          }).then((api) => {
            console.log('Login successful, storing instance for sessionId:', sessionId);
            zaloInstances.set(sessionId, api);
            // Also store in global for other routes
            if (typeof global !== 'undefined') {
              (global as any).zaloInstances = zaloInstances;
            }
            qrSessions.set(sessionId, {
              ...session,
              status: 'confirmed',
            });
            console.log('Instance stored. Total instances:', zaloInstances.size);
          }).catch((error) => {
            console.error('Login error:', error);
            qrSessions.set(sessionId, {
              ...session,
              status: 'error',
              error: error.message,
            });
          });
          break;
      }
    };

    // Start login process (non-blocking)
    // Note: loginQR returns a promise that resolves with API instance
    // But we also get GotLoginInfo callback which we use to store instance
    zalo.loginQR({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
      language: 'vi',
    }, callback).then((api) => {
      // This is a fallback - instance should already be stored in GotLoginInfo callback
      console.log('QR login promise resolved, checking if instance already stored...');
      if (!zaloInstances.has(sessionId)) {
        console.log('Instance not found, storing from promise...');
        zaloInstances.set(sessionId, api);
        if (typeof global !== 'undefined') {
          (global as any).zaloInstances = zaloInstances;
        }
      }
    }).catch((error) => {
      console.error('QR login error:', error);
      const session = qrSessions.get(sessionId);
      if (session) {
        qrSessions.set(sessionId, {
          ...session,
          status: 'error',
          error: error.message || 'Login failed',
        });
      }
    });

    return NextResponse.json({
      success: true,
      sessionId,
    });
  } catch (error: any) {
    console.error('QR login start error:', error);
    return NextResponse.json(
      { error: 'Failed to start QR login: ' + error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId is required' },
      { status: 400 }
    );
  }

  const status = qrSessions.get(sessionId);
  if (!status) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    );
  }

  // Check if we have an active instance
  if (status.status === 'confirmed' && zaloInstances.has(sessionId)) {
    return NextResponse.json({
      success: true,
      ...status,
      hasInstance: true,
    });
  }

  return NextResponse.json({
    success: true,
    ...status,
    hasInstance: false,
  });
}

