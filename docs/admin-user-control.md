# Control completo del perfil de usuario

## Qué puede revisar ahora el administrador

La sección `/admin/users` permite buscar por nombre, apellidos o email y abrir una ficha completa del alumno. La ficha agrupa:

- identidad, email, teléfono, dirección y rol de baile cuando esos campos están disponibles;
- rol de aplicación y estado de confirmación del email;
- categoría comercial y origen de la validación;
- membresías, vigencia y sesiones restantes;
- compras, importe, estado, método de pago, caducidad y sesiones del package;
- registros de clase gratuita, clases elegidas y plazo de 14 días;
- resumen de accesos activos, compras pendientes y sesiones disponibles;
- preferencias de idioma, tema, recordatorios, avisos y accesibilidad.

El detalle lee las tablas existentes (`profiles`, `user_roles`, `memberships` y `purchases`) con consultas tolerantes a datos incompletos. También muestra los registros de construcción creados en el dispositivo actual. Una consulta opcional que falle no bloquea la ficha completa.

## Límite actual de Auth y datos personales

El registro actual guarda parte de los datos en `auth.users.raw_user_meta_data`. Esa información no debe leerse directamente desde el navegador del administrador ni utilizarse para autorizar acciones. Por eso la ficha marca como “no disponible” los campos que todavía no están materializados en una tabla pública protegida.

Antes de producción, la solución recomendada es:

1. Mantener una tabla `public.profiles` con los datos operativos del alumno: nombre, apellidos, email, dirección, código postal, ciudad, teléfono y preferencia leader/follower/both.
2. Mantener `public.user_roles` como fuente de autorización, con `admin`, `teacher`, `student` y `user`.
3. Crear una tabla `public.user_preferences` para idioma, tema, accesibilidad y notificaciones.
4. Leer los detalles administrativos mediante una Edge Function autenticada, por ejemplo `admin-user-detail`, que:
   - valida el JWT del administrador o profesor;
   - comprueba el rol en `user_roles` en servidor;
   - consulta los datos necesarios con el contexto de RLS;
   - usa la capacidad Auth Admin solo dentro de la función y nunca en el cliente;
   - devuelve únicamente los campos necesarios para la ficha.
5. Registrar cambios sensibles en `public.audit_log` y exigir una acción server-side para editar rol, categoría, membresía, ajustes o estado de acceso.

## Modelo de acceso recomendado

```text
profiles / user_preferences
          |
          +--> memberships
          +--> purchases --> access_entitlements --> access_sessions
          +--> free_trial_registrations
          +--> attendance / qr_scan_events
```

Las compras son histórico inmutable. El acceso vigente se calcula desde `access_entitlements`; las sesiones de un package se consumen mediante una operación atómica del servidor. El panel solo presenta el resultado y solicita acciones protegidas.

## Seguridad y despliegue

- No se ha añadido ninguna service key ni secreto al frontend.
- No se ha modificado el esquema remoto de Supabase.
- Las nuevas tablas deben crearse con RLS, índices por `user_id` y políticas separadas para alumnos, profesores y administradores.
- La migración y la Edge Function deben revisarse y aprobarse antes de aplicarlas al proyecto remoto.
- La interfaz actual funciona como una capa segura de transición: muestra datos remotos disponibles y señala de forma visible los campos que aún necesitan el modelo definitivo.
