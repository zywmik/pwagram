"use strict";

var deferredPrompt;
var enableNotificationsButtons = document.querySelectorAll('.enable-notifications');

if (!window.Promise) {
  window.Promise = Promise;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then(function () {
    console.log('Service worker registered!');
  });
}

window.addEventListener('beforeinstallprompt', function (event) {
  console.log('beforeinstallprompt fired');
  event.preventDefault();
  deferredPrompt = event;
  return false;
});

function displayConfirmNotification() {
  if ('serviceWorker' in navigator) {
    var options = {
      body: 'You successfully subscribed to our PWAGram notification service',
      icon: '/src/images/icons/app-icon-96x96.png',
      image: '/src/images/sf-boat.jpg',
      dir: 'ltr',
      lang: 'en-US',
      // BCP 47
      vibrate: [100, 50, 200],
      badge: '/src/images/icons/app-icon-96x96.png',
      tag: 'confirm-notification',
      renotify: true,
      actions: [{
        action: 'confirm',
        title: 'Okay',
        icon: '/src/images/icons/app-icon-96x96.png'
      }, {
        action: 'cancel',
        title: 'Cancel',
        icon: '/src/images/icons/app-icon-96x96.png'
      }]
    };
    navigator.serviceWorker.ready.then(function (swreg) {
      swreg.showNotification('Successfully subscribed (from SW)!', options);
    });
  }
}

function configurePushSub() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  var reg;
  navigator.serviceWorker.ready.then(function (swreg) {
    reg = swreg;
    return swreg.pushManager.getSubscription();
  }).then(function (sub) {
    if (sub === null) {
      // Create a new subscription
      var vapidPublicKey = 'BEp6PwFBsNHApxYQGUz6sBbW3OS7eDrCAm-w9IeeFfCuGBDMeo04KgB-pbWGwmrfGcxcMMkSvKPWTT_SZ08dzmI';
      var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);
      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidPublicKey
      });
    } else {// We have a subscription
    }
  }).then(function (newSub) {
    return fetch('https://pwagram-30612.firebaseio.com/subscriptions.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(newSub)
    });
  }).then(function (res) {
    if (res.ok) displayConfirmNotification();
  })["catch"](function (err) {
    console.log(err);
  });
}

function askForNotificationPermission() {
  Notification.requestPermission(function (result) {
    console.log('User Choice', result);

    if (result !== 'granted') {
      console.log('No notification permission granted!');
    } else {
      configurePushSub(); // displayConfirmNotification();
    }
  });
}

if ('Notification' in window && 'serviceWorker' in navigator) {
  enableNotificationsButtons.forEach(function (button) {
    button.style.display = 'inline-block';
    button.addEventListener('click', askForNotificationPermission);
  });
}