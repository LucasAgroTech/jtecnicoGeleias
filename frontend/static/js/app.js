// Versão do app - deve corresponder à versão no service worker
const APP_VERSION = '1.1.0';

// Função para verificar se o app está sendo executado como PWA instalado
const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone || 
         document.referrer.includes('android-app://');
};

// Função para mostrar uma mensagem toast
const showToast = (message, duration = 5000, type = 'info') => {
  // Remove qualquer toast existente
  const existingToast = document.getElementById('app-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Cria um novo toast
  const toast = document.createElement('div');
  toast.id = 'app-toast';
  
  // Define o ícone com base no tipo
  let icon = '📱';
  if (type === 'offline') icon = '📴';
  if (type === 'online') icon = '🌐';
  if (type === 'error') icon = '⚠️';
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center;">
      <span style="margin-right: 10px;">${icon}</span>
      <span>${message}</span>
    </div>
  `;
  
  // Estilo baseado no tipo
  let backgroundColor = '#333';
  if (type === 'offline') backgroundColor = '#e74c3c';
  if (type === 'online') backgroundColor = '#2ecc71';
  if (type === 'error') backgroundColor = '#e67e22';
  
  toast.style.cssText = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    background-color: ${backgroundColor};
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    max-width: 90%;
    animation: fadeIn 0.3s ease-out;
  `;
  
  // Adiciona o toast ao corpo do documento
  document.body.appendChild(toast);
  
  // Remove após o tempo especificado
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s';
    setTimeout(() => toast.remove(), 500);
  }, duration);
};

// Função para verificar o status do service worker
const checkServiceWorkerStatus = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers não são suportados neste navegador');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration && (registration.active || registration.installing || registration.waiting);
  } catch (error) {
    console.error('Erro ao verificar status do Service Worker:', error);
    return false;
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('App versão:', APP_VERSION);
  console.log('Executando como PWA:', isPWA());
  
  // Verifica se o service worker está ativo
  const swActive = await checkServiceWorkerStatus();
  console.log('Service Worker ativo:', swActive);
  
  // Verifica o status da conexão
  const isOffline = !navigator.onLine;
  console.log('Status de conexão:', isOffline ? 'Offline' : 'Online');
  
  // Se estiver offline, mostra uma mensagem amigável
  if (isOffline) {
    console.log('Aplicativo iniciado em modo offline');
    
    // Atrasa um pouco para garantir que a página esteja carregada
    setTimeout(() => {
      showToast('Você está offline, mas o aplicativo está funcionando normalmente.', 5000, 'offline');
    }, 1000);
    
    // Atualiza o indicador de status
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
      statusEl.textContent = 'Offline';
      statusEl.classList.add('offline');
    }
  }
  
  // Ouve mensagens do service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_ACTIVATED') {
      console.log('Service Worker ativado, versão:', event.data.version);
      
      // Se a versão do SW for diferente da versão do app, sugere recarregar
      if (event.data.version !== APP_VERSION) {
        showToast('Nova versão disponível. Recarregue a página para atualizar.', 10000);
      }
    }
  });
  
  // Adiciona listeners para eventos de conectividade
  window.addEventListener('online', () => {
    console.log('Conexão online detectada');
    
    // Atualiza o indicador de status
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
      statusEl.textContent = 'Online';
      statusEl.classList.remove('offline');
    }
    
    // Mostra uma mensagem toast
    showToast('Você está online novamente. Suas avaliações serão sincronizadas automaticamente.', 5000, 'online');
    
    // Tenta sincronizar dados pendentes
    if (typeof syncManager !== 'undefined') {
      setTimeout(() => {
        syncManager.syncData();
      }, 2000);
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('Conexão offline detectada');
    
    // Atualiza o indicador de status
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
      statusEl.textContent = 'Offline';
      statusEl.classList.add('offline');
    }
    
    // Mostra uma mensagem toast
    showToast('Você está offline. Suas avaliações serão salvas localmente e sincronizadas quando você estiver online novamente.', 5000, 'offline');
  });
  
    // Lista de códigos CNA para geleia
    const cnaCodes = [
      'CNA-5438',
      'CNA-8454',
      'CNA-3781',
      'CNA-4797',
      'CNA-3301',
      'CNA-2837',
      'CNA-8720',
      'CNA-2677',
      'CNA-8876',
      'CNA-6645'
    ];
    
    // Registra Service Worker com múltiplas tentativas de caminhos
    if ('serviceWorker' in navigator) {
      // Lista de possíveis caminhos para o service worker
      const swPaths = [
        '/sw.js',                // Caminho absoluto da raiz
        './sw.js',               // Caminho relativo
        '../sw.js',              // Um nível acima
        '../../sw.js',           // Dois níveis acima
        '../../../sw.js',        // Três níveis acima
        window.location.pathname + 'sw.js' // Baseado no caminho atual
      ];
      
      // Função para tentar registrar com diferentes caminhos
      const tryRegisterSW = async (paths, index = 0) => {
        if (index >= paths.length) {
          console.error('Falha em todas as tentativas de registro do Service Worker');
          return;
        }
        
        try {
          const registration = await navigator.serviceWorker.register(paths[index], {
            updateViaCache: 'none' // Não usar cache para atualizações do SW
          });
          console.log('Service Worker registrado com sucesso usando:', paths[index]);
          console.log('Scope:', registration.scope);
          
          // Força a atualização do service worker
          registration.update();
          
          // Verifica se o service worker está ativo
          if (registration.active) {
            console.log('Service Worker já está ativo');
          } else {
            console.log('Aguardando ativação do Service Worker...');
          }
          
          return registration;
        } catch (error) {
          console.warn(`Falha ao registrar SW com ${paths[index]}:`, error);
          return tryRegisterSW(paths, index + 1);
        }
      };
      
      // Inicia o processo de registro
      tryRegisterSW(swPaths)
        .then(registration => {
          if (registration) {
            // Verifica se há atualizações pendentes
            registration.addEventListener('updatefound', () => {
              console.log('Nova versão do Service Worker encontrada!');
            });
          }
        });
    } else {
      console.warn('Service Workers não são suportados neste navegador. Funcionalidade offline limitada.');
    }
    
    // Inicializa o gerenciador de sincronização
    const syncManager = new SyncManager(db);
    
    // Elementos do formulário
    const form = document.getElementById('rating-form');
    const ratingButtons = document.querySelectorAll('.rating-btn');
    const ratingInput = document.getElementById('rating');
    const identifierSelect = document.getElementById('identifier');
    const commentsInput = document.getElementById('comments');
    const forceSyncButton = document.getElementById('force-sync');
    const lockToggleBtn = document.getElementById('lock-toggle');
    const unlockPanel = document.getElementById('unlock-panel');
    const unlockPasswordInput = document.getElementById('unlock-password');
    const unlockBtn = document.getElementById('unlock-btn');
    const cancelUnlockBtn = document.getElementById('cancel-unlock-btn');
    
    // Constantes
    const UNLOCK_PASSWORD = 'geleia123';
    const STORAGE_KEY_LOCKED = 'geleia_identifier_locked';
    const STORAGE_KEY_SELECTED = 'geleia_selected_code';
    const STORAGE_KEY_HEADER_IMAGE = 'geleia_header_image';
    
    // Preenche o dropdown com os códigos CNA
    function populateIdentifierDropdown() {
      cnaCodes.forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = code;
        identifierSelect.appendChild(option);
      });
      console.log('Dropdown populado com ' + cnaCodes.length + ' códigos.');
    }
    
    // Inicializa o estado de bloqueio
    function initLockState() {
      const isLocked = localStorage.getItem(STORAGE_KEY_LOCKED) === 'true';
      const selectedCode = localStorage.getItem(STORAGE_KEY_SELECTED);
      
      if (isLocked) {
        lockIdentifier();
        
        // Se tiver um código salvo, seleciona-o
        if (selectedCode) {
          identifierSelect.value = selectedCode;
        }
        console.log('Estado: Bloqueado com código ' + identifierSelect.value);
      } else {
        unlockIdentifier(false); // false = não mostrar o painel de senha
        console.log('Estado: Desbloqueado');
      }
    }
    
    // Bloqueia o identificador
    function lockIdentifier() {
      identifierSelect.disabled = true;
      lockToggleBtn.classList.add('locked');
      lockToggleBtn.classList.remove('unlocked');
      lockToggleBtn.querySelector('.lock-icon').textContent = '🔒';
      unlockPanel.classList.add('hidden');
      
      // Salva o estado e o código selecionado
      localStorage.setItem(STORAGE_KEY_LOCKED, 'true');
      localStorage.setItem(STORAGE_KEY_SELECTED, identifierSelect.value);
      
      console.log('Identificador bloqueado com o código: ' + identifierSelect.value);
    }
    
    // Desbloqueia o identificador
    function unlockIdentifier(hidePanel = true) {
      identifierSelect.disabled = false;
      lockToggleBtn.classList.remove('locked');
      lockToggleBtn.classList.add('unlocked');
      lockToggleBtn.querySelector('.lock-icon').textContent = '🔓';
      
      if (hidePanel) {
        unlockPanel.classList.add('hidden');
      }
      
      localStorage.setItem(STORAGE_KEY_LOCKED, 'false');
      
      console.log('Identificador desbloqueado');
    }
    
    // Inicializa o dropdown, o estado de bloqueio e a imagem de cabeçalho
    populateIdentifierDropdown();
    initLockState();
    initHeaderImage();
    
    // Inicializa a imagem de cabeçalho se existir
    function initHeaderImage() {
      const headerImageUrl = localStorage.getItem(STORAGE_KEY_HEADER_IMAGE);
      const headerImageContainer = document.getElementById('header-image-container');
      const headerImage = document.getElementById('header-image');
      
      if (headerImageUrl) {
        headerImage.src = headerImageUrl;
        headerImageContainer.classList.remove('hidden');
        console.log('Imagem de cabeçalho carregada: ' + headerImageUrl);
      }
    }
    
    // Função para definir uma imagem de cabeçalho (pode ser chamada via console)
    window.setHeaderImage = function(imageUrl) {
      const headerImageContainer = document.getElementById('header-image-container');
      const headerImage = document.getElementById('header-image');
      
      if (imageUrl) {
        headerImage.src = imageUrl;
        headerImageContainer.classList.remove('hidden');
        localStorage.setItem(STORAGE_KEY_HEADER_IMAGE, imageUrl);
        console.log('Imagem de cabeçalho definida: ' + imageUrl);
      } else {
        headerImageContainer.classList.add('hidden');
        localStorage.removeItem(STORAGE_KEY_HEADER_IMAGE);
        console.log('Imagem de cabeçalho removida');
      }
    };
    
    // Event listeners para o botão de bloqueio/desbloqueio
    lockToggleBtn.addEventListener('click', () => {
      const isLocked = localStorage.getItem(STORAGE_KEY_LOCKED) === 'true';
      
      if (isLocked) {
        // Mostra o painel de senha para desbloquear
        unlockPanel.classList.remove('hidden');
        unlockPasswordInput.focus();
        console.log('Painel de senha exibido');
      } else {
        // Bloqueia diretamente
        lockIdentifier();
      }
    });
    
    // Event listener para o botão de desbloquear
    unlockBtn.addEventListener('click', () => {
      const password = unlockPasswordInput.value;
      
      if (password === UNLOCK_PASSWORD) {
        unlockIdentifier();
        unlockPasswordInput.value = '';
        console.log('Senha correta, identificador desbloqueado');
      } else {
        alert('Senha incorreta!');
        console.log('Senha incorreta');
      }
    });
    
    // Event listener para o botão de cancelar desbloqueio
    cancelUnlockBtn.addEventListener('click', () => {
      unlockPanel.classList.add('hidden');
      unlockPasswordInput.value = '';
      console.log('Desbloqueio cancelado');
    });
    
    // Permite pressionar Enter no campo de senha
    unlockPasswordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        unlockBtn.click();
      }
    });
    
    // Manipula cliques nos botões de avaliação
    ratingButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove seleção anterior
        ratingButtons.forEach(btn => btn.classList.remove('selected'));
        
        // Seleciona o botão atual
        button.classList.add('selected');
        
        // Atualiza o valor oculto
        ratingInput.value = button.dataset.value;
      });
    });
    
    // Manipula envio do formulário
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      // Validação básica
      if (!identifierSelect.value || !ratingInput.value) {
        alert('Por favor, preencha o identificador e selecione uma avaliação para a geleia.');
        return;
      }
      
      // Cria objeto para salvar
      const rating = {
        identifier: identifierSelect.value,
        rating: parseInt(ratingInput.value, 10),
        comments: '' // Campo de comentários removido, mas mantido no objeto para compatibilidade
      };
      
      try {
        // Salva no banco de dados local
        await db.saveRating(rating);
        
        // Limpa formulário mantendo o código da geleia se estiver bloqueado
        const isLocked = localStorage.getItem(STORAGE_KEY_LOCKED) === 'true';
        const selectedCode = isLocked ? identifierSelect.value : '';
        
        // Limpa a seleção de avaliação
        ratingButtons.forEach(btn => btn.classList.remove('selected'));
        ratingInput.value = '';
        
        // Se não estiver bloqueado, reseta o select também
        if (!isLocked) {
          identifierSelect.value = '';
        }
        
        alert('Avaliação da geleia registrada com sucesso!');
        
      } catch (error) {
        console.error('Error saving rating:', error);
        alert('Erro ao salvar avaliação. Por favor, tente novamente.');
      }
    });
    
    // Botão para forçar sincronização
    forceSyncButton.addEventListener('click', () => {
      if (navigator.onLine) {
        syncManager.syncData();
      } else {
        alert('Você está offline. Conecte-se à Internet para sincronizar.');
      }
    });
  });
