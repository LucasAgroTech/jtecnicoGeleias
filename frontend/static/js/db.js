class LocalDatabase {
    constructor() {
      this.dbPromise = this.initDatabase();
      this.isInitialized = false;
      this.initError = null;
      
      // Inicializa o banco de dados e configura flags de status
      this.dbPromise
        .then(() => {
          console.log('IndexedDB inicializado com sucesso');
          this.isInitialized = true;
        })
        .catch(error => {
          console.error('Erro ao inicializar IndexedDB:', error);
          this.initError = error;
          
          // Mostra uma mensagem de erro para o usuário
          this.showDatabaseError(error);
        });
    }
    
    // Mostra uma mensagem de erro para o usuário
    showDatabaseError(error) {
      const errorMessage = document.createElement('div');
      errorMessage.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: #f44336;
        color: white;
        padding: 15px;
        text-align: center;
        z-index: 9999;
        font-weight: bold;
      `;
      errorMessage.textContent = `Erro no banco de dados local: ${error.message || 'Erro desconhecido'}. Algumas funcionalidades podem não estar disponíveis.`;
      document.body.appendChild(errorMessage);
      
      // Remove após 10 segundos
      setTimeout(() => {
        errorMessage.style.opacity = '0';
        errorMessage.style.transition = 'opacity 0.5s';
        setTimeout(() => errorMessage.remove(), 500);
      }, 10000);
    }
    
    async initDatabase() {
      return new Promise((resolve, reject) => {
        try {
          console.log('Iniciando IndexedDB...');
          
          // Verifica se IndexedDB está disponível
          if (!window.indexedDB) {
            const error = new Error('Seu navegador não suporta IndexedDB. Funcionalidade offline limitada.');
            console.error(error);
            reject(error);
            return;
          }
          
          const request = indexedDB.open('RatingFormDB', 1);
          
          request.onerror = event => {
            const error = event.target.error;
            console.error('Erro ao abrir banco de dados:', error);
            
            // Tenta identificar erros específicos
            if (error.name === 'QuotaExceededError') {
              reject(new Error('Espaço de armazenamento insuficiente. Tente limpar o cache do navegador.'));
            } else if (error.name === 'VersionError') {
              reject(new Error('Versão do banco de dados incompatível. Tente limpar o cache do navegador.'));
            } else {
              reject(error);
            }
          };
          
          request.onblocked = event => {
            console.warn('Banco de dados bloqueado. Fechando outras conexões...');
            // Tenta fechar outras conexões
            reject(new Error('Banco de dados bloqueado. Tente fechar outras abas ou reiniciar o navegador.'));
          };
          
          request.onupgradeneeded = event => {
            console.log('Atualizando estrutura do banco de dados...');
            const db = event.target.result;
            
            // Cria store para ratings se não existir
            if (!db.objectStoreNames.contains('ratings')) {
              const store = db.createObjectStore('ratings', { keyPath: 'id', autoIncrement: true });
              store.createIndex('timestamp', 'timestamp', { unique: false });
              store.createIndex('synced', 'synced', { unique: false });
              console.log('Store "ratings" criado com sucesso');
            }
          };
          
          request.onsuccess = event => {
            const db = event.target.result;
            console.log('Banco de dados aberto com sucesso');
            
            // Configura tratamento de erros para o banco de dados
            db.onerror = event => {
              console.error('Erro de banco de dados:', event.target.error);
            };
            
            resolve(db);
          };
        } catch (error) {
          console.error('Erro inesperado ao inicializar banco de dados:', error);
          reject(error);
        }
      });
    }
    
    async saveRating(rating) {
      try {
        // Verifica se o banco de dados foi inicializado
        if (!this.isInitialized) {
          console.warn('Tentando salvar avaliação, mas o banco de dados ainda não foi inicializado');
          
          // Espera até 3 segundos pela inicialização
          for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (this.isInitialized) break;
          }
          
          // Se ainda não estiver inicializado, verifica se há erro
          if (!this.isInitialized) {
            if (this.initError) {
              throw this.initError;
            } else {
              throw new Error('Banco de dados não inicializado após espera');
            }
          }
        }
        
        const db = await this.dbPromise;
        
        return new Promise((resolve, reject) => {
          try {
            const transaction = db.transaction(['ratings'], 'readwrite');
            
            transaction.onerror = event => {
              console.error('Erro na transação:', event.target.error);
              reject(event.target.error);
            };
            
            const store = transaction.objectStore('ratings');
            
            // Adiciona timestamp e status de sincronização
            rating.timestamp = new Date().toISOString();
            rating.synced = false;
            rating.syncAttempts = 0;
            rating.deviceId = localStorage.getItem('device_id') || 'unknown';
            
            const request = store.add(rating);
            
            request.onsuccess = event => {
              console.log('Avaliação salva com sucesso, ID:', event.target.result);
              resolve(event.target.result); // Retorna o ID do registro
            };
            
            request.onerror = event => {
              console.error('Erro ao salvar avaliação:', event.target.error);
              reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
              // Dispara evento para indicar novo dado disponível para sincronização
              this.dispatchSyncEvent();
            };
          } catch (error) {
            console.error('Erro ao criar transação:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.error('Erro ao salvar avaliação:', error);
        
        // Fallback para localStorage se IndexedDB falhar
        try {
          console.log('Tentando salvar no localStorage como fallback');
          
          // Adiciona timestamp e status
          rating.timestamp = new Date().toISOString();
          rating.synced = false;
          rating.id = Date.now(); // ID único baseado no timestamp
          
          // Obtém avaliações existentes ou inicializa array vazio
          const existingRatings = JSON.parse(localStorage.getItem('offline_ratings') || '[]');
          existingRatings.push(rating);
          
          // Salva de volta no localStorage
          localStorage.setItem('offline_ratings', JSON.stringify(existingRatings));
          
          console.log('Avaliação salva com sucesso no localStorage');
          return rating.id;
        } catch (fallbackError) {
          console.error('Falha também no fallback para localStorage:', fallbackError);
          throw new Error('Não foi possível salvar a avaliação. Tente novamente mais tarde.');
        }
      }
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
