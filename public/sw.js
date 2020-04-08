importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

const CACHE_STATIC_NAME = 'static-v26';
const CACHE_DYNAMIC_NAME = 'dynamic-v4';
const STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/js/app.js',
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
            fetch('https://pwagram-30612.firebaseio.com/posts.json', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                id: dt.id,
                title: dt.title,
                location: dt.location,
                image: 'https://firebasestorage.googleapis.com/v0/b/pwagram-30612.appspot.com/o/sf-boat.jpg?alt=media&token=ff9f3c98-df9c-4a35-952f-a59ae79c9cac'
              })
            })
              .then(res => {
                console.log('Sent data', res);
                if (res.ok) {
                  deleteItemFromData('sync-posts', dt.id);
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
