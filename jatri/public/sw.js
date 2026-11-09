// Service Worker for RideNow / Jaatri Web Push Notifications

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {
    title: "Jaatri Notification",
    body: "You have an update on your ride.",
    url: "/",
    tag: "jaatri-notification",
  };

  try {
    payload = event.data.json();
  } catch (err) {
    payload.body = event.data.text();
  }

  const options = {
    body: payload.body,
    icon: payload.icon || "/logojatri.png",
    badge: payload.badge || "/logojatri.png",
    tag: payload.tag || "jaatri-ride-update",
    renotify: true,
    data: {
      url: payload.url || "/",
      timestamp: Date.now(),
    },
    vibrate: [200, 100, 200],
    actions: payload.actions || [
      { action: "open", title: "View Details" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "Jaatri (যাত্ৰী)", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetPath = (event.notification.data && event.notification.data.url) || "/";
  const fullTargetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // 1. If an exact tab matches the target URL, focus it
      for (const client of clientList) {
        if ("focus" in client && client.url === fullTargetUrl) {
          return client.focus();
        }
      }
      // 2. If a tab is open on this origin, navigate it to target URL and focus
      for (const client of clientList) {
        if ("focus" in client && "navigate" in client && client.url.startsWith(self.location.origin)) {
          return client.navigate(fullTargetUrl).then((focusedClient) => (focusedClient ? focusedClient.focus() : client.focus()));
        }
      }
      // 3. Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullTargetUrl);
      }
    })
  );
});
