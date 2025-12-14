import { Zalo, type API, type LoginQRCallback, LoginQRCallbackEventType } from 'zalo-api-final';
import { db } from './db';
import type { ZaloSession } from '@prisma/client';

// Store active Zalo instances in memory
const zaloInstances = new Map<string, API>();
const qrLoginSessions = new Map<string, QRLoginSession>();

interface QRLoginSession {
  qrCode: string | null;
  qrImage: string | null;
  status: 'generating' | 'generated' | 'scanned' | 'confirmed' | 'expired' | 'declined' | 'error';
  userInfo: {
    avatar?: string;
    display_name?: string;
  } | null;
  error?: string;
}

export class ZaloClientManager {
  /**
   * Get or create Zalo instance for a user
   */
  static async getInstance(userId: string): Promise<API | null> {
    // Check if instance already exists in memory
    if (zaloInstances.has(userId)) {
      return zaloInstances.get(userId)!;
    }

    // Try to load from database
    const session = await db.zaloSession.findFirst({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        lastUsedAt: 'desc',
      },
    });

    if (!session) {
      return null;
    }

    try {
      // Recreate Zalo instance from saved session
      const zalo = new Zalo({
        logging: false,
      });

      const api = await zalo.login({
        cookie: session.cookies as any,
        imei: session.imei,
        userAgent: session.userAgent,
        language: 'vi',
      });

      // Store in memory
      zaloInstances.set(userId, api);

      // Update last used
      await db.zaloSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      });

      return api;
    } catch (error) {
      console.error('Failed to restore Zalo session:', error);
      return null;
    }
  }

  /**
   * Start QR login process
   */
  static async startQRLogin(userId: string): Promise<string> {
    const sessionId = `qr-${userId}-${Date.now()}`;
    
    // Initialize session
    qrLoginSessions.set(sessionId, {
      qrCode: null,
      qrImage: null,
      status: 'generating',
      userInfo: null,
    });

    // Start QR login in background
    const zalo = new Zalo({
      logging: false,
    });

    const callback: LoginQRCallback = (event) => {
      const session = qrLoginSessions.get(sessionId);
      if (!session) return;

      switch (event.type) {
        case LoginQRCallbackEventType.QRCodeGenerated:
          qrLoginSessions.set(sessionId, {
            ...session,
            qrCode: event.data.code,
            qrImage: event.data.image,
            status: 'generated',
          });
          break;

        case LoginQRCallbackEventType.QRCodeExpired:
          qrLoginSessions.set(sessionId, {
            ...session,
            status: 'expired',
          });
          break;

        case LoginQRCallbackEventType.QRCodeScanned:
          qrLoginSessions.set(sessionId, {
            ...session,
            status: 'scanned',
            userInfo: {
              avatar: event.data.avatar,
              display_name: event.data.display_name,
            },
          });
          break;

        case LoginQRCallbackEventType.QRCodeDeclined:
          qrLoginSessions.set(sessionId, {
            ...session,
            status: 'declined',
          });
          break;

        case LoginQRCallbackEventType.GotLoginInfo:
          // Save session to database
          this.saveSession(userId, event.data).then(() => {
            qrLoginSessions.set(sessionId, {
              ...session,
              status: 'confirmed',
            });
          }).catch((error) => {
            console.error('Failed to save session:', error);
            qrLoginSessions.set(sessionId, {
              ...session,
              status: 'error',
              error: 'Failed to save session',
            });
          });
          break;
      }
    };

    // Start login process
    zalo.loginQR({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
      language: 'vi',
    }, callback).then(async (api) => {
      // Login successful, store instance
      zaloInstances.set(userId, api);
      
      // Setup message listener
      this.setupMessageListener(userId, api);
    }).catch((error) => {
      console.error('QR login error:', error);
      const session = qrLoginSessions.get(sessionId);
      if (session) {
        qrLoginSessions.set(sessionId, {
          ...session,
          status: 'error',
          error: error.message || 'Login failed',
        });
      }
    });

    return sessionId;
  }

  /**
   * Get QR login status
   */
  static getQRLoginStatus(sessionId: string): QRLoginSession | null {
    return qrLoginSessions.get(sessionId) || null;
  }

  /**
   * Save Zalo session to database
   */
  private static async saveSession(
    userId: string,
    loginInfo: {
      cookie: any[];
      imei: string;
      userAgent: string;
    }
  ): Promise<ZaloSession> {
    // Get user info from Zalo API
    const zalo = new Zalo({ logging: false });
    let api: API;
    let accountInfo: any;

    try {
      api = await zalo.login({
        cookie: loginInfo.cookie,
        imei: loginInfo.imei,
        userAgent: loginInfo.userAgent,
        language: 'vi',
      });

      accountInfo = await api.fetchAccountInfo();
    } catch (error) {
      console.error('Failed to login or fetch account info:', error);
      // Continue with creating session even if fetchAccountInfo fails
      accountInfo = { data: null };
    }

    // Deactivate old sessions
    await db.zaloSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    // Create new session
    const session = await db.zaloSession.create({
      data: {
        userId,
        zaloUid: accountInfo.data?.uid || null,
        zaloName: accountInfo.data?.name || null,
        zaloAvatar: accountInfo.data?.avatar || null,
        cookies: loginInfo.cookie as any,
        imei: loginInfo.imei,
        userAgent: loginInfo.userAgent,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });

    return session;
  }

  /**
   * Setup message listener for Zalo instance
   */
  private static setupMessageListener(userId: string, api: API) {
    const { listener } = api;

    listener.onMessage((message) => {
      // Emit message event (can be extended with WebSocket later)
      console.log(`[Zalo ${userId}] New message:`, message);
      // TODO: Emit via WebSocket to client
    });

    listener.onError((error) => {
      console.error(`[Zalo ${userId}] Error:`, error);
    });

    listener.onClosed(() => {
      console.log(`[Zalo ${userId}] Connection closed`);
      zaloInstances.delete(userId);
    });

    listener.start();
  }

  /**
   * Remove Zalo instance
   */
  static removeInstance(userId: string) {
    const api = zaloInstances.get(userId);
    if (api) {
      api.listener.stop();
      zaloInstances.delete(userId);
    }
  }

  /**
   * Get active instance count
   */
  static getActiveInstanceCount(): number {
    return zaloInstances.size;
  }
}

