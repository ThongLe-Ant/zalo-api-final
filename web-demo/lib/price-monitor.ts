/**
 * Price Monitor Service
 * Service để tự động check giá định kỳ
 * 
 * Note: Trong Next.js, background jobs nên được chạy qua:
 * - External cron service (cron-job.org, EasyCron, etc.)
 * - Server-side API route được gọi định kỳ
 * - Hoặc sử dụng node-cron trong server component (không khuyến nghị cho production)
 */

export interface MonitorConfig {
  sessionId: string;
  interval?: number; // milliseconds, default: 5 minutes
  enabled?: boolean;
}

/**
 * Start monitoring price changes
 * This should be called from an API route or external cron service
 */
export async function startPriceMonitor(config: MonitorConfig) {
  const { sessionId, interval = 5 * 60 * 1000 } = config; // Default: 5 minutes

  if (!config.enabled) {
    return;
  }

  // This is a placeholder - actual monitoring should be done via:
  // 1. External cron service calling /api/price/monitor?sessionId=xxx
  // 2. Or using node-cron in a server component (not recommended)
  
  console.log(`Price monitor started for session: ${sessionId}, interval: ${interval}ms`);
}

/**
 * Stop monitoring
 */
export function stopPriceMonitor() {
  console.log('Price monitor stopped');
}

