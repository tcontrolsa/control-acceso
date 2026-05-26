/**
 * MÓDULO VISITANTE - Generación de QR de acceso
 * Formulario para que visitantes se registren y generen su QR y PIN
 */

// ==================== VARIABLES GLOBALES ====================
const elements = {
  form: document.getElementById('visitForm'),
  submitBtn: document.getElementById('submitBtn'),
  btnText: document.querySelector('.btn-text'),
  btnLoader: document.querySelector('.btn-loader'),
  resultModal: document.getElementById('resultModal'),
  resultContent: document.getElementById('resultContent'),
  nombre: document.getElementById('nombre'),
  cedula: document.getElementById('cedula'),
  empresa: document.getElementById('empresa'),
  placa: document.getElementById('placa'),
  fechaHoraVisita: document.getElementById('fechaHoraVisita'),
  personaVisita: document.getElementById('personaVisita'),
  motivo: document.getElementById('motivo')
};

// ==================== VARIABLE GLOBAL DE COMPAÑEROS, TEMAS Y TOKEN ====================
let companionsList = [];
let accessToken = null;

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
  VisitasUtils.registerServiceWorker('sw.js');
  
  // Establecer fecha y hora actual por defecto en el input
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
  elements.fechaHoraVisita.value = ahora.toISOString().slice(0, 16);

  await validarTokenAcceso();

  cargarColaboradores();
  setupEventListeners();
  inicializarTema();
  inicializarAcompanantesInput();
  inicializarTabsYSeguridad();
});

/**
 * Inicializa Tabs y Modal de Seguridad
 */
function inicializarTabsYSeguridad() {
  // Tabs
  const tabNormalBtn = document.getElementById('tabNormalBtn');
  const tabFreqBtn = document.getElementById('tabFreqBtn');
  const normalTab = document.getElementById('normalTab');
  const freqTab = document.getElementById('freqTab');

  if (tabNormalBtn && tabFreqBtn) {
    tabNormalBtn.onclick = () => {
      tabNormalBtn.classList.add('active');
      tabNormalBtn.style.borderBottomColor = 'var(--primary)';
      tabNormalBtn.style.color = 'var(--text-main)';
      tabFreqBtn.classList.remove('active');
      tabFreqBtn.style.borderBottomColor = 'transparent';
      tabFreqBtn.style.color = 'var(--text-muted)';
      normalTab.style.display = 'block';
      freqTab.style.display = 'none';
    };
    
    tabFreqBtn.onclick = () => {
      tabFreqBtn.classList.add('active');
      tabFreqBtn.style.borderBottomColor = 'var(--primary)';
      tabFreqBtn.style.color = 'var(--text-main)';
      tabNormalBtn.classList.remove('active');
      tabNormalBtn.style.borderBottomColor = 'transparent';
      tabNormalBtn.style.color = 'var(--text-muted)';
      freqTab.style.display = 'block';
      normalTab.style.display = 'none';
    };
  }

  // Safety rules are now embedded in the form, so no modal logic is needed.
}

/**
 * Valida el token de un solo uso de la URL
 */
async function validarTokenAcceso() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (!token) {
    bloquearFormulario('Acceso Denegado. Se requiere un enlace de invitación válido con token.');
    return;
  }
  
  try {
    const response = await VisitasUtils.apiCall('POST', {
      accion: 'validarTokenUrl',
      token: token
    });
    
    if (response.success && response.valido) {
      accessToken = token; // Guardar para el envío del formulario
    } else {
      window.location.href = 'error.html';
    }
  } catch (e) {
    window.location.href = 'error.html';
  }
}

function bloquearFormulario(mensaje) {
  // Ocultar todo el layout del formulario
  const desktopSplit = document.querySelector('.desktop-split');
  const formActions = document.getElementById('formActionsContainer');
  if (desktopSplit) {
    desktopSplit.style.display = 'none';
  }
  if (formActions) {
    formActions.style.display = 'none';
  }

  // Mostrar los botones internos (Soy anfitrión, Compartir)
  const internalActions = document.getElementById('internalActionsContainer');
  if (internalActions) {
    internalActions.style.display = 'flex';
  }

  // Si ya existe el errorBox, no agregarlo de nuevo
  if (document.getElementById('tokenErrorBox')) return;

  // Mostrar guías simples y amigables para el usuario
  const errorBox = document.createElement('div');
  errorBox.id = 'tokenErrorBox';
  errorBox.style.cssText = 'text-align: center; padding: 32px 20px; background: rgba(59, 130, 246, 0.05); border-radius: 16px; margin-bottom: 24px; border: 1px solid rgba(59, 130, 246, 0.2);';
  errorBox.innerHTML = `
      <div style="font-size:48px; margin-bottom: 16px;">👋</div>
      <h3 style="color:var(--primary); margin-bottom: 12px; font-size: 20px;">Portal de Anfitriones TCONTROL</h3>
      <p style="color:var(--text-main); font-size: 14px; margin-bottom: 16px;">
        Esta sección es exclusiva para colaboradores de TCONTROL S.A.
      </p>
      <div style="text-align: left; background: rgba(0,0,0,0.2); padding: 16px; border-radius: 12px; font-size: 13px; color: var(--text-muted); line-height: 1.6;">
        <strong style="color: #ffffff; display: block; margin-bottom: 8px;">¿Qué desea hacer?</strong>
        <div style="margin-bottom: 8px;"><strong>1️⃣ Registrar Visitante:</strong> Ingrese si su visitante ya se encuentra en recepción y desea llenar los datos por él.</div>
        <div><strong>2️⃣ Compartir Enlace:</strong> Genere un link seguro de un solo uso y envíelo a su visitante por WhatsApp o correo.</div>
      </div>
  `;
  
  // Insert before the internal actions container
  elements.form.insertBefore(errorBox, internalActions);
}

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
 * Configura los eventos del gestor de acompañantes
 */
function inicializarAcompanantesInput() {
  const companionsChips = document.getElementById('companionsChips');
  const companionInput = document.getElementById('companionInput');
  const addCompanionBtn = document.getElementById('addCompanionBtn');

  if (!companionsChips || !companionInput || !addCompanionBtn) return;

  function renderCompanionChips() {
    companionsChips.innerHTML = '';
    companionsList.forEach((name, index) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `
        <span>${name}</span>
        <span class="chip-remove" data-index="${index}">&times;</span>
      `;
      companionsChips.appendChild(chip);
    });

    // Enlazar eliminación
    companionsChips.querySelectorAll('.chip-remove').forEach(btn => {
      btn.onclick = (e) => {
        const idx = parseInt(e.target.dataset.index);
        companionsList.splice(idx, 1);
        renderCompanionChips();
      };
    });
  }

  addCompanionBtn.onclick = () => {
    const name = companionInput.value.trim();
    if (name && !companionsList.includes(name)) {
      companionsList.push(name);
      companionInput.value = '';
      renderCompanionChips();
    }
  };

  companionInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCompanionBtn.click();
    }
  };
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
  elements.form.addEventListener('submit', handleFormSubmit);
  const shareRegBtn = document.getElementById('shareRegisterBtn');
  if (shareRegBtn) {
    shareRegBtn.addEventListener('click', () => abrirModalCompartirRegistro('share'));
  }

  const selfRegBtn = document.getElementById('selfRegisterVisitorBtn');
  if (selfRegBtn) {
    selfRegBtn.addEventListener('click', () => abrirModalCompartirRegistro('register'));
  }

  // Freq Form
  const freqForm = document.getElementById('freqForm');
  if (freqForm) {
    freqForm.addEventListener('submit', handleFreqFormSubmit);
  }
}

/**
 * Maneja la generación del Pase Frecuente
 */
function handleFreqFormSubmit(e) {
  e.preventDefault();
  
  const nombre = document.getElementById('freqNombre').value.trim();
  const cedula = document.getElementById('freqCedula').value.trim();
  const empresa = document.getElementById('freqEmpresa').value.trim();

  if (!nombre || !cedula || !empresa) {
    alert('Complete todos los campos');
    return;
  }

  const jsonStr = JSON.stringify({
    freq: true,
    n: nombre,
    c: cedula,
    e: empresa,
    t: new Date().getTime()
  });

  // Codificar en Base64 para evitar problemas de caracteres en el QR
  const qrData = btoa(unescape(encodeURIComponent(jsonStr)));

  document.getElementById('freqResult').style.display = 'block';
  const qrContainer = document.getElementById('freqQRContainer');
  generateQRCode(qrContainer, qrData);

  document.getElementById('downloadFreqQRBtn').onclick = () => {
    const canvas = qrContainer.querySelector('canvas') || qrContainer.querySelector('img');
    if (canvas) {
      const link = document.createElement('a');
      link.href = canvas.toDataURL ? canvas.toDataURL('image/png') : canvas.src;
      link.download = `PaseFrecuente_${cedula}.png`;
      link.click();
      VisitasUtils.playSuccessSound();
    }
  };
}

// ==================== CARGAR COLABORADORES ====================

/**
 * Obtiene la lista de colaboradores desde el backend y llena el dropdown
 */
async function cargarColaboradores() {
  try {
    const response = await VisitasUtils.apiCall('GET', {
      accion: 'listaColaboradores'
    });

    if (response.success && response.data) {
      const select = elements.personaVisita;
      select.innerHTML = '<option value="">Seleccione el colaborador...</option>';
      
      response.data.forEach(colab => {
        const option = document.createElement('option');
        option.value = colab.nombre;
        option.textContent = colab.nombre;
        select.appendChild(option);
      });
    } else {
      throw new Error(response.error || 'Error al obtener datos');
    }
  } catch (error) {
    console.error('Error cargando colaboradores:', error);
    elements.personaVisita.innerHTML = '<option value="">⚠️ Error cargando colaboradores</option>';
  }
}

// ==================== ENVÍO DE FORMULARIO ====================

/**
 * Maneja el envío del formulario
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  try {
    // Validar campos requeridos
    const formData = {
      nombre: elements.nombre.value.trim(),
      cedula: elements.cedula.value.trim(),
      empresa: elements.empresa.value.trim(),
      placa: elements.placa.value.trim(),
      fechaHoraVisita: elements.fechaHoraVisita.value,
      personaVisita: elements.personaVisita.value,
      motivo: elements.motivo.value.trim(),
      acompanantes: companionsList,
      token: accessToken
    };

    if (
      !formData.nombre ||
      !formData.empresa ||
      !formData.fechaHoraVisita ||
      !formData.personaVisita ||
      !formData.motivo
    ) {
      alert(CONFIG.MESSAGES.validation_error);
      VisitasUtils.playErrorSound();
      return;
    }

    // Validar aceptación de reglas
    const privacyCheck = document.getElementById('privacyCheck');
    if (privacyCheck && !privacyCheck.checked) {
      privacyCheck.closest('.privacy-check-label').scrollIntoView({ behavior: 'smooth', block: 'center' });
      privacyCheck.closest('.privacy-check-label').style.animation = 'privacyShake 0.4s ease';
      setTimeout(() => { privacyCheck.closest('.privacy-check-label').style.animation = ''; }, 500);
      alert('Debe aceptar el Aviso de Privacidad y Normas de Seguridad para continuar.');
      VisitasUtils.playErrorSound();
      return;
    }

    // Mostrar cargando
    setSubmitLoading(true);

    // Enviar al servidor
    const response = await VisitasUtils.apiCall('POST', formData);

    if (response.success) {
      VisitasUtils.playSuccessSound();
      displayQRResult(response.qrData, response.id, response.pin, formData);

      // Limpiar formulario y restablecer fecha
      elements.form.reset();
      
      // Reset compañeros
      companionsList = [];
      const chipsCont = document.getElementById('companionsChips');
      if (chipsCont) chipsCont.innerHTML = '';

      // Asegurar que el checkbox quede desmarcado
      const privacyCheck = document.getElementById('privacyCheck');
      if (privacyCheck) privacyCheck.checked = false;

      const ahora = new Date();
      ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
      elements.fechaHoraVisita.value = ahora.toISOString().slice(0, 16);
    } else {
      throw new Error(response.error || 'Error desconocido');
    }
  } catch (error) {
    VisitasUtils.playErrorSound();
    alert('Error al registrar visita: ' + error.message);
  } finally {
    setSubmitLoading(false);
  }
}

/**
 * Controla el estado de cargando del botón submit
 */
function setSubmitLoading(loading) {
  elements.submitBtn.disabled = loading;
  elements.btnText.style.display = loading ? 'none' : 'inline';
  elements.btnLoader.style.display = loading ? 'inline' : 'none';
}

// ==================== VISUALIZACIÓN DE QR & TICKET ====================

/**
 * Genera y muestra el QR y el ticket digital con PIN manual
 */
function displayQRResult(qrDataBase64, id, pin, formData) {
  // Configurar contenido del modal ticket
  elements.resultContent.innerHTML = `
    <div class="ticket-container">
      <div class="ticket-header">
        <div class="success-badge" style="background: var(--primary);">✓</div>
        <h2>Pase de Visita Generado</h2>
        <p class="ticket-id">Pase ID: <code>${id}</code></p>
      </div>
      
      <div class="ticket-qr-area">
        <div class="qr-code-wrapper" id="qrImageContainer"></div>
        <p class="qr-help">Muestre este QR al guardia en recepción</p>
      </div>

      <div class="ticket-pin-area">
        <span class="pin-label">PIN DE ACCESO MANUAL</span>
        <div class="pin-display">${pin}</div>
        <p class="pin-help">Use este PIN de 4 dígitos si el lector de QR no está disponible</p>
      </div>

      <div class="ticket-details">
        <div class="detail-row"><span>Visitante</span><strong>${formData.nombre}</strong></div>
        ${formData.cedula ? `<div class="detail-row"><span>Cédula</span><strong>${formData.cedula}</strong></div>` : ''}
        <div class="detail-row"><span>Empresa</span><strong>${formData.empresa}</strong></div>
        <div class="detail-row"><span>Visita a</span><strong>${formData.personaVisita}</strong></div>
        <div class="detail-row"><span>Fecha programada</span><strong>${formatLocalTime(formData.fechaHoraVisita)}</strong></div>
        ${formData.placa ? `<div class="detail-row"><span>Placa Vehículo</span><strong>${formData.placa}</strong></div>` : ''}
        ${formData.acompanantes && formData.acompanantes.length > 0 ? `<div class="detail-row"><span>Acompañantes</span><strong>${formData.acompanantes.join(', ')}</strong></div>` : ''}
      </div>

      <div class="ticket-footer" style="display: flex; gap: 10px;">
        <button id="downloadTicketBtn" class="btn-primary-mini" style="flex:1;">⬇️ Descargar (PNG)</button>
        <button id="closeTicketBtn" class="btn-secondary-mini" style="flex:1;">Cerrar</button>
      </div>
    </div>
  `;

  // Renderizar el QR
  const qrContainer = document.getElementById('qrImageContainer');
  generateQRCode(qrContainer, qrDataBase64);

  // Eventos de botones
  document.getElementById('closeTicketBtn').onclick = closeResultModal;
  document.querySelector('.close').onclick = closeResultModal;
  
  document.getElementById('downloadTicketBtn').onclick = () => {
    downloadTicketAsImage(id, pin, formData);
  };

  // Mostrar modal con animación BottomSheet
  elements.resultModal.style.display = 'flex';
  setTimeout(() => {
    document.getElementById('resultModalContent').style.transform = 'translateY(0)';
  }, 10);
}

/**
 * Paso 1: Muestra un modal de verificación de ID antes de compartir o registrar.
 * Solo los anfitriones registrados en la hoja "Lista" (columna A) pueden realizar esta acción.
 */
function abrirModalCompartirRegistro(actionType = 'share') {
  // Eliminar modales previos si existen
  const prev = document.getElementById('verifyIdModal');
  if (prev) prev.remove();

  const titleText = actionType === 'register' ? 'Registrar a mi Visitante' : 'Verificación de Identidad';
  const descText = actionType === 'register' 
    ? 'Ingrese su <strong>ID de colaborador</strong> para habilitar el formulario de registro y llenar los datos de su visitante.'
    : 'Solo los colaboradores autorizados pueden compartir este enlace de registro.<br>Ingrese su <strong>ID de colaborador</strong> para continuar.';

  const modal = document.createElement('div');
  modal.id = 'verifyIdModal';
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content theme-aware" style="max-width: 380px; text-align: center; padding: 32px 28px;">
      <span class="close-share" style="float:right; cursor:pointer; font-size:24px; font-weight:bold; color:var(--text-muted);">&times;</span>
      <div style="font-size: 40px; margin-bottom: 14px;">🔐</div>
      <h3 style="margin-bottom: 8px; font-size: 18px; color:var(--text-main);">${titleText}</h3>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px; line-height: 1.5;">
        ${descText}
      </p>
      <div style="display: flex; flex-direction: column; gap: 12px; text-align: left;">
        <div class="form-group">
          <label for="verifyIdInput" style="font-size:13px;">ID de Colaborador</label>
          <input type="text" id="verifyIdInput" placeholder="Ej: COLAB-001" style="text-transform: uppercase;">
        </div>
        <button id="verifyIdBtn" class="btn-primary" style="width:100%; margin-top: 4px;">
          Verificar y Continuar
        </button>
        <div id="verifyIdMsg" style="display:none; font-size:13px; padding:10px 14px; border-radius:8px;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const cerrar = () => modal.remove();
  modal.querySelector('.close-share').onclick = cerrar;
  modal.onclick = (e) => { if (e.target === modal) cerrar(); };

  const verifyBtn = modal.querySelector('#verifyIdBtn');
  const verifyInput = modal.querySelector('#verifyIdInput');
  const verifyMsg = modal.querySelector('#verifyIdMsg');

  // Permitir Enter en el input
  verifyInput.onkeydown = (e) => { if (e.key === 'Enter') verifyBtn.click(); };

  verifyBtn.onclick = async () => {
    const id = verifyInput.value.trim().toUpperCase();
    if (!id) {
      verifyMsg.style.display = 'block';
      verifyMsg.style.background = 'rgba(239,68,68,0.08)';
      verifyMsg.style.color = '#b91c1c';
      verifyMsg.style.border = '1px solid rgba(239,68,68,0.2)';
      verifyMsg.textContent = '⚠️ Por favor ingrese su ID de colaborador.';
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = '⏳ Verificando...';
    verifyMsg.style.display = 'none';

    try {
      const response = await VisitasUtils.apiCall('POST', {
        accion: 'verificarAnfitrion',
        id: id,
        origen: 'portal_visitante'
      });

      if (response.success) {
        cerrar();
        VisitasUtils.playSuccessSound();
        if (actionType === 'register') {
          // Si es registro interno, recargar la página con el token generado
          window.location.href = window.location.pathname + '?token=' + response.token;
        } else {
          // Autorizado: cerrar este modal y abrir el de compartir pasándole el token
          _mostrarModalCompartir(response.nombre || id, response.token);
        }
      } else {
        VisitasUtils.playErrorSound();
        verifyMsg.style.display = 'block';
        verifyMsg.style.background = 'rgba(239,68,68,0.08)';
        verifyMsg.style.color = '#b91c1c';
        verifyMsg.style.border = '1px solid rgba(239,68,68,0.2)';
        verifyMsg.innerHTML = `🚫 <strong>No autorizado.</strong> El ID ingresado no corresponde a ningún colaborador registrado. Este intento ha sido registrado.`;
        verifyInput.value = '';
        verifyInput.focus();
      }
    } catch (err) {
      verifyMsg.style.display = 'block';
      verifyMsg.style.background = 'rgba(239,68,68,0.08)';
      verifyMsg.style.color = '#b91c1c';
      verifyMsg.style.border = '1px solid rgba(239,68,68,0.2)';
      verifyMsg.textContent = '⚠️ Error de conexión. Intente nuevamente.';
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verificar y Continuar';
    }
  };
}

/**
 * Paso 2 (privado): Muestra el panel de compartir con QR tras verificación exitosa.
 */
function _mostrarModalCompartir(nombreColaborador, token) {
  const registerUrl = window.location.origin + window.location.pathname + '?token=' + token;
  const mensaje = `🎟️ *Registro de Visitas T Control*\n` +
      `Regístrate de forma sencilla para ingresar a las instalaciones:\n` +
      `${registerUrl}`;

  const modal = document.createElement('div');
  modal.id = 'shareRegisterModal';
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content theme-aware" style="max-width: 400px; text-align: center; padding: 32px 28px;">
      <span class="close-share" style="float:right; cursor:pointer; font-size:24px; font-weight:bold; color:var(--text-muted);">&times;</span>
      <div style="font-size: 13px; font-weight: 600; color: var(--success); background: rgba(16,185,129,0.1); border-radius: 8px; padding: 8px 14px; display: inline-block; margin-bottom: 14px;">
        ✅ Autorizado: ${nombreColaborador}
      </div>
      <h3 style="margin-bottom: 8px; font-size: 18px; color:var(--text-main);">Compartir Formulario de Registro</h3>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px; line-height: 1.5;">
        Comparta este enlace o haga que los visitantes escaneen el código QR con su celular para registrarse directamente.
      </p>
      <div style="background: white; padding: 14px; border-radius: 14px; display: inline-block; margin-bottom: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);" id="registerQRContainer"></div>
      <div style="display: flex; flex-direction: column; gap: 12px; text-align: left;">
        <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}" target="_blank" class="btn-primary-mini" style="background:#25d366; text-decoration:none; text-align:center; display:flex; align-items:center; justify-content:center; gap:8px; font-weight: 600;">
          🟢 Compartir por WhatsApp
        </a>
        <a href="mailto:?subject=Registro%20de%20Visita%20-%20T%20Control&body=${encodeURIComponent(mensaje)}" class="btn-primary-mini" style="background:#3b82f6; text-decoration:none; text-align:center; display:flex; align-items:center; justify-content:center; gap:8px; font-weight: 600;">
          ✉️ Compartir por Correo
        </a>
        <button id="copyRegisterLinkBtn" class="btn-secondary-mini" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px; font-weight: 600;">
          📋 Copiar Enlace
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Generar el código QR de la URL de registro
  const qrContainer = modal.querySelector('#registerQRContainer');
  generateQRCode(qrContainer, registerUrl);

  modal.querySelector('#copyRegisterLinkBtn').onclick = () => {
    navigator.clipboard.writeText(registerUrl)
      .then(() => {
        alert('¡Enlace de registro copiado al portapapeles!');
        VisitasUtils.playSuccessSound();
      })
      .catch(err => console.error('Error al copiar:', err));
  };

  const cerrarShare = () => modal.remove();
  modal.querySelector('.close-share').onclick = cerrarShare;
  modal.onclick = (e) => { if (e.target === modal) cerrarShare(); };
}

/**
 * Abre un panel de compartir con WhatsApp, Correo y Copiar Enlace
 */
function abrirModalCompartir(id, pin, formData) {
  const shortUrl = CONFIG.API_URL + '?id=' + id;
  const mensaje = `🎟️ *Pase de Acceso T Control*\n` +
      `*Visitante:* ${formData.nombre}\n` +
      `*Fecha/Hora:* ${formatLocalTime(formData.fechaHoraVisita)}\n` +
      `*PIN de Acceso:* ${pin}\n` +
      `*Ver Pase Digital:* ${shortUrl}`;

  const modal = document.createElement('div');
  modal.id = 'shareSheetModal';
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.innerHTML = `
      <div class="modal-content theme-aware" style="max-width: 380px;">
          <span class="close-share" style="float:right; cursor:pointer; font-size:24px; font-weight:bold; color:var(--text-muted);">&times;</span>
          <h3 style="margin-bottom: 20px; font-size: 18px; color:var(--text-main);">Compartir Pase Digital</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
              <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}" target="_blank" class="btn-primary-mini" style="background:#25d366; text-decoration:none; text-align:center; display:flex; align-items:center; justify-content:center; gap:8px;">
                  🟢 Compartir por WhatsApp
              </a>
              <a href="mailto:?subject=Pase%20de%20Acceso%20T%20Control&body=${encodeURIComponent(mensaje)}" class="btn-primary-mini" style="background:#3b82f6; text-decoration:none; text-align:center; display:flex; align-items:center; justify-content:center; gap:8px;">
                  ✉️ Compartir por Correo
              </a>
              <button id="copyLinkBtn" class="btn-secondary-mini" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
                  📋 Copiar Enlace Directo
              </button>
          </div>
      </div>
  `;
  document.body.appendChild(modal);

  // Evento copiar enlace
  modal.querySelector('#copyLinkBtn').onclick = () => {
      navigator.clipboard.writeText(shortUrl)
          .then(() => {
              alert('¡Enlace de pase copiado al portapapeles!');
              VisitasUtils.playSuccessSound();
          })
          .catch(err => console.error('Error al copiar:', err));
  };

  const cerrarShare = () => {
      modal.remove();
  };

  modal.querySelector('.close-share').onclick = cerrarShare;
  modal.onclick = (e) => {
      if (e.target === modal) cerrarShare();
  };
}

/**
 * Renderiza el QR detectando automáticamente el tipo de biblioteca QRCode cargado
 */
function generateQRCode(container, text) {
  container.innerHTML = '';
  try {
    if (typeof QRCode !== 'undefined') {
      if (typeof QRCode.toCanvas === 'function') {
        // Biblioteca node-qrcode
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        QRCode.toCanvas(canvas, text, CONFIG.QR, (err) => {
          if (err) console.error('Error node-qrcode:', err);
        });
      } else {
        // Biblioteca David Shim's qrcode.js
        new QRCode(container, {
          text: text,
          width: 200,
          height: 200,
          colorDark: "#0f172a",
          colorLight: "#ffffff",
          correctLevel: 3 // Nivel H
        });
      }
    } else {
      container.innerHTML = '<span style="color:red">Librería QR no cargada</span>';
    }
  } catch (e) {
    console.error('Error renderizando QR:', e);
    container.innerHTML = '<span style="color:red">Error generando QR</span>';
  }
}

/**
 * Descarga el ticket como una hermosa imagen para el celular
 */
function downloadTicketAsImage(id, pin, formData) {
  // Obtenemos el canvas de QR
  const qrCanvas = document.querySelector('#qrImageContainer canvas') || document.querySelector('#qrImageContainer img');
  if (!qrCanvas) {
    alert('No se pudo generar la imagen de descarga.');
    return;
  }

  // Creamos un canvas temporal para dibujar el ticket completo
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 400;
  canvas.height = 680;

  // Fondo gradiente premium
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Decoración de tarjeta ticket
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(20, 20, 360, 640, 24);
  ctx.fill();

  // Encabezado
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PASE DE INGRESO', 200, 60);

  ctx.fillStyle = '#64748b';
  ctx.font = '14px Outfit, sans-serif';
  ctx.fillText('Pase ID: ' + id, 200, 85);

  // Dibujar QR
  try {
    if (qrCanvas.tagName === 'CANVAS') {
      ctx.drawImage(qrCanvas, 100, 110, 200, 200);
    } else {
      // Si es una imagen (David Shim's genera img)
      ctx.drawImage(qrCanvas, 100, 110, 200, 200);
    }
  } catch (e) {
    console.error(e);
  }

  // Área del PIN
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(40, 330, 320, 75, 12);
  ctx.fill();

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px Outfit, sans-serif';
  ctx.fillText('PIN DE ACCESO MANUAL', 200, 355);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px Outfit, sans-serif';
  ctx.fillText(pin, 200, 390);

  // Detalles
  ctx.textAlign = 'left';
  ctx.font = '12px Outfit, sans-serif';
  ctx.fillStyle = '#64748b';

  let y = 435;
  const drawDetail = (lbl, val) => {
    ctx.fillStyle = '#64748b';
    ctx.fillText(lbl, 45, y);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText(val, 160, y);
    ctx.font = '12px Outfit, sans-serif';
    y += 28;
  };

  drawDetail('Visitante:', truncateString(formData.nombre, 24));
  if (formData.cedula) drawDetail('Cédula:', formData.cedula);
  drawDetail('Empresa:', truncateString(formData.empresa, 24));
  drawDetail('Persona a visitar:', truncateString(formData.personaVisita, 22));
  drawDetail('Fecha Visita:', formatLocalTime(formData.fechaHoraVisita));
  if (formData.placa) drawDetail('Vehículo Placa:', formData.placa);
  if (formData.acompanantes && formData.acompanantes.length > 0) {
    drawDetail('Acompañantes:', truncateString(formData.acompanantes.join(', '), 22));
  }

  // Footer en ticket
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Presente este ticket en portería. Válido por 24 horas.', 200, 640);

  // Trigger download
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `Pase_${id}.png`;
  link.click();
  
  VisitasUtils.playSuccessSound();
}

/**
 * Formatea la fecha ISO datetime-local a legible
 */
function formatLocalTime(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function truncateString(str, num) {
  if (str.length <= num) return str;
  return str.slice(0, num) + '...';
}

function closeResultModal() {
  const content = document.getElementById('resultModalContent');
  if (content) {
    content.style.transform = 'translateY(100%)';
    setTimeout(() => {
      elements.resultModal.style.display = 'none';
    }, 400); // match transition duration
  } else {
    elements.resultModal.style.display = 'none';
  }
}

// Cerrar modal al hacer clic fuera
window.addEventListener('click', (event) => {
  if (event.target === elements.resultModal) {
    closeResultModal();
  }
});