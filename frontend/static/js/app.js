document.addEventListener('DOMContentLoaded', () => {
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
    
    // Registra Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('../../../sw.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
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
