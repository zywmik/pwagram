importScripts('workbox-sw.prod.v2.1.3.js');
importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

const workboxSW = new self.WorkboxSW();

workboxSW.router.registerRoute(
  /.*(?:googleapis|gstatic)\.com.*$/,
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: 'google-fonts',
    cacheExpiration: {
      maxEntries: 3,
      maxAgeSeconds: 60 * 60 * 24 * 30
    }
  })
);

workboxSW.router.registerRoute(
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css',
  workboxSW.strategies.staleWhileRevalidate({ cacheName: 'material-css' })
);

workboxSW.router.registerRoute(
  /.*(?:firebasestorage\.googleapis)\.com.*$/,
  workboxSW.strategies.staleWhileRevalidate({ cacheName: 'post-images' })
);

workboxSW.router.registerRoute(
  'https://pwagram-30612.firebaseio.com/posts.json',
  (args) => fetch(args.event.request)
    .then(res => {
      const clonedRes = res.clone();
      clearAllData('posts')
        .then(() => {
          clonedRes.json()
        })
        .then(data => {
          for (const key in data) {
            writeData('posts', data[key]);
          }
        });
      return res;
    })
);

workboxSW.router.registerRoute(
  (routeData) => (routeData.event.request.headers.get('accept').includes('text/html')),
  (args) => caches.match(args.event.request)
    .then(response => {
      if (response) return response;
      else {
        return fetch(args.event.request)
          .then(res => {
            return caches.open('dynamic')
              .then(cache => {
                cache.put(args.event.request.url, res.clone());
                return res;
              })
          })
          .catch(err => {
            return caches.match('/offline.html')
              .then((res) =>  res)
          });
      }
    })
);

workboxSW.precache([
  {
    "url": "favicon.ico",
    "revision": "2cab47d9e04d664d93c8d91aec59e812"
  },
  {
    "url": "index.html",
    "revision": "bcda52b923699db28f91989c27e94b31"
  },
  {
    "url": "manifest.json",
    "revision": "8dc17b796050aed414d3225d3d06b854"
  },
  {
    "url": "offline.html",
    "revision": "c68052bd774407d03e67191b57c1ba4e"
  },
  {
    "url": "src/css/app.css",
    "revision": "f27b4d5a6a99f7b6ed6d06f6583b73fa"
  },
  {
    "url": "src/css/feed.css",
    "revision": "cfe69897c67b0b75c6eff10d8db77ec7"
  },
  {
    "url": "src/css/help.css",
    "revision": "1c6d81b27c9d423bece9869b07a7bd73"
  },
  {
    "url": "src/images/main-image-lg.jpg",
    "revision": "31b19bffae4ea13ca0f2178ddb639403"
  },
  {
    "url": "src/images/main-image-sm.jpg",
    "revision": "c6bb733c2f39c60e3c139f814d2d14bb"
  },
  {
    "url": "src/images/main-image.jpg",
    "revision": "5c66d091b0dc200e8e89e56c589821fb"
  },
  {
    "url": "src/images/sf-boat.jpg",
    "revision": "0f282d64b0fb306daf12050e812d6a19"
  },
  {
    "url": "src/build/js/app.min.js",
    "revision": "481119bb36ad2be06d688314e0167d10"
  },
  {
    "url": "src/build/js/feed.min.js",
    "revision": "dbded435780ebc647dc5609f7e68a229"
  },
  {
    "url": "src/build/js/fetch.min.js",
    "revision": "013b0353d4377c7dccdd387c87befadc"
  },
  {
    "url": "src/build/js/idb.min.js",
    "revision": "88ae80318659221e372dd0d1da3ecf9a"
  },
  {
    "url": "src/build/js/material.min.js",
    "revision": "199ea046e2c9eccc0ef67c6893171277"
  },
  {
    "url": "src/build/js/promise.min.js",
    "revision": "487dd23083158597d263dc385933665c"
  },
  {
    "url": "src/build/js/utility.min.js",
    "revision": "36c371365eb187125cdc9218d0c73cf0"
  }
]);

self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background syncing', event);
  if (event.tag === 'sync-new-posts') {
    console.log('[Service Worker] Syncing new Posts')
    event.waitUntil(
      readAllData('sync-posts')
        .then(data => {
          for (const dt of data) {
            const postData = new FormData();
            postData.append('id', dt.id);
            postData.append('title', dt.title);
            postData.append('location', dt.location);
            postData.append('rawLocationLat', dt.rawLocation.lat);
            postData.append('rawLocationLng', dt.rawLocation.lng);
            postData.append('file', dt.picture, `${dt.id}.png`);

            fetch('https://us-central1-pwagram-30612.cloudfunctions.net/storePostData', {
              method: 'POST',
              body: postData
            })
              .then(res => {
                console.log('Sent data', res);
                if (res.ok) {
                  res.json()
                    .then(resData => {
                      deleteItemFromData('sync-posts', resData.id);
                    })
                }
              })
              .catch((err) => {
                console.log('Error while sending data', err);
              });
          }
        })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  const { notification, action } = event;
  console.log(notification);

  if (action === 'confirm') {
    console.log('Confirm was chosen');
    notification.close();
  } else {
    event.waitUntil(
      clients.matchAll()
        .then((clients) => {
          const client = clients.find((c) => c.visibilityState === 'visible');

          if (client !== undefined) {
            client.navigate(notification.data.url);
            client.focus();
          } else {
            client.openWindow(notification.data.url);
          }
          notification.close();
        })
    );
  }
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification was closed', event);
});

self.addEventListener('push', (event) => {
  console.log('Push Notification received', event);

  let data = {title: 'New!', content: 'Something new have happened!', openUrl: '/'};
  if (event.data) {
    data = JSON.parse(event.data.text());
  }

  const options = {
    body: data.content,
    icon: '/src/images/icons/app-icon-96x96.png',
    badge: '/src/images/icons/app-icon-96x96.png',
    data: {
      url: data.openUrl
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
