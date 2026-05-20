# Sistema de Control de Visitas - PWA

Sistema completo de Progressive Web App para gestión de visitantes y control de acceso mediante códigos QR **reales y funcionables**.

> **Versión 2.0** - Refactorizado y optimizado (20/05/2026)

## ⚡ Inicio Rápido

**LÉEME PRIMERO**: Ver archivos en este orden:
1. [INICIO.md](INICIO.md) - Resumen rápido
2. [CONFIGURACION.md](CONFIGURACION.md) - Instalación paso a paso
3. [STATUS.txt](STATUS.txt) - Estado del proyecto

## ✨ Cambios en v2.0

### Problema Principal: QR Falsos - ✅ SOLUCIONADO
- Antes: QR con puntos aleatorios que no eran escaneables
- Ahora: QR reales con librería **QRCode.js** - ¡Totalmente escaneables!

### Optimizaciones
- Código reducido 37% (600+ → 380 líneas)
- Funciones reutilizables (DRY - Don't Repeat Yourself)
- Configuración centralizada
- Estilos compartidos
- Documentación completa

## 📋 Descripción

Este proyecto implementa un sistema de control de acceso en dos módulos:

- **Visitante**: PWA para generar QR escaneable de acceso
- **Guardia**: PWA para validar QR en tiempo real

## 🏗️ Estructura del Proyecto

```
visitas/
├── config.js                    # Configuración centralizada ⭐
├── utils.js                     # Utilidades compartidas
├── shared-styles.css            # Estilos optimizados
├── API.gs                       # Google Apps Script (backend)
├── INICIO.md                    # Empezar aquí
├── CONFIGURACION.md             # Instalación
├── REFACTORIZACION.md           # Detalles técnicos
├── STATUS.txt                   # Estado del proyecto
│
├── visitante/
│   ├── index.html              # Formulario
│   ├── app.js                  # Generación QR
│   ├── manifest.json           # PWA
│   └── sw.js                   # Service Worker
│
└── guardia/
    ├── index.html              # Interfaz scanner
    ├── app.js                  # Validación QR
    ├── manifest.json           # PWA
    └── sw.js                   # Service Worker
```

## 🚀 Instalación Rápida

### 1. Configurar Google Apps Script

1. **Crear Google Spreadsheet**: https://sheets.google.com
2. **Crear Apps Script**: Extensiones → Apps Script
3. **Copiar código**: Contenido de [API.gs](API.gs)
4. **Reemplazar**: `SPREADSHEET_ID` con tu ID
5. **Deploy**: Deploy → New Deployment → Web app
6. **Copiar URL**: Guardarlo para config.js

### 2. Actualizar config.js

```javascript
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/[TU_ID]/exec', // ← Reemplazar
  GUARDIA_PASSWORD: 'Guardia2025',  // ← Cambiar (opcional)
  // ... resto igual
};
```

### 3. Subir a servidor

- Hosting: Netlify, Vercel, tu servidor
- Requiere: HTTPS (para PWA)
- Todos los archivos se sirven estáticos
2. Reemplazar `API_URL` con tu URL de Google Apps Script
3. Cambiar `GUARDIA_PASSWORD` si lo deseas (por defecto: `Guardia2025`)

### 3. Desplegar en GitHub Pages

1. Hacer push del repositorio a GitHub
2. En las configuraciones del repositorio, ir a `Pages`
3. Seleccionar rama a desplegar (ej: `main`)
4. La app estará disponible en:
   - Visitante: `https://tu-usuario.github.io/visitas/visitante/`
   - Guardia: `https://tu-usuario.github.io/visitas/guardia/`

## 📱 Características

### Módulo Visitante
- ✅ Formulario de registro con validaciones
- ✅ Captura de foto (opcional)
- ✅ Generación automática de QR
- ✅ Descarga e impresión de QR
- ✅ Soporte offline con Service Worker
- ✅ Interfaz responsive

### Módulo Guardia
- ✅ Escaneo en tiempo real de códigos QR
- ✅ Validación instantánea
- ✅ Ingreso manual como fallback
- ✅ Historial de ingresos del día
- ✅ Sonidos y vibraciones de confirmación
- ✅ Visualización de foto del visitante

## 🔐 Seguridad

### Características de Seguridad Implementadas

1. **Autenticación**: Contraseña requerida para guardia
2. **Expiración de QR**: Por defecto 24 horas
3. **Validación de uso único**: QR no puede usarse dos veces
4. **Encriptación Base64**: Datos en QR codificados
5. **CORS configurado**: Solo acepta requests válidas
6. **Validación de entrada**: Validación en cliente y servidor

## 🔧 Configuración Avanzada

### Cambiar contraseña de guardia (API.gs)

```javascript
const CONTRASENA_GUARDIA = 'Tu_Nueva_Contraseña';
```

### Ajustar expiración de QR (API.gs)

```javascript
const EXPIRACION_HORAS = 48; // Cambiar de 24 a 48 horas
```

### Personalizar sonidos (config.js)

```javascript
SOUND: {
  SUCCESS_FREQUENCY: 880, // Hz (mayor = más agudo)
  SUCCESS_DURATION: 200,  // ms
  ERROR_FREQUENCY: 440,   // Hz
  ERROR_DURATION: 500     // ms
}
```

## 📊 Base de Datos

El sistema usa Google Sheets con dos hojas:

### Hoja: Agenda
- ID
- Fecha Creación
- Fecha Expiración
- Nombre
- Empresa
- Motivo
- Persona Visita
- Placa
- Usado (SI/NO)
- Fecha Ingreso
- Hora Ingreso
- Tiene Foto (SI/NO)
- Foto (base64)
- Estado

### Hoja: Retiro_Producto
Misma estructura que Agenda

## 🐛 Solución de Problemas

### "API_URL no configurada"
**Solución**: Editar `config.js` y agregar la URL de Google Apps Script

### "No se puede acceder a la cámara"
**Solución**: 
- Permitir acceso a cámara en navegador
- En iOS, usar Safari (no Chrome)
- En Android, permite permisos en configuración

### "QR inválido"
**Solución**: 
- Asegurarse que config.js tiene la URL correcta
- Verificar que el deployment de Apps Script está activo
- Probar con la acción `test`: `https://tu-app.com/guardia/?accion=test`

### "Conexión rechazada CORS"
**Solución**: 
- Verificar que Apps Script está deployado como Web App
- Confirmar "Who has access" es "Anyone"

## 📝 API Endpoints

### POST: Crear registro
```javascript
{
  tipo: "agenda|retiro",
  nombre: "string",
  empresa: "string",
  motivo: "string",
  personaVisita: "string",
  placa: "string (opcional)",
  tieneFoto: boolean,
  fotoData: "base64 string (opcional)"
}
```

**Respuesta exitosa:**
```javascript
{
  success: true,
  qrData: "base64 encoded QR data",
  id: "VIS-20260519-1234",
  mensaje: "Registro exitoso"
}
```

### GET: Validar QR
```
GET ?accion=validarQR&contrasena=PASS&qrData=DATA
```

### GET: Historial
```
GET ?accion=historial&contrasena=PASS
```

### GET: Test
```
GET ?accion=test
```

## 🚀 Mejoras Realizadas

- ✅ Centralización de configuración en `config.js`
- ✅ Mejor manejo de errores y validaciones
- ✅ Uso de `Utilities.base64Encode()` en Apps Script
- ✅ Verificación de existencia de elementos DOM
- ✅ Manifests mejorados con iconos SVG
- ✅ Comentarios y documentación completa
- ✅ Fallback para entrada manual de QR
- ✅ Códigos de error específicos en respuestas

## 📄 Licencia

Este proyecto es de código abierto. Úsalo libremente.

## 👨‍💻 Soporte

Para reportar problemas o sugerencias, crea un issue en el repositorio.

---

**Última actualización**: Mayo 2026
**Versión**: 1.0.0 (Mejorada)
