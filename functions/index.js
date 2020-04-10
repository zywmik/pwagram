const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const webpush = require('web-push');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

var serviceAccount = require("./pwagram-fb-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pwagram-30612.firebaseio.com/'
})

exports.storePostData = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    admin.database().ref('posts').push({
      id: request.body.id,
      title: request.body.title,
      location: request.body.location,
      image: request.body.image
    })
      .then(() => {
        webpush.setVapidDetails(
          'mailto:mikolaj.zywczok@gmail.com',
          'BEp6PwFBsNHApxYQGUz6sBbW3OS7eDrCAm-w9IeeFfCuGBDMeo04KgB-pbWGwmrfGcxcMMkSvKPWTT_SZ08dzmI',
          'zYyveUQ7cYDHXl0fqJ8nNl3gdIc8iNbVJ-jNccKT0bU'
        );
        return admin.database().ref('subscriptions').once('value');
      })
      .then((subscriptions) => {
        subscriptions.forEach((sub) => {
          const pushConfig = {
            endpoint: sub.val().endpoint,
            keys: {
              auth: sub.val().keys.auth,
              p256dh: sub.val().keys.p256dh
            }
          };

          webpush.sendNotification(pushConfig, JSON.stringify({
            title: 'New Post',
            content: 'New post added',
            openUrl: '/help'
          }))
            .catch(err => {
              console.log(err);
            })
        })
        response.status(201).json({ message: 'Data stored', id: request.body.id });
      })
      .catch(err => {
        response.status(500).json({ error: err });
      });
  });
});
