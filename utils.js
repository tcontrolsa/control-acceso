/**
 * UTILIDADES COMPARTIDAS
 * Funciones reutilizables para ambos módulos
 */

class VisitasUtils {
  /**
   * Genera un ID único para cada visita
   */
  static generateVisitId() {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `VIS-${año}${mes}${dia}-${random}`;
  }

  /**
   * Valida que un campo requerido no esté vacío
   */
  static validateRequired(value, fieldName) {
    if (!value || value.trim() === '') {
      throw new Error(`${fieldName} es requerido`);
    }
    return value.trim();
  }

  /**
   * Valida la longitud de un campo
   */
  static validateLength(value, min, max, fieldName) {
    if (value.length < min || value.length > max) {
      throw new Error(`${fieldName} debe tener entre ${min} y ${max} caracteres`);
    }
    return value;
  }

  /**
   * Reproduce un sonido de éxito
   */
  static playSuccessSound() {
    try {
      this._playBeep(880, 200, 'sine');
      setTimeout(() => this._playBeep(880, 200, 'sine'), 200);
      navigator.vibrate?.(200);
    } catch (e) {
      console.log('Audio no disponible');
    }
  }

  /**
   * Reproduce un sonido de error
   */
  static playErrorSound() {
    try {
      this._playBeep(440, 300, 'sawtooth');
      setTimeout(() => this._playBeep(330, 300, 'sawtooth'), 300);
      navigator.vibrate?.(500);
    } catch (e) {
      console.log('Audio no disponible');
    }
  }

  /**
   * Genera un sonido con frecuencia específica (privado)
   */
  static _playBeep(frequency, duration, type = 'sine') {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, duration);
    } catch (e) {
      console.log('Web Audio API no disponible');
    }
  }

  /**
   * Formato de fecha legible
   */
  static formatDateTime(date = new Date()) {
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    return date.toLocaleDateString('es-ES', options);
  }

  /**
   * Formato de solo fecha
   */
  static formatDate(date = new Date()) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return date.toLocaleDateString('es-ES', options);
  }

  /**
   * Formato de solo hora
   */
  static formatTime(date = new Date()) {
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return date.toLocaleTimeString('es-ES', options);
  }

  /**
   * Realiza una petición POST a la API
   */
  static async apiCall(method = 'POST', params = {}) {
    try {
      const url =
        method === 'GET'
          ? CONFIG.API_URL +
            '?' +
            new URLSearchParams(params).toString()
          : CONFIG.API_URL;

      const options = {
        method,
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // Evita la preflight request de CORS (OPTIONS) al usar un Simple Request
        }
      };

      if (method === 'POST') {
        options.body = JSON.stringify(params);
      }

      const response = await fetch(url, options);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en llamada API:', error);
      throw new Error(CONFIG.MESSAGES.connection_error);
    }
  }

  /**
   * Detecta si el dispositivo está online
   */
  static isOnline() {
    return navigator.onLine;
  }

  /**
   * Guardar datos en localStorage
   */
  static saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
      return false;
    }
  }

  /**
   * Obtener datos de localStorage
   */
  static getFromStorage(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error('Error leyendo de localStorage:', e);
      return defaultValue;
    }
  }

  /**
   * Eliminar datos de localStorage
   */
  static removeFromStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Error eliminando de localStorage:', e);
      return false;
    }
  }

  /**
   * Registrar Service Worker
   */
  static async registerServiceWorker(swPath = 'sw.js') {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Workers no soportados');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register(swPath);
      console.log('Service Worker registrado:', registration);
      return true;
    } catch (error) {
      console.error('Error registrando Service Worker:', error);
      return false;
    }
  }
}

// Exportar para uso en módulos (si se usa ES6)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VisitasUtils;
}
