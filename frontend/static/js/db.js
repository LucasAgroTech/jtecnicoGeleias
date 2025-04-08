class LocalDatabase {
    constructor() {
      this.dbPromise = this.initDatabase();
    }
    
    async initDatabase() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('RatingFormDB', 1);
        
        request.onerror = event => {
          console.error('Database error:', event.target.error);
          reject(event.target.error);
        };
        
        request.onupgradeneeded = event => {
          const db = event.target.result;
          
          // Cria store para ratings se não existir
          if (!db.objectStoreNames.contains('ratings')) {
            const store = db.createObjectStore('ratings', { keyPath: 'id', autoIncrement: true });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('synced', 'synced', { unique: false });
          }
        };
        
        request.onsuccess = event => {
          resolve(event.target.result);
        };
      });
    }
    
    async saveRating(rating) {
      const db = await this.dbPromise;
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['ratings'], 'readwrite');
        const store = transaction.objectStore('ratings');
        
        // Adiciona timestamp e status de sincronização
        rating.timestamp = new Date().toISOString();
        rating.synced = false;
        rating.syncAttempts = 0;
        
        const request = store.add(rating);
        
        request.onsuccess = event => {
          resolve(event.target.result); // Retorna o ID do registro
        };
        
        request.onerror = event => {
          console.error('Error saving rating:', event.target.error);
          reject(event.target.error);
        };
        
        transaction.oncomplete = () => {
          // Dispara evento para indicar novo dado disponível para sincronização
          this.dispatchSyncEvent();
        };
      });
    }
    
    async getUnsynced() {
      const db = await this.dbPromise;
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['ratings'], 'readonly');
        const store = transaction.objectStore('ratings');
        const index = store.index('synced');
        const request = index.getAll(IDBKeyRange.only(false));
        
        request.onsuccess = event => {
          resolve(event.target.result);
        };
        
        request.onerror = event => {
          console.error('Error getting unsynced ratings:', event.target.error);
          reject(event.target.error);
        };
      });
    }
    
    async markAsSynced(id) {
      const db = await this.dbPromise;
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['ratings'], 'readwrite');
        const store = transaction.objectStore('ratings');
        const request = store.get(id);
        
        request.onsuccess = event => {
          const rating = event.target.result;
          if (rating) {
            rating.synced = true;
            rating.syncedAt = new Date().toISOString();
            
            const updateRequest = store.put(rating);
            
            updateRequest.onsuccess = () => {
              resolve(true);
            };
            
            updateRequest.onerror = event => {
              console.error('Error updating synced status:', event.target.error);
              reject(event.target.error);
            };
          } else {
            reject(new Error('Rating not found'));
          }
        };
        
        request.onerror = event => {
          console.error('Error getting rating:', event.target.error);
          reject(event.target.error);
        };
      });
    }
  
    async incrementSyncAttempt(id) {
      const db = await this.dbPromise;
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['ratings'], 'readwrite');
        const store = transaction.objectStore('ratings');
        const request = store.get(id);
        
        request.onsuccess = event => {
          const rating = event.target.result;
          if (rating) {
            rating.syncAttempts += 1;
            rating.lastSyncAttempt = new Date().toISOString();
            
            const updateRequest = store.put(rating);
            
            updateRequest.onsuccess = () => {
              resolve(rating.syncAttempts);
            };
            
            updateRequest.onerror = event => {
              console.error('Error updating sync attempts:', event.target.error);
              reject(event.target.error);
            };
          } else {
            reject(new Error('Rating not found'));
          }
        };
        
        request.onerror = event => {
          console.error('Error getting rating:', event.target.error);
          reject(event.target.error);
        };
      });
    }
    
    async getUnsyncedCount() {
      const unsynced = await this.getUnsynced();
      return unsynced.length;
    }
    
    dispatchSyncEvent() {
      // Registra para sincronização em background quando houver conexão
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
          registration.sync.register('sync-ratings')
            .catch(err => {
              console.error('Background sync registration failed:', err);
            });
        });
      }
      
      // Emite evento para notificar a aplicação
      const event = new CustomEvent('newDataToSync');
      window.dispatchEvent(event);
    }
  }
  
  // Inicializa o banco de dados
  const db = new LocalDatabase();