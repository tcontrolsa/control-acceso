/**
 * MÓDULO GUARDIA - Control de Acceso y Validación de Visitantes
 * Gestiona lectura de códigos QR, ingreso manual de PIN y visualización del historial filtrable.
 */

// ==================== VARIABLES GLOBALES ====================
let html5QrCode;
let isLoggedIn = false;
let currentActiveTab = 'controlTab';
let currentVisitData = null;
let editCompanionsList = [];
let collaboratorsList = [];

const elements = {
  loginSection: document.getElementById('loginSection'),
  mainSection: document.getElementById('mainSection'),
  passwordInput: document.getElementById('password'),
  loginBtn: document.getElementById('loginBtn'),
  pinForm: document.getElementById('pinForm'),
  pinInput: document.getElementById('pinInput'),
  pinSubmitBtn: document.getElementById('pinSubmitBtn'),
  newScanBtn: document.getElementById('newScanBtn'),
  refreshHistoryBtn: document.getElementById('refreshHistoryBtn'),
  historyDateFilter: document.getElementById('historyDateFilter'),
  qrReader: document.getElementById('qr-reader'),
  resultCard: document.getElementById('resultCard'),
  resultBadge: document.getElementById('resultBadge'),
  resultTitle: document.getElementById('resultTitle'),
  visitInfo: document.getElementById('visitInfo'),
  hostInfo: document.getElementById('hostInfo'),
  hostPhoto: document.getElementById('hostPhoto'),
  hostName: document.getElementById('hostName'),
  historyList: document.getElementById('historyList'),
  
  // New components for Edit Visit CRUD
  editVisitBtn: document.getElementById('editVisitBtn'),
  editVisitModal: document.getElementById('editVisitModal'),
  editVisitForm: document.getElementById('editVisitForm'),
  editVisitId: document.getElementById('editVisitId'),
  editCedula: document.getElementById('editCedula'),
  editPlaca: document.getElementById('editPlaca'),
  editCompanionsChips: document.getElementById('editCompanionsChips'),
  editCompanionInput: document.getElementById('editCompanionInput'),
  editAddCompanionBtn: document.getElementById('editAddCompanionBtn'),
  closeEditModalBtn: document.getElementById('closeEditModalBtn'),
  saveEditBtn: document.getElementById('saveEditBtn')
};

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
  VisitasUtils.registerServiceWorker('sw.js');
  
  // Establecer fecha de hoy por defecto en el filtro (formato local)
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const dd = String(hoy.getDate()).padStart(2, '0');
  elements.historyDateFilter.value = `${yyyy}-${mm}-${dd}`;

  setupEventListeners();
  inicializarTema();
  inicializarEdicionModal();
  cargarColaboradores();
});

/**
 * Inicializa y persiste el tema claro/oscuro
 */
function inicializarTema() {
  const themeBtn = document.getElementById('themeToggleBtn');
  if (!themeBtn) return;

  const currentTheme = localStorage.getItem('theme') || 'dark';
  if (currentTheme === 'light') {
    document.body.classList.add('light-mode');
    themeBtn.textContent = '☀️';
  } else {
    document.body.classList.remove('light-mode');
    themeBtn.textContent = '🌙';
  }

  themeBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    themeBtn.textContent = isLight ? '☀️' : '🌙';
  });
}

/**
 * Inicializa los eventos del modal de edición
 */
function inicializarEdicionModal() {
  if (!elements.editVisitModal) return;

  // Cerrar modal
  elements.closeEditModalBtn.onclick = () => {
    elements.editVisitModal.style.display = 'none';
  };

  // Agregar acompañante
  elements.editAddCompanionBtn.onclick = () => {
    const name = elements.editCompanionInput.value.trim();
    if (name && !editCompanionsList.includes(name)) {
      editCompanionsList.push(name);
      elements.editCompanionInput.value = '';
      renderEditCompanionChips();
    }
  };

  // Detectar Enter en input de acompañante
  elements.editCompanionInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      elements.editAddCompanionBtn.click();
    }
  };

  // Guardar cambios
  elements.editVisitForm.onsubmit = handleSaveEdit;
}

/**
 * Obtiene la lista de colaboradores desde el backend y llena el dropdown
 */
async function cargarColaboradores() {
  try {
    const response = await VisitasUtils.apiCall('GET', {
      accion: 'listaColaboradores'
    });

    if (response.success && response.data) {
      collaboratorsList = response.data;
      inicializarCustomSelect();
    } else {
      throw new Error(response.error || 'Error al obtener datos');
    }
  } catch (error) {
    console.error('Error cargando colaboradores:', error);
    const optionsContainer = document.getElementById('editPersonaOptions');
    if (optionsContainer) {
      optionsContainer.innerHTML = '<div style="color:var(--primary); padding:10px; font-size:13px; text-align:center;">⚠️ Error al cargar colaboradores</div>';
    }
  }
}

/**
 * Inicializa el componente de autocompletado y selección de colaboradores
 */
function inicializarCustomSelect() {
  const trigger = document.getElementById('editPersonaTrigger');
  const dropdown = document.getElementById('editPersonaDropdown');
  const searchInput = document.getElementById('editPersonaSearch');
  const optionsContainer = document.getElementById('editPersonaOptions');
  const hiddenInput = document.getElementById('editPersonaVisita');
  const triggerImg = document.getElementById('editPersonaImg');
  const triggerLabel = document.getElementById('editPersonaLabel');

  if (!trigger || !dropdown || !optionsContainer || !hiddenInput) return;

  // Renderizar las opciones
  function renderOptions(filter = '') {
    optionsContainer.innerHTML = '';
    const filtered = collaboratorsList.filter(c => 
      c.nombre.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
      optionsContainer.innerHTML = '<div style="color:var(--text-muted); padding:10px; font-size:13px; text-align:center;">No se encontraron resultados</div>';
      return;
    }

    filtered.forEach(colab => {
      const option = document.createElement('div');
      option.className = 'custom-select-option';
      option.dataset.value = colab.nombre;
      
      const fotoUrl = colab.foto || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80';
      
      option.innerHTML = `
        <img class="colab-option-img" src="${fotoUrl}" alt="${colab.nombre}" onerror="this.src='https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80'">
        <span>${colab.nombre}</span>
      `;

      option.onclick = (e) => {
        e.stopPropagation();
        hiddenInput.value = colab.nombre;
        triggerLabel.textContent = colab.nombre;
        if (colab.foto) {
          triggerImg.src = colab.foto;
          triggerImg.style.display = 'block';
        } else {
          triggerImg.style.display = 'none';
        }
        
        dropdown.style.display = 'none';
        searchInput.value = '';
        renderOptions();
      };

      optionsContainer.appendChild(option);
    });
  }

  // Toggle dropdown
  trigger.onclick = (e) => {
    e.stopPropagation();
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
      searchInput.value = '';
      searchInput.focus();
      renderOptions();
    }
  };

  // Buscar colaboradores en tiempo real
  searchInput.oninput = (e) => {
    renderOptions(e.target.value);
  };

  searchInput.onclick = (e) => {
    e.stopPropagation(); // evitar cerrar al hacer click en el buscador
  };

  // Cerrar dropdown al hacer click fuera
  window.addEventListener('click', () => {
    dropdown.style.display = 'none';
  });
}

/**
 * Dibuja los chips del modal de edición
 */
function renderEditCompanionChips() {
  elements.editCompanionsChips.innerHTML = '';
  editCompanionsList.forEach((name, index) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `
      <span>${name}</span>
      <span class="chip-remove" data-index="${index}">&times;</span>
    `;
    elements.editCompanionsChips.appendChild(chip);
  });

  // Evento eliminar acompañante
  elements.editCompanionsChips.querySelectorAll('.chip-remove').forEach(btn => {
    btn.onclick = (e) => {
      const idx = parseInt(e.target.dataset.index);
      editCompanionsList.splice(idx, 1);
      renderEditCompanionChips();
    };
  });
}

/**
 * Envía los cambios de edición al servidor y actualiza la UI
 */
async function handleSaveEdit(e) {
  e.preventDefault();

  const id = elements.editVisitId.value;
  const cedula = elements.editCedula.value.trim();
  const placa = elements.editPlaca.value.trim().toUpperCase();
  const personaVisita = document.getElementById('editPersonaVisita').value;

  if (!personaVisita) {
    alert('Por favor seleccione la persona a quien visita.');
    return;
  }

  try {
    elements.saveEditBtn.disabled = true;
    elements.saveEditBtn.textContent = 'Guardando cambios...';

    const response = await VisitasUtils.apiCall('POST', {
      accion: 'actualizarRegistro',
      id: id,
      contrasena: CONFIG.GUARDIA_PASSWORD,
      cedula: cedula,
      placa: placa,
      personaVisita: personaVisita,
      acompanantes: editCompanionsList
    });

    if (response.success) {
      VisitasUtils.playSuccessSound();
      elements.editVisitModal.style.display = 'none';

      // Actualizar localmente currentVisitData
      if (currentVisitData && currentVisitData.id === id) {
        currentVisitData.cedula = cedula;
        currentVisitData.placa = placa;
        currentVisitData.personaVisita = personaVisita;
        currentVisitData.fotoColaborador = response.data ? response.data.fotoColaborador : '';
        currentVisitData.acompanantes = [...editCompanionsList];
        
        // Actualizar la vista actual de validación sin recargar escáner
        const isEntrada = currentVisitData.estado === 'en curso';
        displayResult(true, currentVisitData, isEntrada ? 'entrada' : 'salida');
      }

      // Limpiar y actualizar el historial en caché y en pantalla silenciosamente
      const fecha = elements.historyDateFilter.value;
      const cacheKey = `history_${fecha}`;
      
      // Intentar actualizar el registro específico dentro de la caché local para mantener la coherencia
      const cached = VisitasUtils.getFromStorage(cacheKey);
      if (cached && Array.isArray(cached)) {
        const idx = cached.findIndex(v => v.id === id);
        if (idx !== -1) {
          cached[idx].cedula = cedula;
          cached[idx].placa = placa;
          cached[idx].personaVisita = personaVisita;
          cached[idx].acompanantes = [...editCompanionsList];
          VisitasUtils.saveToStorage(cacheKey, cached);
          renderHistoryCards(cached);
        }
      }
      
      // Disparar recarga en segundo plano para sincronizar
      loadHistory(true);
    } else {
      throw new Error(response.error || 'Error al actualizar');
    }
  } catch (error) {
    VisitasUtils.playErrorSound();
    alert('Error al guardar cambios: ' + error.message);
  } finally {
    elements.saveEditBtn.disabled = false;
    elements.saveEditBtn.textContent = 'Guardar Cambios';
  }
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
  elements.loginBtn.addEventListener('click', handleLogin);
  elements.passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  
  elements.pinForm.addEventListener('submit', handlePINSubmit);
  elements.newScanBtn.addEventListener('click', handleNewScan);
  elements.refreshHistoryBtn.addEventListener('click', () => {
    loadHistory(false); // recarga forzando
    VisitasUtils.playSuccessSound();
  });

  elements.historyDateFilter.addEventListener('change', () => loadHistory(false));

  // Configurar botón de edición de visita
  elements.editVisitBtn.addEventListener('click', () => {
    if (!currentVisitData) return;

    elements.editVisitId.value = currentVisitData.id;
    elements.editCedula.value = currentVisitData.cedula || '';
    elements.editPlaca.value = currentVisitData.placa || '';
    editCompanionsList = Array.isArray(currentVisitData.acompanantes) ? [...currentVisitData.acompanantes] : [];
    
    // Pre-poblar el selector de colaborador
    const colabName = currentVisitData.personaVisita || '';
    const hiddenInput = document.getElementById('editPersonaVisita');
    const triggerLabel = document.getElementById('editPersonaLabel');
    const triggerImg = document.getElementById('editPersonaImg');

    if (hiddenInput && triggerLabel && triggerImg) {
      hiddenInput.value = colabName;
      triggerLabel.textContent = colabName || 'Seleccione el colaborador...';
      
      const found = collaboratorsList.find(c => c.nombre === colabName);
      const fotoUrl = found ? found.foto : currentVisitData.fotoColaborador;
      
      if (fotoUrl) {
        triggerImg.src = fotoUrl;
        triggerImg.style.display = 'block';
      } else {
        triggerImg.style.display = 'none';
      }
    }

    renderEditCompanionChips();
    elements.editCompanionInput.value = '';
    
    // Cerrar dropdown si estaba abierto
    const dropdown = document.getElementById('editPersonaDropdown');
    if (dropdown) dropdown.style.display = 'none';
    const searchInput = document.getElementById('editPersonaSearch');
    if (searchInput) searchInput.value = '';

    elements.editVisitModal.style.display = 'flex';
  });

  // Setup tabs toggling
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchTab(e.target.dataset.tab);
    });
  });
}

// ==================== SWITCH TABS ====================

/**
 * Alterna entre pestañas de Control e Historial
 */
async function switchTab(tabId) {
  if (!isLoggedIn) return;
  
  currentActiveTab = tabId;

  // Toggle button active classes
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Toggle content panes
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });

  // Gestionar cámara inteligentemente para evitar drenaje de batería
  if (tabId === 'controlTab') {
    startScanner();
  } else {
    stopScanner();
    loadHistory();
  }
}

// ==================== AUTENTICACIÓN ====================

/**
 * Valida la contraseña del guardia localmente e inicia sesión
 */
async function handleLogin() {
  const password = elements.passwordInput.value;

  if (password === CONFIG.GUARDIA_PASSWORD) {
    isLoggedIn = true;
    elements.loginSection.style.display = 'none';
    elements.mainSection.style.display = 'block';
    
    startScanner();
    VisitasUtils.playSuccessSound();
  } else {
    alert(CONFIG.MESSAGES.wrong_password);
    VisitasUtils.playErrorSound();
    elements.passwordInput.value = '';
  }
}

// ==================== CÁMARA & ESCANER QR ====================

/**
 * Inicia el lector de códigos QR por cámara trasera
 */
function startScanner() {
  if (html5QrCode) {
    // Si ya está inicializado y corriendo, no hacemos nada
    return;
  }

  elements.qrReader.innerHTML = '';
  html5QrCode = new Html5Qrcode('qr-reader');

  html5QrCode
    .start(
      { facingMode: 'environment' },
      CONFIG.SCANNER || { fps: 10, qrbox: 250 },
      onScanSuccess,
      onScanError
    )
    .catch(err => {
      console.error('Error al iniciar cámara:', err);
      elements.qrReader.innerHTML = `
        <div class="scanner-camera-error">
          <span>⚠️</span>
          <p>No se pudo acceder a la cámara trasera. Asegúrese de otorgar permisos.</p>
        </div>
      `;
    });
}

/**
 * Detiene y destruye el lector de códigos QR
 */
async function stopScanner() {
  if (html5QrCode) {
    try {
      await html5QrCode.stop();
      html5QrCode = null;
    } catch (e) {
      console.error('Error deteniendo cámara:', e);
    }
  }
}

/**
 * Callback de lectura QR exitosa
 */
async function onScanSuccess(decodedText) {
  try {
    // Detener cámara momentáneamente mientras procesa y muestra resultado
    await stopScanner();
    
    // Mostrar cargando
    elements.resultCard.style.display = 'block';
    elements.resultCard.className = 'result-card loading-state';
    elements.resultTitle.textContent = 'Procesando Código QR...';
    elements.visitInfo.innerHTML = '<p class="loading-inline">⌛ Consultando la base de datos de visitas...</p>';
    elements.hostInfo.style.display = 'none';

    const response = await VisitasUtils.apiCall('GET', {
      accion: 'validarQR',
      contrasena: CONFIG.GUARDIA_PASSWORD,
      qrData: decodedText
    });

    if (response.success) {
      VisitasUtils.playSuccessSound();
      displayResult(true, response.data, response.transition);
    } else {
      VisitasUtils.playErrorSound();
      displayResult(false, null, null, response.error);
    }
  } catch (error) {
    console.error('Error de verificación QR:', error);
    VisitasUtils.playErrorSound();
    displayResult(false, null, null, 'Error de comunicación con el servidor');
  }
}

function onScanError(errorMessage) {
  // Silencioso - logs normales de detección de frames
}

// ==================== MANUAL PIN ENTRY ====================

/**
 * Maneja la validación por PIN de 4 dígitos
 */
async function handlePINSubmit(e) {
  e.preventDefault();
  const pin = elements.pinInput.value.trim();

  if (!pin || pin.length !== 4) {
    alert('Por favor ingrese un PIN de 4 dígitos.');
    return;
  }

  try {
    // Detener la cámara momentáneamente
    await stopScanner();
    
    // Deshabilitar botón temporalmente
    elements.pinSubmitBtn.disabled = true;
    elements.pinSubmitBtn.textContent = 'Verificando...';

    elements.resultCard.style.display = 'block';
    elements.resultCard.className = 'result-card loading-state';
    elements.resultTitle.textContent = 'Procesando PIN...';
    elements.visitInfo.innerHTML = `<p class="loading-inline">⌛ Validando PIN "${pin}" en la base de datos...</p>`;
    elements.hostInfo.style.display = 'none';

    const response = await VisitasUtils.apiCall('GET', {
      accion: 'validarPIN',
      contrasena: CONFIG.GUARDIA_PASSWORD,
      pin: pin
    });

    if (response.success) {
      VisitasUtils.playSuccessSound();
      displayResult(true, response.data, response.transition);
      elements.pinInput.value = '';
    } else {
      VisitasUtils.playErrorSound();
      displayResult(false, null, null, response.error);
    }
  } catch (error) {
    console.error('Error de validación PIN:', error);
    VisitasUtils.playErrorSound();
    displayResult(false, null, null, 'Error de comunicación con el servidor');
  } finally {
    elements.pinSubmitBtn.disabled = false;
    elements.pinSubmitBtn.textContent = 'Validar PIN';
  }
}

// ==================== RESULT CARD RENDERING ====================

/**
 * Muestra el panel con el resultado de la validación del QR o PIN
 */
function displayResult(success, data, transition, errorMsg = '') {
  elements.resultCard.style.display = 'block';
  
  // Guardar referencia de visita activa para posibilitar edición
  currentVisitData = success ? data : null;
  if (elements.editVisitBtn) {
    elements.editVisitBtn.style.display = success ? 'block' : 'none';
  }
  
  if (success && data) {
    // Transición de color de tarjeta según ENTRADA (emerald) o SALIDA (slate)
    const isEntrada = transition === 'entrada';
    elements.resultCard.className = isEntrada ? 'result-card success' : 'result-card departure';
    
    elements.resultBadge.textContent = isEntrada ? '🟢 ACCESO PERMITIDO (ENTRADA)' : '⚪ SALIDA REGISTRADA (EGRESO)';
    elements.resultTitle.textContent = data.nombre;

    elements.visitInfo.innerHTML = `
      <div class="result-grid">
        <div class="info-row"><span>ID Pase</span><strong>${data.id}</strong></div>
        <div class="info-row"><span>PIN</span><strong>${data.pin}</strong></div>
        ${data.cedula ? `<div class="info-row"><span>Cédula</span><strong>${data.cedula}</strong></div>` : ''}
        <div class="info-row"><span>Empresa</span><strong>${data.empresa}</strong></div>
        <div class="info-row"><span>Motivo</span><strong>${data.motivo}</strong></div>
        ${data.placa ? `<div class="info-row"><span>Vehículo Placa</span><strong>${data.placa}</strong></div>` : ''}
        ${data.acompanantes && data.acompanantes.length > 0 ? `<div class="info-row"><span>Acompañantes</span><strong>${data.acompanantes.join(', ')}</strong></div>` : ''}
        <div class="info-row"><span>Hora Registro</span><strong>${data.horaEvento}</strong></div>
      </div>
    `;

    // Cargar foto del anfitrión
    if (data.fotoColaborador) {
      elements.hostInfo.style.display = 'flex';
      elements.hostPhoto.src = data.fotoColaborador;
      elements.hostName.textContent = data.personaVisita;
    } else {
      elements.hostInfo.style.display = 'flex';
      // Placeholder elegante con avatar
      elements.hostPhoto.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80';
      elements.hostName.textContent = data.personaVisita;
    }
  } else {
    elements.resultCard.className = 'result-card error';
    elements.resultBadge.textContent = '🔴 ACCESO DENEGADO';
    elements.resultTitle.textContent = 'Validación Inválida';
    elements.visitInfo.innerHTML = `
      <div class="error-detail-box">
        <p>${errorMsg || 'La credencial escaneada no coincide con ninguna visita registrada o está expirada.'}</p>
      </div>
    `;
    elements.hostInfo.style.display = 'none';
  }

  // Desplazar automáticamente al resultado
  elements.resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Limpia la tarjeta de resultado y reinicia el escáner
 */
function handleNewScan() {
  elements.resultCard.style.display = 'none';
  if (currentActiveTab === 'controlTab') {
    startScanner();
  }
}

// ==================== HISTORY LOGS ====================

/**
 * Consulta y muestra el historial de visitas para la fecha seleccionada
 */
/**
 * Consulta y muestra el historial de visitas para la fecha seleccionada con caché en segundo plano
 */
async function loadHistory(isBackground = false) {
  const fecha = elements.historyDateFilter.value;
  const cacheKey = `history_${fecha}`;

  // 1. Cargar e inyectar instantáneamente desde localStorage (0ms)
  const cachedData = VisitasUtils.getFromStorage(cacheKey);
  if (cachedData && Array.isArray(cachedData)) {
    renderHistoryCards(cachedData);
  } else if (!isBackground) {
    elements.historyList.innerHTML = '<div class="loading-logs">⏳ Consultando registros...</div>';
  }

  // 2. Ejecutar la petición remota en segundo plano para refrescar
  try {
    const response = await VisitasUtils.apiCall('GET', {
      accion: 'historial',
      contrasena: CONFIG.GUARDIA_PASSWORD,
      fecha: fecha
    });

    if (response.success && response.data) {
      // Guardar en caché local
      VisitasUtils.saveToStorage(cacheKey, response.data);

      // Comprobar si el contenido nuevo difiere de la caché para evitar repintados innecesarios
      const cachedStr = JSON.stringify(cachedData || []);
      const newStr = JSON.stringify(response.data);

      if (cachedStr !== newStr) {
        // Añadir una breve transición visual suave
        elements.historyList.style.opacity = '0.6';
        setTimeout(() => {
          renderHistoryCards(response.data);
          elements.historyList.style.opacity = '1';
        }, 150);
      }
    } else {
      throw new Error(response.error || 'Error en respuesta');
    }
  } catch (error) {
    console.error('Error cargando historial:', error);
    // Mostrar error solo si no hay datos en caché para mantener la aplicación offline-friendly
    if (!cachedData) {
      elements.historyList.innerHTML = `
        <div class="empty-history-state error-state">
          <span>⚠️</span>
          <p>No se pudo conectar con el servidor para obtener el historial.</p>
        </div>
      `;
    }
  }
}

/**
 * Renderiza el listado de tarjetas de historial
 */
function renderHistoryCards(data) {
  if (!data || data.length === 0) {
    const fecha = elements.historyDateFilter.value;
    elements.historyList.innerHTML = `
      <div class="empty-history-state">
        <span>📭</span>
        <p>No se encontraron visitas registradas para el ${formatDateLegible(fecha)}</p>
      </div>
    `;
    return;
  }

  elements.historyList.innerHTML = '';
  
  data.forEach(visit => {
    const card = document.createElement('div');
    card.className = `visit-card-history ${visit.estado}`;
    
    let statusBadge = '';
    if (visit.estado === 'agendado') {
      statusBadge = '<span class="status-pill agendado">Pendiente</span>';
    } else if (visit.estado === 'en curso') {
      statusBadge = '<span class="status-pill en-curso">En Planta</span>';
    } else {
      statusBadge = '<span class="status-pill finalizado">Finalizado</span>';
    }

    const compHtml = visit.acompanantes && visit.acompanantes.length > 0 
      ? `<p class="vh-meta">👥 Acompañantes: <strong>${visit.acompanantes.join(', ')}</strong></p>` 
      : '';

    card.innerHTML = `
      <div class="vh-header">
        <div class="vh-badge-group">
          ${statusBadge}
          <code class="vh-id-pill">${visit.id}</code>
        </div>
        <span class="vh-pin-pill">PIN: ${visit.pin}</span>
      </div>
      
      <div class="vh-body">
        <h4 class="vh-visitor-name">${visit.nombre}</h4>
        <p class="vh-meta">🏢 Empresa: <strong>${visit.empresa}</strong></p>
        <p class="vh-meta">👥 Anfitrión: <strong>${visit.personaVisita}</strong></p>
        <p class="vh-meta">💬 Motivo: <em>${visit.motivo}</em></p>
        ${visit.placa ? `<p class="vh-meta">🚗 Placa: <strong>${visit.placa}</strong></p>` : ''}
        ${compHtml}
      </div>

      <div class="vh-timestamps">
        ${visit.fechaHoraEntrada ? `<div class="vh-time-stamp"><strong>Ingreso:</strong> ${visit.fechaHoraEntrada}</div>` : ''}
        ${visit.fechaHoraSalida ? `<div class="vh-time-stamp"><strong>Salida:</strong> ${visit.fechaHoraSalida}</div>` : ''}
      </div>
    `;
    
    elements.historyList.appendChild(card);
  });
}

function formatDateLegible(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

// ==================== CERRAR APLICACIÓN ====================
window.addEventListener('beforeunload', () => {
  stopScanner();
});
