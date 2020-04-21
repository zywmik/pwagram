var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var sharedMomentsArea = document.querySelector('#shared-moments');
const form = document.querySelector('form');
const titleInput = document.querySelector('#title');
const locationInput = document.querySelector('#location');
const videoPlayer = document.querySelector('#player');
const canvasElement = document.querySelector('#canvas');
const captureButton = document.querySelector('#capture-btn');
const imagePicker = document.querySelector('#image-picker');
const imagePickerArea = document.querySelector('#pick-image');
let picture;

function initializeMedia() {
  if (!('mediaDevices' in navigator)) {
    navigator.mediaDevices = {};
  }

  if (!('getUserMedia' in navigator.mediaDevices)) {
    navigator.mediaDevices.getUserMedia = function (constraints) {
      const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented'));
      }

      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }
  }

  navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
      videoPlayer.srcObject = stream;
      videoPlayer.style.display = 'block';
    })
    .catch(err => {
      imagePickerArea.style.display = 'block';
    });
}

captureButton.addEventListener('click', (event) => {
  canvasElement.style.display = 'block';
  videoPlayer.style.display = 'none';
  captureButton.style.display = 'none';

  const context = canvasElement.getContext('2d');
  context.drawImage(videoPlayer, 0, 0, canvas.width, videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width));
  videoPlayer.srcObject.getVideoTracks().forEach((track) => {
    track.stop();
  });
  picture = dataURItoBlob(canvasElement.toDataURL());
});

function openCreatePostModal() {
  createPostArea.style.transform = 'translateY(0)';
  initializeMedia();

  if (deferredPrompt) {
    deferredPrompt.prompt();

    deferredPrompt.userChoice.then(choiceResult => {
      console.log(choiceResult.outcome);

      if (choiceResult.outcome === 'dismissed') {
        console.log('User cancelled installation');
      } else {
        console.log('User added to home screen');
      }
    });

    deferredPrompt = null;
  }

  //* HOW TO UNREGISTER SERVICE WORKER ON DEMAND
  // if ('serviceWorker' in navigator) {
  //   navigator.serviceWorker.getRegistrations()
  //     .then(registrations => {
  //       for (registration of registrations) {
  //         registration.unregister();
  //       }
  //     })
  // }
}

function closeCreatePostModal() {
  createPostArea.style.transform = 'translateY(100vh)';
  imagePickerArea.style.display = 'none';
  videoPlayer.style.display = 'none';
  canvasElement.style.display = 'none';
  // createPostArea.style.display = 'none';
}

//Currently not in use - it allows to cache content on demand
const onSaveButtonClicked = (event) => {
  console.log('clicked');
  if ('caches' in window) {
    caches.open('user-requested')
      .then(cache => {
        cache.add('https://httpbin.org/get');
        cache.add('/src/images/sf-boat.jpg');
      })
  }
}


shareImageButton.addEventListener('click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

const clearCards = () => {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
}


function createCard(data) {
  var cardWrapper = document.createElement('div');
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
  var cardTitle = document.createElement('div');
  cardTitle.className = 'mdl-card__title';
  cardTitle.style.backgroundImage = `url(${data.image})`;
  cardTitle.style.backgroundSize = 'cover';
  cardWrapper.appendChild(cardTitle);
  var cardTitleTextElement = document.createElement('h2');
  cardTitleTextElement.style.color = 'white';
  cardTitleTextElement.className = 'mdl-card__title-text';
  cardTitleTextElement.textContent = data.title;
  cardTitle.appendChild(cardTitleTextElement);
  var cardSupportingText = document.createElement('div');
  cardSupportingText.className = 'mdl-card__supporting-text';
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = 'center';
  //* Save button, it can be used to cache the content on demand
  // var cardSaveButton = document.createElement('button');
  // cardSaveButton.textContent = 'Save';
  // cardSaveButton.addEventListener('click', onSaveButtonClicked);
  // cardSupportingText.appendChild(cardSaveButton);
  cardWrapper.appendChild(cardSupportingText);
  componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
}

function updateUI(data) {
  for (const itemData of data) {
    createCard(itemData);
  }
}

const url = 'https://pwagram-30612.firebaseio.com/posts.json';
let networkDataReceived = false;

fetch(url)
  .then(function (res) {
    return res.json();
  })
  .then(function (data) {
    console.log('From web: ', data);
    networkDataReceived = true;
    let dataArray = [];
    for (const key in data) {
      dataArray.push(data[key]);
    }
    clearCards();
    updateUI(dataArray)
  });

if ('indexedDB' in window) {
  readAllData('posts')
    .then(data => {
      if (!networkDataReceived) {
        console.log('From cache: ', data);
        updateUI(data);
      }
    });
}

function sendData() {
  const id = new Date().toISOString();
  const postData = new FormData();
  postData.append('id', id);
  postData.append('title', titleInput.value);
  postData.append('location', locationInput.value);
  postData.append('file', picture, `${id}.png`);

  fetch('https://us-central1-pwagram-30612.cloudfunctions.net/storePostData', {
    method: 'POST',
    body: postData
  })
    .then(res => {
      console.log('Sent data', res);
      updateUI();
    });
}

form.addEventListener('submit', event => {
  event.preventDefault();

  if (titleInput.value.trim() === '' || locationInput.value.trim() === '') {
    alert('Please enter valid data!');
    return;
  }

  closeCreatePostModal();
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then(sw => {
        const post = {
          id: new Date().toISOString(),
          title: titleInput.value,
          location: locationInput.value,
          picture: picture
        };
        writeData('sync-posts', post)
          .then(() => {
            return sw.sync.register('sync-new-posts');
          })
          .then(() => {
            const snackbarContainer = document.querySelector('#confirmation-toast');
            const data = { message: 'Your Post was saved for syncing!' };
            snackbarContainer.MaterialSnackbar.showSnackbar(data);
          })
          .catch(err => {
            console.log(err);
          });
      });
  } else {
    sendData();
  }
});
