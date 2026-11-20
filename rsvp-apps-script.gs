/**
 * RSVP - Confirmación de asistencia (Google Apps Script, Web App).
 * Script vinculado a la hoja de cálculo. Escribe en la hoja "Asistentes".
 */

var NOMBRE_HOJA = 'Asistentes';
var ENCABEZADOS = ['Fecha', 'Nombre completo'];
var MAX_REGISTROS = 500;   // tope total de filas de datos
var MAX_BODY = 1000;       // tamaño máximo del cuerpo (caracteres)

// Solo letras (con acentos, ñ, ü), espacios, apóstrofe, guion y punto.
var PATRON_NOMBRE = /^[A-Za-zÀ-ÖØ-öø-ÿ' .\-’]+$/;

/** GET: sirve para probar que el servicio está activo. */
function doGet() {
  return json_({ ok: true, servicio: 'rsvp' });
}

/** POST: body JSON como texto en e.postData.contents. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  var bloqueado = false;
  try {
    // Parseo del cuerpo
    var datos;
    var contenido = e && e.postData ? e.postData.contents : null;
    if (!contenido || contenido.length > MAX_BODY) {
      return json_({ ok: false, error: 'Solicitud no válida. Intenta de nuevo.' });
    }
    try {
      datos = JSON.parse(contenido);
    } catch (err) {
      return json_({ ok: false, error: 'Solicitud no válida. Intenta de nuevo.' });
    }
    if (!datos || typeof datos !== 'object') {
      return json_({ ok: false, error: 'Solicitud no válida. Intenta de nuevo.' });
    }

    // Honeypot: si viene lleno, fingir éxito sin guardar
    if (datos.sitio !== undefined && datos.sitio !== null && String(datos.sitio).trim() !== '') {
      return json_({ ok: true, duplicado: false });
    }

    // Validación del nombre
    var v = validarNombre_(datos.nombre);
    if (v.error) {
      return json_({ ok: false, error: v.error });
    }
    var nombre = v.valor;

    // Sección crítica: leer + escribir
    try {
      lock.waitLock(10000);
      bloqueado = true;
    } catch (errLock) {
      return json_({ ok: false, error: 'Estamos recibiendo muchas confirmaciones. Intenta de nuevo en unos segundos.' });
    }

    var hoja = obtenerHoja_();
    var clave = normalizar_(nombre);
    var ultima = hoja.getLastRow();
    if (ultima > 1) {
      var existentes = hoja.getRange(2, 2, ultima - 1, 1).getValues();
      for (var i = 0; i < existentes.length; i++) {
        if (normalizar_(existentes[i][0]) === clave) {
          return json_({ ok: true, duplicado: true });
        }
      }
    }

    // Tope total de registros
    if (Math.max(ultima - 1, 0) >= MAX_REGISTROS) {
      return json_({ ok: false, error: 'Se alcanzó el límite de registros. Contacta al organizador.' });
    }

    hoja.appendRow([new Date(), protegerFormula_(nombre)]);
    return json_({ ok: true, duplicado: false });

  } catch (error) {
    // Registro interno; al usuario solo un mensaje genérico
    console.error(error);
    return json_({ ok: false, error: 'No pudimos registrar tu confirmación. Intenta de nuevo más tarde.' });
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}

/** Valida y limpia el nombre. Devuelve {valor} o {error}. */
function validarNombre_(entrada) {
  if (typeof entrada !== 'string') {
    return { error: 'Escribe tu nombre completo.' };
  }
  var nombre = entrada.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (nombre.length < 3) {
    return { error: 'El nombre es muy corto. Escribe tu nombre completo.' };
  }
  if (nombre.length > 100) {
    return { error: 'El nombre es demasiado largo (máximo 100 caracteres).' };
  }
  if (!PATRON_NOMBRE.test(nombre)) {
    return { error: 'El nombre solo puede contener letras, espacios, apóstrofe, guion y punto.' };
  }
  var palabras = nombre.split(' ').filter(function (p) {
    return /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(p);
  });
  if (palabras.length < 2) {
    return { error: 'Escribe tu nombre completo (nombre y apellido).' };
  }
  return { valor: nombre };
}

/** Minúsculas, sin acentos, espacios colapsados (para comparar duplicados). */
function normalizar_(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Defensa en profundidad contra inyección de fórmulas. */
function protegerFormula_(valor) {
  return /^[=+\-@]/.test(valor) ? "'" + valor : valor;
}

/** Obtiene la hoja "Asistentes"; la crea con encabezados si no existe. */
function obtenerHoja_() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getSheetByName(NOMBRE_HOJA);
  if (!hoja) {
    hoja = libro.insertSheet(NOMBRE_HOJA);
  }
  // Hoja nueva o existente pero vacía: escribir encabezados
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(ENCABEZADOS);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

/** Devuelve un ContentService JSON. */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
