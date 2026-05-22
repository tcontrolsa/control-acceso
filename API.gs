/**
 * GOOGLE APPS SCRIPT - SISTEMA DE CONTROL DE VISITAS (REDISEÑADO)
 * Gestiona visitas centralizadas en la hoja "REGISTROS", validación de QR/PIN
 * de 2 fases (entrada/salida) e integración de colaboradores de la hoja "Lista".
 */

// ==================== CONFIGURACIÓN ====================
const SPREADSHEET_ID = '1t-UzfvRv4XdNvhyetuzIFhtHwGdsJ5eUHprCfN_znF8';
const CONTRASENA_GUARDIA = 'Guardia2025';
const EXPIRACION_HORAS = 24;

// Mapeo de columnas para la hoja "REGISTROS"
const COLUMNS = {
  ID: 0,
  FECHA_CREACION: 1,
  FECHA_EXPIRACION: 2,
  FECHA_HORA_VISITA: 3,
  NOMBRE: 4,
  CEDULA: 5,
  EMPRESA: 6,
  MOTIVO: 7,
  PERSONA_VISITA: 8,
  PLACA: 9,
  USADO_ENTRADA: 10,
  FECHA_HORA_ENTRADA: 11,
  USADO_SALIDA: 12,
  FECHA_HORA_SALIDA: 13,
  PIN: 14,
  ESTADO: 15,
  ACOMPANANTES: 16,
  ORIGEN_REGISTRO: 17
};

// ==================== WEB APP ====================

function doPost(e) {
  try {
    let data;
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter;
      }
    } else {
      data = e.parameter;
    }

    // Interceptar acción de actualización de registro por parte del guardia
    if (data.accion === 'actualizarRegistro') {
      return actualizarRegistro(data);
    }

    // Verificar si un ID de colaborador está autorizado para compartir el enlace
    if (data.accion === 'verificarAnfitrion') {
      return verificarAnfitrion(data.id, data.origen);
    }

    // Generar un token desde la página del guardia (para caminantes)
    if (data.accion === 'generarTokenGuardia') {
      const token = crearToken(SPREADSHEET_ID, 'GUARDIA_APP');
      return responder({ success: true, token: token });
    }

    // Validar token sin consumir (para carga inicial de página)
    if (data.accion === 'validarTokenUrl') {
      const valido = validarTokenStatus(SPREADSHEET_ID, data.token);
      return responder({ success: valido, valido: valido });
    }

    const { nombre, cedula, empresa, motivo, personaVisita, placa, fechaHoraVisita, acompanantes, origen, token } = data;

    // Si el registro proviene del visitante (no guardia manual), consumir token
    if (origen !== 'guardia_manual') {
      if (!token) {
        return responder({ success: false, error: 'Token de acceso requerido. El enlace no es válido.' });
      }
      const tokenValido = consumirToken(SPREADSHEET_ID, token);
      if (!tokenValido) {
        return responder({ success: false, error: 'El enlace ha expirado o ya fue utilizado.' });
      }
    }

    // Validar campos requeridos
    if (!nombre || !empresa || !motivo || !personaVisita || !fechaHoraVisita) {
      return responder({
        success: false,
        error: 'Faltan campos requeridos (nombre, empresa, motivo, personaVisita, fechaHoraVisita)'
      });
    }

    // Validar longitud de campos
    if (nombre.length > 100 || empresa.length > 100) {
      return responder({
        success: false,
        error: 'Nombre o empresa muy largo (máximo 100 caracteres)'
      });
    }

    // Generar ID único y fechas
    const id = generarIDUnico();
    const fechaCreacion = new Date();
    const fechaExpiracion = new Date(
      fechaCreacion.getTime() + EXPIRACION_HORAS * 60 * 60 * 1000
    );

    // Obtener hoja REGISTROS
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('REGISTROS');

    if (!sheet) {
      return responder({
        success: false,
        error: 'Hoja "REGISTROS" no encontrada en el spreadsheet'
      });
    }

    // Generar PIN único
    const pin = generarPINUnico(sheet);

    // Determinar estado inicial dependiendo del origen
    const esManual = origen === 'guardia_manual';
    
    // Preparar fila con datos (18 campos ahora)
    const fila = new Array(18);
    fila[COLUMNS.ID] = id;
    fila[COLUMNS.FECHA_CREACION] = fechaCreacion;
    fila[COLUMNS.FECHA_EXPIRACION] = fechaExpiracion;
    fila[COLUMNS.FECHA_HORA_VISITA] = fechaHoraVisita;
    fila[COLUMNS.NOMBRE] = nombre;
    fila[COLUMNS.CEDULA] = cedula || '';
    fila[COLUMNS.EMPRESA] = empresa;
    fila[COLUMNS.MOTIVO] = motivo;
    fila[COLUMNS.PERSONA_VISITA] = personaVisita;
    fila[COLUMNS.PLACA] = placa || '';
    fila[COLUMNS.USADO_ENTRADA] = esManual ? 'SI' : 'NO';
    fila[COLUMNS.FECHA_HORA_ENTRADA] = esManual ? new Date() : '';
    fila[COLUMNS.USADO_SALIDA] = 'NO';
    fila[COLUMNS.FECHA_HORA_SALIDA] = '';
    fila[COLUMNS.PIN] = pin;
    fila[COLUMNS.ESTADO] = esManual ? 'ingreso' : 'agendado';
    fila[COLUMNS.ACOMPANANTES] = Array.isArray(acompanantes) ? acompanantes.join(', ') : (acompanantes || '');
    fila[COLUMNS.ORIGEN_REGISTRO] = esManual ? 'Guardia (Manual / Frecuente)' : 'Portal Visitante';

    sheet.appendRow(fila);

    // Crear datos para QR (base64)
    const qrObject = {
      id: id,
      timestamp: fechaCreacion.getTime(),
      checksum: generarChecksum(id)
    };

    const qrData = Utilities.base64Encode(JSON.stringify(qrObject));

    return responder({
      success: true,
      qrData: qrData,
      id: id,
      pin: pin,
      mensaje: 'Registro exitoso'
    });
  } catch (error) {
    Logger.log('Error en doPost: ' + error.toString());
    return responder({
      success: false,
      error: 'Error del servidor: ' + error.toString()
    });
  }
}

function doGet(e) {
  try {
    // Si viene un ID directo (para compartir/ver pase online)
    if (e.parameter.id) {
      return renderizarPaseOnline(e.parameter.id);
    }

    const accion = e.parameter.accion;

    if (accion === 'listaColaboradores') {
      return obtenerListaColaboradores();
    }

    if (accion === 'verificarAnfitrion') {
      return verificarAnfitrion(e.parameter.id, e.parameter.origen);
    }

    if (accion === 'validarQR') {
      return validarIngreso('qr', e.parameter.qrData, e.parameter.contrasena);
    }

    if (accion === 'validarPIN') {
      return validarIngreso('pin', e.parameter.pin, e.parameter.contrasena);
    }

    if (accion === 'historial') {
      return obtenerHistorial(e.parameter);
    }

    if (accion === 'test') {
      return responder({
        success: true,
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString()
      });
    }

    return responder({
      success: false,
      error: 'Acción no válida',
      acciones_disponibles: ['listaColaboradores', 'verificarAnfitrion', 'validarQR', 'validarPIN', 'historial', 'test']
    });
  } catch (error) {
    Logger.log('Error en doGet: ' + error.toString());
    return responder({
      success: false,
      error: 'Error del servidor: ' + error.toString()
    });
  }
}

// ==================== FUNCIONES DE NEGOCIO ====================

/**
 * Retorna la lista de colaboradores de la hoja "Lista"
 */
function obtenerListaColaboradores() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Lista');
    if (!sheet) {
      return responder({
        success: false,
        error: 'Hoja "Lista" no encontrada'
      });
    }
    const data = sheet.getDataRange().getValues();
    const colaboradores = [];
    for (let i = 1; i < data.length; i++) {
      const nombre = data[i][1]; // Columna B (índice 1)
      const foto = data[i][5];   // Columna F (índice 5)
      if (nombre && nombre.toString().trim() !== '') {
        colaboradores.push({
          nombre: nombre.toString().trim(),
          foto: foto ? foto.toString().trim() : ''
        });
      }
    }
    return responder({
      success: true,
      data: colaboradores
    });
  } catch (error) {
    return responder({
      success: false,
      error: 'Error al obtener colaboradores: ' + error.toString()
    });
  }
}

/**
 * Valida ingreso (Entrada y Salida en 2 pasos) mediante QR o PIN
 */
function validarIngreso(tipoValidacion, valor, contrasena) {
  try {
    if (contrasena !== CONTRASENA_GUARDIA) {
      return responder({
        success: false,
        error: 'No autorizado',
        code: 'UNAUTHORIZED'
      });
    }

    if (!valor) {
      return responder({
        success: false,
        error: 'Valor de validación vacío',
        code: 'EMPTY_VALUE'
      });
    }

    let idBuscado = '';
    let pinBuscado = '';

    if (tipoValidacion === 'qr') {
      // Desencriptar QR
      let datos;
      try {
        const jsonStr = Utilities.newBlob(
          Utilities.base64Decode(valor)
        ).getDataAsString();
        datos = JSON.parse(jsonStr);
      } catch (e) {
        return responder({
          success: false,
          error: 'Código QR inválido',
          code: 'INVALID_FORMAT'
        });
      }

      if (!datos || !datos.id) {
        return responder({
          success: false,
          error: 'Código QR sin ID válido',
          code: 'NO_ID'
        });
      }
      idBuscado = datos.id;
    } else {
      pinBuscado = valor.toString().trim();
    }

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('REGISTROS');
    if (!sheet) {
      return responder({
        success: false,
        error: 'Hoja "REGISTROS" no encontrada',
        code: 'SHEET_NOT_FOUND'
      });
    }

    const data = sheet.getDataRange().getValues();
    let filaIndex = -1;

    for (let i = 1; i < data.length; i++) {
      if (tipoValidacion === 'qr') {
        if (data[i][COLUMNS.ID] === idBuscado) {
          filaIndex = i;
          break;
        }
      } else {
        // Para PIN, buscamos que coincida el PIN y que esté "agendado" o "en curso"
        if (data[i][COLUMNS.PIN].toString().trim() === pinBuscado) {
          const est = data[i][COLUMNS.ESTADO];
          if (est === 'agendado' || est === 'en curso') {
            filaIndex = i;
            break;
          }
        }
      }
    }

    // Si buscamos por PIN y no encontramos un activo, pero tal vez ya está finalizado
    if (tipoValidacion === 'pin' && filaIndex === -1) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][COLUMNS.PIN].toString().trim() === pinBuscado) {
          filaIndex = i;
          break;
        }
      }
    }

    if (filaIndex === -1) {
      return responder({
        success: false,
        error: tipoValidacion === 'qr' ? 'Visita no encontrada' : 'PIN no válido o no encontrado',
        code: 'NOT_FOUND'
      });
    }

    const row = data[filaIndex];
    const id = row[COLUMNS.ID];
    const fechaExpiracion = row[COLUMNS.FECHA_EXPIRACION];
    const nombre = row[COLUMNS.NOMBRE];
    const cedula = row[COLUMNS.CEDULA] || '';
    const empresa = row[COLUMNS.EMPRESA];
    const motivo = row[COLUMNS.MOTIVO];
    const personaVisita = row[COLUMNS.PERSONA_VISITA];
    const placa = row[COLUMNS.PLACA];
    const estado = row[COLUMNS.ESTADO];
    const pin = row[COLUMNS.PIN];
    const acompanantes = row[COLUMNS.ACOMPANANTES] ? row[COLUMNS.ACOMPANANTES].toString() : '';

    // Verificar expiración
    if (new Date(fechaExpiracion) < new Date()) {
      return responder({
        success: false,
        error: 'La visita ha expirado',
        code: 'EXPIRED'
      });
    }

    const ahora = new Date();
    // Formato de hora: local
    const ahoraStr = ahora.toLocaleDateString('es-ES') + ' ' + ahora.toLocaleTimeString('es-ES');

    if (estado === 'agendado') {
      // Registrar entrada
      sheet.getRange(filaIndex + 1, COLUMNS.USADO_ENTRADA + 1).setValue('SI');
      sheet.getRange(filaIndex + 1, COLUMNS.FECHA_HORA_ENTRADA + 1).setValue(ahoraStr);
      sheet.getRange(filaIndex + 1, COLUMNS.ESTADO + 1).setValue('en curso');

      const fotoColaborador = obtenerFotoColaborador(personaVisita);

      return responder({
        success: true,
        transition: 'entrada',
        data: {
          id: id,
          pin: pin,
          nombre: nombre,
          cedula: cedula,
          empresa: empresa,
          motivo: motivo,
          personaVisita: personaVisita,
          placa: placa,
          estado: 'en curso',
          horaEvento: ahoraStr,
          fotoColaborador: fotoColaborador,
          acompanantes: acompanantes ? acompanantes.split(',').map(s => s.trim()) : []
        }
      });
    } else if (estado === 'en curso') {
      // Registrar salida
      sheet.getRange(filaIndex + 1, COLUMNS.USADO_SALIDA + 1).setValue('SI');
      sheet.getRange(filaIndex + 1, COLUMNS.FECHA_HORA_SALIDA + 1).setValue(ahoraStr);
      sheet.getRange(filaIndex + 1, COLUMNS.ESTADO + 1).setValue('finalizado');

      const fotoColaborador = obtenerFotoColaborador(personaVisita);

      return responder({
        success: true,
        transition: 'salida',
        data: {
          id: id,
          pin: pin,
          nombre: nombre,
          cedula: cedula,
          empresa: empresa,
          motivo: motivo,
          personaVisita: personaVisita,
          placa: placa,
          estado: 'finalizado',
          horaEvento: ahoraStr,
          fotoColaborador: fotoColaborador,
          acompanantes: acompanantes ? acompanantes.split(',').map(s => s.trim()) : []
        }
      });
    } else if (estado === 'finalizado') {
      return responder({
        success: false,
        error: 'Esta visita ya ha finalizado y el acceso no es válido',
        code: 'ALREADY_FINISHED'
      });
    }

    return responder({
      success: false,
      error: 'Estado de visita desconocido',
      code: 'UNKNOWN_STATE'
    });

  } catch (error) {
    Logger.log('Error en validarIngreso: ' + error.toString());
    return responder({
      success: false,
      error: 'Error al procesar ingreso: ' + error.toString()
    });
  }
}

/**
 * Obtiene el historial de visitas filtrado por fecha
 */
function obtenerHistorial(params) {
  try {
    const contrasena = params.contrasena;
    if (contrasena !== CONTRASENA_GUARDIA) {
      return responder({
        success: false,
        error: 'No autorizado'
      });
    }

    const fechaFiltro = params.fecha || Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd");

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('REGISTROS');
    if (!sheet) {
      return responder({
        success: true,
        data: [],
        count: 0
      });
    }

    const data = sheet.getDataRange().getValues();
    const visitas = [];

    for (let i = 1; i < data.length; i++) {
      const fechaVisita = data[i][COLUMNS.FECHA_HORA_VISITA];
      const fechaCreacion = data[i][COLUMNS.FECHA_CREACION];
      
      if (matchesDate(fechaVisita, fechaFiltro) || matchesDate(fechaCreacion, fechaFiltro)) {
        visitas.push({
          id: data[i][COLUMNS.ID],
          nombre: data[i][COLUMNS.NOMBRE],
          cedula: data[i][COLUMNS.CEDULA] || '',
          empresa: data[i][COLUMNS.EMPRESA],
          motivo: data[i][COLUMNS.MOTIVO],
          personaVisita: data[i][COLUMNS.PERSONA_VISITA],
          placa: data[i][COLUMNS.PLACA],
          pin: data[i][COLUMNS.PIN],
          estado: data[i][COLUMNS.ESTADO],
          usadoEntrada: data[i][COLUMNS.USADO_ENTRADA],
          fechaHoraEntrada: data[i][COLUMNS.FECHA_HORA_ENTRADA],
          usadoSalida: data[i][COLUMNS.USADO_SALIDA],
          fechaHoraSalida: data[i][COLUMNS.FECHA_HORA_SALIDA],
          fechaHoraVisita: data[i][COLUMNS.FECHA_HORA_VISITA],
          acompanantes: data[i][COLUMNS.ACOMPANANTES] ? data[i][COLUMNS.ACOMPANANTES].toString().split(',').map(s => s.trim()).filter(Boolean) : []
        });
      }
    }

    // Ordenar: en curso primero, luego orden cronológico inverso por entrada/visita
    visitas.sort((a, b) => {
      if (a.estado === 'en curso' && b.estado !== 'en curso') return -1;
      if (a.estado !== 'en curso' && b.estado === 'en curso') return 1;

      const tA = a.fechaHoraEntrada ? new Date(a.fechaHoraEntrada) : new Date(a.fechaHoraVisita);
      const tB = b.fechaHoraEntrada ? new Date(b.fechaHoraEntrada) : new Date(b.fechaHoraVisita);
      return tB - tA;
    });

    return responder({
      success: true,
      data: visitas,
      count: visitas.length
    });
  } catch (error) {
    Logger.log('Error obteniendo historial: ' + error.toString());
    return responder({
      success: false,
      error: 'Error al obtener historial: ' + error.toString()
    });
  }
}

// ==================== VERIFICACIÓN DE ANFITRIÓN & LOGS ====================

/**
 * Verifica si un ID corresponde a un colaborador en la columna A de la hoja "Lista".
 * Registra el intento (autorizado o no) en la hoja "Logs".
 */
function verificarAnfitrion(id, origen) {
  try {
    if (!id) {
      return responder({ success: false, error: 'ID no proporcionado', code: 'NO_ID' });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const listaSheet = ss.getSheetByName('Lista');
    if (!listaSheet) {
      return responder({ success: false, error: 'Hoja Lista no encontrada', code: 'SHEET_NOT_FOUND' });
    }

    const data = listaSheet.getDataRange().getValues();
    let autorizado = false;
    let nombreColaborador = '';

    for (let i = 1; i < data.length; i++) {
      const colId = data[i][0] ? data[i][0].toString().trim() : '';
      if (colId.toUpperCase() === id.toString().trim().toUpperCase()) {
        autorizado = true;
        nombreColaborador = data[i][1] ? data[i][1].toString().trim() : colId;
        break;
      }
    }

    // Registrar el intento en la hoja Logs
    registrarLog(ss, {
      fecha: new Date(),
      accion: 'COMPARTIR_ENLACE',
      id: id.toString().trim().toUpperCase(),
      nombre: nombreColaborador || 'No encontrado',
      resultado: autorizado ? 'AUTORIZADO' : 'NO_AUTORIZADO',
      origen: origen || 'desconocido'
    });

    if (autorizado) {
      const tokenGenerado = crearToken(SPREADSHEET_ID, id.toString().trim().toUpperCase());
      return responder({ success: true, nombre: nombreColaborador, token: tokenGenerado });
    } else {
      return responder({
        success: false,
        error: 'ID no autorizado. El intento ha sido registrado.',
        code: 'UNAUTHORIZED'
      });
    }
  } catch (error) {
    Logger.log('Error en verificarAnfitrion: ' + error.toString());
    return responder({ success: false, error: 'Error al verificar: ' + error.toString() });
  }
}

/**
 * Registra un evento en la hoja "Logs" (la crea si no existe).
 */
function registrarLog(ss, logData) {
  try {
    let logsSheet = ss.getSheetByName('Logs');
    if (!logsSheet) {
      logsSheet = ss.insertSheet('Logs');
      logsSheet.getRange(1, 1, 1, 6).setValues([[
        'Fecha y Hora', 'Acción', 'ID Ingresado', 'Nombre Colaborador', 'Resultado', 'Origen'
      ]]);
      // Formato encabezado
      logsSheet.getRange(1, 1, 1, 6)
        .setFontWeight('bold')
        .setBackground('#1e293b')
        .setFontColor('#ffffff');
      logsSheet.setFrozenRows(1);
    }
    logsSheet.appendRow([
      logData.fecha,
      logData.accion || '',
      logData.id || '',
      logData.nombre || '',
      logData.resultado || '',
      logData.origen || ''
    ]);
  } catch (e) {
    Logger.log('Error registrando log: ' + e.toString());
  }
}

// ==================== TOKENS DE UN SOLO USO ====================

function crearToken(spreadsheetId, generadoPor) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  let tokensSheet = ss.getSheetByName('Tokens');
  if (!tokensSheet) {
    tokensSheet = ss.insertSheet('Tokens');
    tokensSheet.getRange(1, 1, 1, 4).setValues([['Token', 'Generado Por', 'Fecha Creacion', 'Estado']]);
    tokensSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    tokensSheet.setFrozenRows(1);
  }
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 10; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  tokensSheet.appendRow([token, generadoPor, new Date(), 'ACTIVO']);
  return token;
}

function validarTokenStatus(spreadsheetId, token) {
  if (!token) return false;
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName('Tokens');
  if (!sheet) return false;
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token && data[i][3] === 'ACTIVO') {
      return true;
    }
  }
  return false;
}

function consumirToken(spreadsheetId, token) {
  if (!token) return false;
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName('Tokens');
  if (!sheet) return false;
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token && data[i][3] === 'ACTIVO') {
      // Marcar como usado
      sheet.getRange(i + 1, 4).setValue('USADO');
      return true;
    }
  }
  return false;
}

// ==================== AUXILIARES GENERALES ====================

/**
 * Obtiene la foto de la persona que visita buscando en la hoja "Lista"
 */
function obtenerFotoColaborador(nombreColaborador) {
  if (!nombreColaborador) return '';
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Lista');
    if (!sheet) return '';
    const data = sheet.getDataRange().getValues();
    const nombreBuscado = nombreColaborador.toString().trim().toLowerCase();
    for (let i = 1; i < data.length; i++) {
      const nombre = data[i][1]; // Columna B (índice 1)
      if (nombre && nombre.toString().trim().toLowerCase() === nombreBuscado) {
        return data[i][5] ? data[i][5].toString().trim() : ''; // Columna F (índice 5)
      }
    }
  } catch (e) {
    Logger.log('Error obteniendo foto de colaborador: ' + e.toString());
  }
  return '';
}

/**
 * Compara si una celda de fecha corresponde al filtro 'yyyy-MM-dd'
 */
function matchesDate(dateObjOrStr, filterDateStr) {
  if (!dateObjOrStr) return false;
  let date;
  if (dateObjOrStr instanceof Date) {
    date = dateObjOrStr;
  } else {
    date = new Date(dateObjOrStr);
    if (isNaN(date.getTime())) {
      return dateObjOrStr.toString().includes(filterDateStr);
    }
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const formattedDate = `${y}-${m}-${d}`;
  return formattedDate === filterDateStr;
}

/**
 * Genera un ID único para cada visita
 */
function generarIDUnico() {
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
 * Genera un PIN de 4 dígitos único entre los activos o en curso
 */
function generarPINUnico(sheet) {
  const data = sheet.getDataRange().getValues();
  const pinsActivos = new Set();
  for (let i = 1; i < data.length; i++) {
    const estado = data[i][COLUMNS.ESTADO];
    const pin = data[i][COLUMNS.PIN];
    if ((estado === 'agendado' || estado === 'en curso') && pin) {
      pinsActivos.add(pin.toString().trim());
    }
  }
  
  let pin;
  let intentos = 0;
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
    intentos++;
    if (intentos > 10000) break;
  } while (pinsActivos.has(pin));
  
  return pin;
}

/**
 * Genera un checksum de validación del ID
 */
function generarChecksum(id) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i);
  }
  return sum.toString(16);
}

/**
 * Responde una solicitud con formato JSON CORS-compatible
 */
function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== CONFIGURACIÓN INICIAL DE HOJAS ====================

function configurarHojas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Configurar hoja REGISTROS
  let sheet = ss.getSheetByName('REGISTROS');
  if (!sheet) {
    sheet = ss.insertSheet('REGISTROS');
  } else {
    sheet.clear();
  }
  
  sheet.getRange(1, 1, 1, 17).setValues([[
    'ID', 
    'Fecha Creación del Registro', 
    'Fecha Expiración del Registro', 
    'Fecha y Hora de la Visita', 
    'Nombre del Visitante', 
    'Cédula', 
    'Empresa', 
    'Motivo de la Visita', 
    'Persona que Visita', 
    'Placa del Vehículo', 
    'Usado Entrada', 
    'Fecha y Hora Entrada', 
    'Usado Salida', 
    'Fecha y Hora Salida', 
    'PIN de Validación', 
    'Estado',
    'Acompañantes'
  ]]);
  
  // Configurar hoja Lista (Colaboradores)
  let listaSheet = ss.getSheetByName('Lista');
  if (!listaSheet) {
    listaSheet = ss.insertSheet('Lista');
    listaSheet.getRange(1, 1, 1, 6).setValues([[
      'ID Colaborador', 'Nombre Completo', 'Área', 'Cargo', 'Email', 'Foto'
    ]]);
    listaSheet.appendRow([
      'COLAB-001', 'Juan Pérez', 'Sistemas', 'Desarrollador', 'juan.perez@empresa.com', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
    ]);
  }
  
  return 'Hojas configuradas correctamente. REGISTROS y Lista inicializadas.';
}

// ==================== EDITAR Y VERIFICAR ONLINE (NUEVOS ENLACES) ====================

/**
 * Renderiza una página HTML responsiva y estilizada que sirve como Pase Online.
 * Este funciona como nuestro propio acortador y visor de ticket digital.
 */
function renderizarPaseOnline(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('REGISTROS');
  if (!sheet) {
    return HtmlService.createHtmlOutput('<h3>Error: Base de datos no encontrada.</h3>');
  }
  
  const data = sheet.getDataRange().getValues();
  let row = null;
  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.ID] === id) {
      row = data[i];
      break;
    }
  }
  
  if (!row) {
    return HtmlService.createHtmlOutput('<h3>Error: Pase de visita no encontrado o inválido.</h3>');
  }
  
  const pin = row[COLUMNS.PIN];
  const nombre = row[COLUMNS.NOMBRE];
  const cedula = row[COLUMNS.CEDULA] || 'No proporcionada';
  const empresa = row[COLUMNS.EMPRESA];
  const personaVisita = row[COLUMNS.PERSONA_VISITA];
  const fechaHora = row[COLUMNS.FECHA_HORA_VISITA];
  const placa = row[COLUMNS.PLACA] || 'Ninguna';
  const acompanantes = row[COLUMNS.ACOMPANANTES] || 'Ninguno';
  const motivo = row[COLUMNS.MOTIVO] || 'Reunión';
  
  // Formatear fecha legible
  let fechaStr = fechaHora;
  if (fechaHora instanceof Date) {
    fechaStr = fechaHora.toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
  
  // Crear datos de QR codificados en base64
  const qrObject = {
    id: id,
    timestamp: new Date(row[COLUMNS.FECHA_CREACION]).getTime(),
    checksum: generarChecksum(id)
  };
  const qrDataText = Utilities.base64Encode(JSON.stringify(qrObject));
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(qrDataText);
  
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pase Digital de Ingreso | T Control</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #e22726;
      --primary-glow: rgba(226, 39, 38, 0.2);
      --bg-app: #090d16;
      --bg-card: rgba(22, 28, 45, 0.85);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border-color: rgba(255, 255, 255, 0.08);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg-app);
      background-image: 
        radial-gradient(at 0% 0%, rgba(226, 39, 38, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.08) 0px, transparent 50%);
      background-attachment: fixed;
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .ticket-container {
      width: 100%;
      max-width: 440px;
      background: var(--bg-card);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      padding: 30px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .brand-header {
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .logo-circle {
      width: 54px;
      height: 54px;
      background: rgba(226, 39, 38, 0.12);
      border: 1px solid rgba(226, 39, 38, 0.3);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .brand-name {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 1px;
    }
    .ticket-title {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .ticket-id {
      font-size: 12px;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-family: monospace;
    }
    .qr-area {
      background: #ffffff;
      border-radius: 18px;
      padding: 16px;
      margin: 24px 0;
      display: inline-block;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }
    .qr-img {
      width: 180px;
      height: 180px;
      display: block;
    }
    .qr-help {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 20px;
    }
    .pin-area {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 24px;
    }
    .pin-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 4px;
      display: block;
    }
    .pin-display {
      font-size: 30px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 6px;
    }
    .details-card {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 16px;
      border: 1px solid var(--border-color);
      padding: 16px 20px;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      padding-bottom: 8px;
    }
    .detail-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .detail-row span {
      color: var(--text-muted);
    }
    .detail-row strong {
      color: #ffffff;
      font-weight: 600;
    }
    .footer-text {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="ticket-container">
    <div class="brand-header">
      <div class="logo-circle">✨</div>
      <div class="brand-name">T CONTROL</div>
    </div>
    
    <h2 class="ticket-title">PASE DE ACCESO</h2>
    <div class="ticket-id">${id}</div>
    
    <div>
      <div class="qr-area">
        <img class="qr-img" src="${qrUrl}" alt="Código QR de Acceso">
      </div>
      <p class="qr-help">Muestre este código en portería para ingresar o salir</p>
    </div>
    
    <div class="pin-area">
      <span class="pin-label">PIN de acceso alternativo</span>
      <div class="pin-display">${pin}</div>
    </div>
    
    <div class="details-card">
      <div class="detail-row"><span>Visitante</span><strong>${nombre}</strong></div>
      <div class="detail-row"><span>Cédula</span><strong>${cedula}</strong></div>
      <div class="detail-row"><span>Empresa</span><strong>${empresa}</strong></div>
      <div class="detail-row"><span>Anfitrión</span><strong>${personaVisita}</strong></div>
      <div class="detail-row"><span>Motivo</span><strong>${motivo}</strong></div>
      <div class="detail-row"><span>Fecha Programada</span><strong>${fechaStr}</strong></div>
      <div class="detail-row"><span>Vehículo Placa</span><strong>${placa}</strong></div>
      <div class="detail-row"><span>Acompañantes</span><strong>${acompanantes}</strong></div>
    </div>
    
    <p class="footer-text">Válido para entrada y salida. Expiración de 24 horas.</p>
  </div>
</body>
</html>
  `;
  return HtmlService.createHtmlOutput(html);
}

/**
 * Actualiza los campos opcionales y los acompañantes de un pase de visita
 * llamado por POST desde el panel del guardia de seguridad.
 */
function actualizarRegistro(data) {
  const { id, contrasena, cedula, placa, acompanantes, personaVisita } = data;

  if (contrasena !== CONTRASENA_GUARDIA) {
    return responder({ success: false, error: 'No autorizado' });
  }

  if (!id) {
    return responder({ success: false, error: 'ID de visita no proporcionado' });
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('REGISTROS');
  if (!sheet) {
    return responder({ success: false, error: 'Hoja REGISTROS no encontrada' });
  }

  const values = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][COLUMNS.ID] === id) {
      rowIndex = i + 1; // Fila 1-indexada de Google Sheets
      break;
    }
  }

  if (rowIndex === -1) {
    return responder({ success: false, error: 'Visita no encontrada' });
  }

  // Actualizar valores específicos en el sheet
  if (cedula !== undefined) {
    sheet.getRange(rowIndex, COLUMNS.CEDULA + 1).setValue(cedula);
  }
  if (placa !== undefined) {
    sheet.getRange(rowIndex, COLUMNS.PLACA + 1).setValue(placa);
  }
  if (personaVisita !== undefined) {
    sheet.getRange(rowIndex, COLUMNS.PERSONA_VISITA + 1).setValue(personaVisita);
  }
  if (acompanantes !== undefined) {
    const acomStr = Array.isArray(acompanantes) ? acompanantes.join(', ') : acompanantes;
    sheet.getRange(rowIndex, COLUMNS.ACOMPANANTES + 1).setValue(acomStr || '');
  }

  return responder({
    success: true,
    mensaje: 'Registro actualizado con éxito',
    data: {
      id: id,
      cedula: cedula,
      placa: placa,
      personaVisita: personaVisita,
      fotoColaborador: obtenerFotoColaborador(personaVisita),
      acompanantes: Array.isArray(acompanantes) ? acompanantes : (acompanantes ? acompanantes.split(', ') : [])
    }
  });
}