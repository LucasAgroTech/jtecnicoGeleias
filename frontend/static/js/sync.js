class SyncManager {
    constructor(db) {
      this.db = db;
      this.serverUrl = '/api/ratings';
      this.isSyncing = false;
      this.lastSyncTime = null;
      this.syncQueue = [];
      this.maxRetries = 5;
      
      // Ouve eventos de conectividade
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.updateConnectionStatus());
      
      // Ouve mensagens do Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data && event.data.type === 'SYNC_INITIATED') {
            this.syncData();
          }
        });
      }
      
      // Ouve eventos de novos dados para sincronização
      window.addEventListener('newDataToSync', () => {
        this.updateSyncStatus();
        if (navigator.onLine) {
          this.syncData();
        }
      });
      
      // Inicializa o status
      this.updateConnectionStatus();
      this.updateSyncStatus();
    }
    
    updateConnectionStatus() {
      const statusEl = document.getElementById('connection-status');
      if (navigator.onLine) {
        statusEl.textContent = 'Online';
        statusEl.classList.remove('offline');
      } else {
        statusEl.textContent = 'Offline';
        statusEl.classList.add('offline');
      }
    }
    
    async updateSyncStatus() {
      const pendingCount = await this.db.getUnsyncedCount();
      document.getElementById('pending-count').textContent = pendingCount;
      
      if (this.lastSyncTime) {
        document.getElementById('last-sync').textContent = new Date(this.lastSyncTime).toLocaleString();
      }
    }
    
    handleOnline() {
      this.updateConnectionStatus();
      
      // Tenta sincronizar quando ficar online
      setTimeout(() => {
        this.syncData();
      }, 1000); // Pequeno atraso para garantir que a conexão está estável
      
      // Notifica o usuário que está online novamente
      this.showToast('Você está online novamente. Sincronizando dados...');
    }
    
    // Mostra uma mensagem toast temporária
    showToast(message) {
      // Verifica se já existe um toast e remove
      const existingToast = document.getElementById('sync-toast');
      if (existingToast) {
        existingToast.remove();
      }
      
      // Cria um novo elemento toast
      const toast = document.createElement('div');
      toast.id = 'sync-toast';
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #333;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      `;
      
      document.body.appendChild(toast);
      
      // Remove após 3 segundos
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
      }, 3000);
    }
    
    async syncData() {
      if (this.isSyncing || !navigator.onLine) {
        return;
      }
      
      this.isSyncing = true;
      const syncStartTime = new Date();
      
      try {
        const unsynced = await this.db.getUnsynced();
        
        if (unsynced.length === 0) {
          this.isSyncing = false;
          return;
        }
        
        console.log(`[Sync] Starting sync of ${unsynced.length} items`);
        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;
        
        // Atualiza o status visual para indicar sincronização em andamento
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
          statusEl.textContent = 'Sincronizando...';
          statusEl.classList.add('syncing');
        }
        
        for (const rating of unsynced) {
          try {
            // Verifica se já excedeu o número máximo de tentativas
            if (rating.syncAttempts >= this.maxRetries) {
              console.warn(`[Sync] Rating ${rating.id} exceeded maximum retry attempts (${this.maxRetries})`);
              skipCount++;
              continue;
            }
            
            await this.sendToServer(rating);
            await this.db.markAsSynced(rating.id);
            successCount++;
            
          } catch (error) {
            // Ignora erros de backoff (não são falhas reais, apenas adiamentos)
            if (error.message === 'Backoff time not elapsed') {
              skipCount++;
              continue;
            }
            
            console.error(`[Sync] Failed to sync rating ${rating.id}:`, error);
            failCount++;
            
            // Incrementa contador de tentativas
            const attempts = await this.db.incrementSyncAttempt(rating.id);
            
            // Log detalhado do progresso de tentativas
            console.log(`[Sync] Rating ${rating.id} - Attempt ${attempts}/${this.maxRetries}`);
          }
        }
        
        this.lastSyncTime = new Date().toISOString();
        const syncDuration = (new Date() - syncStartTime) / 1000;
        
        console.log(`[Sync] Completed in ${syncDuration.toFixed(1)}s - Success: ${successCount}, Failed: ${failCount}, Skipped: ${skipCount}`);
        
        // Restaura o status de conexão normal
        this.updateConnectionStatus();
        this.updateSyncStatus();
        
      } catch (error) {
        console.error('Sync error:', error);
      } finally {
        this.isSyncing = false;
      }
    }
    
    async sendToServer(rating) {
      // Remover propriedades de controle interno antes de enviar
      const payload = { ...rating };
      delete payload.synced;
      delete payload.syncAttempts;
      delete payload.lastSyncAttempt;
      
      // Implementa exponential backoff baseado no número de tentativas
      const attempts = rating.syncAttempts || 0;
      if (attempts > 0) {
        // Calcula tempo de espera com backoff exponencial (30s, 1min, 2min, 4min, 8min)
        const backoffTime = Math.min(30000 * Math.pow(2, attempts - 1), 8 * 60 * 1000);
        const lastAttempt = rating.lastSyncAttempt ? new Date(rating.lastSyncAttempt) : new Date(0);
        const timeSinceLastAttempt = Date.now() - lastAttempt.getTime();
        
        // Se não passou tempo suficiente desde a última tentativa, pula
        if (timeSinceLastAttempt < backoffTime) {
          console.log(`Skipping sync for rating ${rating.id} - next attempt in ${Math.round((backoffTime - timeSinceLastAttempt)/1000)}s`);
          throw new Error('Backoff time not elapsed');
        }
      }
      
      try {
        const response = await fetch(this.serverUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-ID': this.getDeviceId(), // Ajuda a identificar o tablet
            'X-Tablet-Number': this.getTabletNumber() // Número específico do tablet (1-12)
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
      } catch (error) {
        console.error(`Sync attempt ${attempts + 1} failed for rating ${rating.id}:`, error);
        throw error;
      }
    }
    
    getTabletNumber() {
      // Recupera o número do tablet (1-12) ou usa 0 se não estiver definido
      return localStorage.getItem('tablet_number') || '0';
    }
    
    getDeviceId() {
      // Gera um ID único para o dispositivo ou recupera um existente
      let deviceId = localStorage.getItem('device_id');
      
      if (!deviceId) {
        deviceId = 'tablet_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('device_id', deviceId);
      }
      
      return deviceId;
    }
  }
