# Instalación del RSVP (Google Apps Script + Google Sheets)

1. Crea una hoja de cálculo nueva en Google Sheets (ej. "RSVP Vitecsa"). La pestaña "Asistentes" se crea sola con encabezados `Fecha | Nombre completo` en la primera confirmación.
2. En la hoja: **Extensiones > Apps Script**.
3. Borra el contenido de `Code.gs`, pega todo `rsvp-apps-script.gs` y guarda.
4. **Implementar > Nueva implementación**, engranaje > **App web**.
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
5. Pulsa **Implementar** y autoriza los permisos (cuenta > Configuración avanzada > Ir al proyecto).
6. Copia la **URL de la app web** (termina en `/exec`).
7. En el HTML de la invitación, pégala en la constante `RSVP_URL`:
   ```js
   const RSVP_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
   ```
8. Prueba: abre la URL en el navegador; debe mostrar `{"ok":true,"servicio":"rsvp"}`.

## Cambios posteriores al código

Guardar no basta: la URL `/exec` sirve la versión implementada. Para publicar cambios **sin cambiar la URL**:
**Implementar > Gestionar implementaciones > editar (lápiz) > Versión: Nueva versión > Implementar.**
(Si creas una "Nueva implementación", obtendrás otra URL y tendrás que actualizar `RSVP_URL`.)

## Límites

El script acepta como máximo 500 registros (`MAX_REGISTROS`) y cuerpos de hasta 1000 caracteres. Al llegar al tope responde "Se alcanzó el límite de registros. Contacta al organizador." Para cambiarlo edita la constante y publica nueva versión.
