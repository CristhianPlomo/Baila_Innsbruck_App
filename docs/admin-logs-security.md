# Logs de seguridad y actividad del panel admin

## Objetivo

El panel `/admin/logs` debe servir para revisar los eventos importantes de Baila Innsbruck y reaccionar ante problemas operativos o de seguridad. No debe convertirse en un registro invasivo de cada clic del alumno ni permitir que el navegador fabrique o borre su propia evidencia.

La pantalla ya está integrada en el menú del administrador y lee el historial de `public.system_logs` junto con las notificaciones abiertas de `public.admin_notifications`. Las notificaciones se muestran solo dentro del admin; no se ha conectado ningún envío por email.

## Qué se debe registrar

Se recomienda registrar eventos de negocio y seguridad, no toda la navegación:

- Autenticación: inicio correcto, inicio fallido, recuperación, confirmación y cierre de sesión.
- Autorización: acceso admin denegado, intento de modificar un recurso sin permiso y fallos de RLS.
- Comercio: compra creada, pago en clase solicitado, aprobación, rechazo, reembolso y creación de entitlement.
- QR y asistencia: QR inválido, QR caducado, escaneo aceptado, intento duplicado y consumo de una sesión.
- Catálogo: creación, edición, publicación y borrado de cursos, estilos, niveles, clases y eventos.
- Sistema: errores de servidor, rate limit y fallos de integraciones importantes.

Los errores del navegador pueden enviarse únicamente como telemetría mínima y anonimizada mediante una Edge Function limitada. No se deben enviar valores de formularios, tokens, URLs con credenciales, valores QR completos ni datos de pago.

## Modelo recomendado

Se propone separar el historial inmutable de las alertas accionables:

1. `public.system_logs`: flujo append-only existente, ampliado con severidad, categoría, `request_id`, origen y estado de alerta.
2. `public.admin_notifications`: alertas derivadas para que el administrador vea los avisos abiertos sin modificar el evento original.
3. Funciones protegidas en Supabase: único punto para crear eventos críticos, aplicar rate limiting, eliminar secretos y comprobar el rol real.

Campos mínimos de `system_logs`:

```text
id, created_at, user_id, admin_id, severity, category, action_type,
entity_type, entity_id, message, metadata, request_id, source, alert_status
```

Campos mínimos de `admin_notifications`:

```text
id, audit_log_id, created_at, severity, status,
title, message, read_at, read_by, resolved_at, resolved_by
```

`metadata` debe ser una lista blanca de valores operativos pequeños. Nunca debe contener contraseñas, tokens, cookies, claves privadas, SMTP, datos de tarjeta, IP sin anonimizar ni el valor QR original.

## RLS y permisos

- `admin`: puede consultar todos los logs y gestionar alertas.
- `teacher`: en una fase posterior solo podrá ver eventos operativos de QR, asistencia y sus clases; no autenticación, datos financieros ni alertas de seguridad globales.
- `student/user`: no puede consultar ninguna de estas tablas.
- Las comprobaciones deben usar `public.user_roles` o una función de servidor fiable, nunca `user_metadata` editable.
- El flujo de creación debe ejecutarse en servidor. No se debe exponer `service_role` en el cliente.
- Reconocer o resolver una alerta también debe generar un nuevo evento de auditoría.

## Alertas iniciales

Una alerta crítica debería generarse, por ejemplo, ante varios intentos fallidos de acceso administrativo, intentos repetidos de consumir un QR ya usado, cambios de rol no autorizados o una ráfaga anormal de peticiones. La detección debe combinar rate limiting, eventos del servidor y los logs de Supabase; el frontend por sí solo no puede detectar de forma fiable un hackeo.

## Retención y privacidad

Definir una retención limitada antes de producción, por ejemplo 12 meses para auditoría operativa y menos tiempo para telemetría técnica. El administrador debe poder filtrar por periodo, severidad, categoría, actor, objetivo y `request_id`, pero no descargar datos sensibles sin una política específica.

## Estado de activación

La estructura ya está aplicada en Supabase:

- `system_logs` conserva el historial y solo el administrador puede leerlo.
- `admin_notifications` tiene RLS y solo el administrador puede leer sus avisos.
- `record_security_event` solo puede ejecutarse con `service_role` y filtra metadatos sensibles antes de guardar.
- La antigua `log_action` ya no puede ejecutarse desde `anon` ni `authenticated`.
- La resolución de notificaciones se ha movido al esquema privado y deberá invocarse desde una Edge Function protegida.

Queda como siguiente fase instrumentar las compras, aprobaciones, QR, cambios del catálogo y eventos de Auth para que llamen a `record_security_event` desde servidor. No se enviarán emails: el canal aprobado es exclusivamente el panel admin.
