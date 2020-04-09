var deferredPrompt;
const enableNotificationsButtons = document.querySelectorAll('.enable-notifications');

if (!window.Promise) {
  window.Promise = Promise;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => {
      console.log('Service worker registered!');
    });
}

window.addEventListener('beforeinstallprompt', event => {
  console.log('beforeinstallprompt fired');
  event.preventDefault();
  deferredPrompt = event;
  return false;
});

function displayConfirmNotification() {
  if ('serviceWorker' in navigator) {
    let options = {
      body: 'You successfully subscribed to our PWAGram notification service',
      icon: '/src/images/icons/app-icon-96x96.png',
      image: '/src/images/sw-boat.jpg',
      dir: 'ltr',
      lang: 'en-US', // BCP 47
      vibrate: [100, 50, 200],
      badge: '/src/images/icons/app-icon-96x96.png',
      tag: 'confirm-notification',
      renotify: true
    };
    navigator.serviceWorker.ready
      .then((swreg) => {
        swreg.showNotification('Successfully subscribed (from SW)!', options);
      })
  }
}

function askForNotificationPermission() {
  Notification.requestPermission(result => {
    console.log('User Choice', result);
    if (result !== 'granted') {
      console.log('No notification permission granted!');
    } else {
      displayConfirmNotification();
    }
  });
}

if ('Notification' in window) {
  enableNotificationsButtons.forEach(button => {
    button.style.display = 'inline-block';
    button.addEventListener('click', askForNotificationPermission);
  })
}
