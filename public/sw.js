// Auto-unregistration script for any old service worker on localhost:3000
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  self.registration.unregister().then(() => {
    return self.clients.matchAll();
  }).then((clients) => {
    clients.forEach((client) => {
      if (client.url && 'navigate' in client) {
        client.navigate(client.url);
      }
    });
  });
});
