importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

const CACHE_STATIC_NAME = 'static-v34';
const CACHE_DYNAMIC_NAME = 'dynamic-v5';
const STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/js/app.js',
  '/src/js/utility.js',
  '/src/js/feed.js',
  '/src/js/idb.js',
  '/src/js/promise.js',
  '/src/js/fetch.js',
  '/src/js/material.min.js',
  '/src/css/app.css',
  '/src/css/feed.css',
  '/src/images/main-image.jpg',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
];

// const CACHE_SIZE = 6
//* EXAMPLE HOW YOU CAN TRIM THE CACHE
// const trimCache = (cacheName, maxItems) => {
//   caches.open(cacheName)
//     .then((cache) => {
//       return cache.keys()
//         .then(keys => {
//           if (keys.length > maxItems) {
//             cache.delete(keys[0])
//               .then(trimCache(cacheName, maxItems));
//           }
//         })
//     })
// }


self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...', event);
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then(cache => {
        console.log('[Service Worker] Precaching App Shell...');
        cache.addAll(STATIC_FILES);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...', event);
  event.waitUntil(
    caches.keys()
      .then(keyList => {
        return Promise.all(keyList.map(key => {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log('[Service Worker] Removing old cache...', key);
            return caches.delete(key);
          }
        }));
      })
  );
  return self.clients.claim();
});

const isInArray = (string, array) => {
  let cachePath;
  if (string.indexOf(self.origin) === 0) { // request targets domain where we serve the page from (i.e. NOT a CDN)
    cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
  } else {
    cachePath = string; // store the full request (for CDNs)
  }
  return array.indexOf(cachePath) !== -1;
}


self.addEventListener('fetch', event => {
  const url = 'https://pwagram-30612.firebaseio.com/posts';

  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(fetch(event.request)
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
  } else if (isInArray(event.request.url, STATIC_FILES)) {
    event.respondWith(caches.match(event.request));
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) return response;
          else {
            return fetch(event.request)
              .then(res => {
                return caches.open(CACHE_DYNAMIC_NAME)
                  .then(cache => {
                    // trimCache(CACHE_DYNAMIC_NAME, CACHE_SIZE);
                    cache.put(event.request.url, res.clone());
                    return res;
                  })
              })
              .catch(err => {
                return caches.open(CACHE_STATIC_NAME)
                  .then((cache) => {
                    //? TO REMEMBER:
                    //? You can also check if it's an image request and return some dummy image 🤗
                    if (event.request.headers.get('accept').includes('text/html')) {
                      return cache.match('/offline.html');
                    }
                  })
              });
          }
        })
    );
  }
});

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
