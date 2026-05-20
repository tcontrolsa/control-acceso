/**
 * CONFIGURACIÓN CENTRALIZADA DEL SISTEMA DE VISITAS
 * Este archivo debe ser actualizado con tus datos reales
 */

const CONFIG = {
  // URL de Google Apps Script (IMPORTANTE: Reemplazar con tu URL)
  API_URL: 'https://script.google.com/macros/s/AKfycbxfpcvH38SKJTT8bVeS53xPsWSeY7z77aJoOj8wC6VnvtJ2UeTOmzrWtZJJwUHD8FoyOw/exec',

  // Credenciales
  GUARDIA_PASSWORD: 'Guardia2025',

  // Configuración QR
  QR: {
    size: 250,
    errorCorrectionLevel: 'H',
    margin: 2,
    colorDark: '#000000',
    colorLight: '#FFFFFF'
  },

  // Tiempos
  SCAN_RESULT_DISPLAY_TIME: 3000, // ms
  QR_EXPIRATION_HOURS: 24,

  // Scanner
  SCANNER: {
    fps: 10,
    qrbox: { width: 250, height: 250 }
  },

  // Tipos de visita válidos
  VISIT_TYPES: {
    agenda: 'Agenda / Reunión',
    retiro: 'Retiro de producto'
  },

  // Mensajes
  MESSAGES: {
    success: '✅ Operación exitosa',
    error: '❌ Error',
    validation_error: '⚠️ Por favor complete todos los campos requeridos',
    qr_generated: 'Su código QR ha sido generado exitosamente',
    visitor_validated: 'Visitante validado correctamente',
    access_denied: 'Acceso denegado',
    wrong_password: 'Contraseña incorrecta',
    camera_error: 'No se pudo acceder a la cámara',
    connection_error: 'Error de conexión'
  }
};

// Validar que la configuración sea correcta
if (!CONFIG.API_URL || CONFIG.API_URL.includes('REEMPLAZAR')) {
  console.warn('⚠️ ADVERTENCIA: API_URL no está configurada correctamente');
}
