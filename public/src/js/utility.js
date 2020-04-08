const dbPromise = idb.open('posts-store', 1, db => {
  if (!db.objectStoreNames.contains('posts')) {
    db.createObjectStore('posts', { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains('sync-posts')) {
    db.createObjectStore('sync-posts', { keyPath: 'id' });
  }
});

function writeData(st, data) {
  return dbPromise
    .then(db => {
      const tx = db.transaction(st, 'readwrite');
      const store = tx.objectStore(st);
      store.put(data);
      return tx.complete;
    });
}

function readAllData (st) {
  return dbPromise
    .then(db => {
      const tx = db.transaction(st, 'readonly');
      const store = tx.objectStore(st);
      return store.getAll();
    });
}

function clearAllData (st) {
  return dbPromise
    .then(db => {
      const tx = db.transaction(st, 'readwrite');
      const store = tx.objectStore(st);
      store.clear();
      return tx.complete;
    });
}

function deleteItemFromData (st, id) {
  return dbPromise
    .then(db => {
      const tx = db.transaction(st, 'readwrite');
      const store = tx.objectStore(st);
      store.delete(id);
      return tx.complete;
    })
    .then(() => {
      console.log('Item deleted');
    });
}