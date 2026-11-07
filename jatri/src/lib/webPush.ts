import webpush from "web-push";
import PushSubscription from "@/models/push-subscription.model";
import connectDb from "./db";

// Valid, mathematically paired VAPID keys (P-256 curve)
// In production, these should be set in .env as NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
const DEFAULT_VAPID_PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BHVOwkeKGyETrHB2VANtTJo-Aku04s5rXTIEqje74vC6Oq2oIcaznbmffvfS-Up6OXa-N0x3L9RX1SMOjN4JGww";

const DEFAULT_VAPID_PRIVATE =
  process.env.VAPID_PRIVATE_KEY || "GGfIxmoONdINqQU0F9YrLgNU98oYXApcICNdiYX0_VI";

const DEFAULT_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@ridenow.in";

let vapidConfigured = false;

function ensureVapidConfig() {
  if (!vapidConfigured) {
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC;
      const privateKey = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE;
      const subject = process.env.VAPID_SUBJECT || DEFAULT_SUBJECT;

      if (!process.env.VAPID_PRIVATE_KEY && process.env.NODE_ENV === "production") {
        console.warn("[SECURITY NOTICE] VAPID_PRIVATE_KEY not set in production env. Using default key pair. Please configure VAPID_PRIVATE_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY in your hosting dashboard.");
      }

      webpush.setVapidDetails(subject, publicKey, privateKey);
      vapidConfigured = true;
    } catch (err) {
      console.error("Failed to configure VAPID details for Web Push:", err);
    }
  }
}

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  actions?: Array<{ action: string; title: string }>;
}

/**
 * Send push notification to a specific user across all their registered active devices
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  try {
    ensureVapidConfig();
    await connectDb();

    const subscriptions = await PushSubscription.find({
      user: userId,
      isActive: true,
    });

    if (!subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const payloadString = JSON.stringify({
      title: payload.title || "RideNow Update",
      body: payload.body || "",
      url: payload.url || "/",
      tag: payload.tag || "ridenow-notification",
      icon: payload.icon || "/logo.webp",
      badge: payload.badge || "/logo.webp",
      actions: payload.actions,
    });

    let sent = 0;
    let failed = 0;

    const pushPromises = subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };

      try {
        await webpush.sendNotification(pushConfig, payloadString);
        sent++;
      } catch (error: any) {
        failed++;
        // If subscription is expired or unsubscribed (404 or 410 Gone), deactivate it
        if (error.statusCode === 404 || error.statusCode === 410) {
          sub.isActive = false;
          await sub.save().catch(() => {});
        } else {
          console.warn("Error sending web push to endpoint:", error.message || error);
        }
      }
    });

    await Promise.all(pushPromises);
    return { sent, failed };
  } catch (error) {
    console.error("sendPushToUser general error:", error);
    return { sent: 0, failed: 0 };
  }
}
