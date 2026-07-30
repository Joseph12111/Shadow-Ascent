self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = event.notification?.data?.url || '/checklist';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (self.navigator?.clearAppBadge) {
        self.navigator.clearAppBadge().catch(() => undefined);
      }

      const matchingClient = clients.find((client) => {
        try {
          return new URL(client?.url || '').origin === self.location.origin;
        } catch {
          return false;
        }
      });

      if (matchingClient) {
        return matchingClient.focus().then(() => matchingClient.navigate(destination));
      }

      return self.clients.openWindow(destination);
    }),
  );
});
