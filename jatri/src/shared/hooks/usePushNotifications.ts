"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported] = useState(
    () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
  );
  const [permission, setPermission] = useState<NotificationPermission>(
    () => (typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default")
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Synchronize browser subscription with MongoDB backend
  const syncSubscriptionStatus = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();

      if (!sub) {
        setIsSubscribed(false);
        return;
      }

      // Check with backend if this user owns this subscription
      const res = await axios.get(`/api/notifications/status?endpoint=${encodeURIComponent(sub.endpoint)}`);

      if (res.data.authenticated) {
        if (res.data.isSubscribed) {
          setIsSubscribed(true);
        } else {
          // Browser has subscription but backend doesn't have it for this user (e.g. after fresh login)
          // Automatically sync it
          try {
            await axios.post("/api/notifications/subscribe", {
              subscription: sub.toJSON(),
            });
            setIsSubscribed(true);
          } catch {
            setIsSubscribed(false);
          }
        }
      } else {
        // Not authenticated
        setIsSubscribed(false);
      }
    } catch (err) {
      console.warn("Failed to synchronize push subscription status:", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          syncSubscriptionStatus();
        })
        .catch((err) => {
          console.warn("ServiceWorker registration notice:", err);
        });
    }
  }, [syncSubscriptionStatus]);

  const subscribe = async () => {
    if (!isSupported) return false;
    try {
      setLoading(true);

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      // 1. Get VAPID public key
      const keyRes = await axios.get("/api/notifications/vapid-key");
      const publicKey = keyRes.data.publicKey;

      if (!publicKey) {
        throw new Error("Missing VAPID public key from server");
      }

      // 2. Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Check if applicationServerKey matches target publicKey
        try {
          const subKey = subscription.options.applicationServerKey;
          const targetKey = urlBase64ToUint8Array(publicKey);
          if (subKey && new Uint8Array(subKey).toString() !== targetKey.toString()) {
            await subscription.unsubscribe();
            subscription = null;
          }
        } catch {
          // Continue with existing if comparison fails
        }
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      // 3. Send subscription to server
      const subRes = await axios.post("/api/notifications/subscribe", {
        subscription: subscription.toJSON(),
      });

      if (subRes.data.success) {
        setIsSubscribed(true);
        setLoading(false);
        return true;
      }

      setLoading(false);
      return false;
    } catch (err: any) {
      console.error("Failed to subscribe to push notifications:", err);
      setLoading(false);
      return false;
    }
  };

  const unsubscribe = async () => {
    if (!isSupported) return false;
    try {
      setLoading(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await axios.post("/api/notifications/unsubscribe", {
          endpoint: subscription.endpoint,
        });
      }

      setIsSubscribed(false);
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Failed to unsubscribe from push notifications:", err);
      setLoading(false);
      return false;
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    syncSubscriptionStatus,
  };
}
