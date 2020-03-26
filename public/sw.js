const CACHE_STATIC_NAME = 'static-v17';
const CACHE_DYNAMIC_NAME = 'dynamic-v4';
const STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/js/app.js',
  '/src/js/feed.js',
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
//* EXAMPLE HOW YOU CAN TRIME THE CACHE
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


//* CACHE THEN NETWORK mixed with CACHE ONLY and CACHE WITH NETWORK FALLBACK
self.addEventListener('fetch', event => {
  const url = 'https://httpbin.org/get';

  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(
      caches.open(CACHE_DYNAMIC_NAME)
        .then((cache) => {
          return fetch(event.request)
            .then((res) => {
              cache.put(event.request, res.clone());
              // trimCache(CACHE_DYNAMIC_NAME, CACHE_SIZE);
              return res;
            });
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
                    cache.put(event.request.url, res.clone());
                    // trimCache(CACHE_DYNAMIC_NAME, CACHE_SIZE);
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


//* OTHER CACHE STATEGIES
//* CACHE WITH NETWORK FALLBACK
// self.addEventListener('fetch', event => {
//   event.respondWith(
    // caches.match(event.request)
    //   .then(response => {
    //     if (response) return response;
    //     else {
    //       return fetch(event.request)
    //         .then(res => {
    //           return caches.open(CACHE_DYNAMIC_NAME)
    //             .then(cache => {
    //               cache.put(event.request.url, res.clone());
    //               return res;
    //             })
    //         })
    //         .catch(err => {
    //           return caches.open(CACHE_STATIC_NAME)
    //             .then((cache) => {
    //               return cache.match('/offline.html');
    //             })
    //         });
    //     }
    //   })
//   );
// });

//* NETWORK FIRST WITH DYNAMIC CACHING
// self.addEventListener('fetch', event => {
//   event.respondWith(
//     fetch(event.request)
//       .then(res => {
//         return caches.open(CACHE_DYNAMIC_NAME)
//           .then((cache) => {
//             cache.put(event.request.url, res.clone());
//             return res;
//           })
//       })
//       .catch(err => {
//         return caches.match(event.request);
//       })
//   );
// });

//* CACHE-ONLY STRATEGY
// self.addEventListener('fetch', event => {
//   event.respondWith(
//     caches.match(event.request)
//   );
// });

//* NETWORK-ONLY -- if you want it, don't use service workers at all 🤨
// self.addEventListener('fetch', event => {
//   event.respondWith(
//     fetch(event.request)
//   );
// });