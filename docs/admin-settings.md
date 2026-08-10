# Admin Settings

## Estado actual

La sección `Admin → Settings` funciona como un centro operativo para la academia. Incluye:

- identidad y datos de contacto del estudio;
- zona horaria y moneda de referencia;
- aforo, ventana de reserva, cancelación y validez de accesos;
- clase gratuita, pagos en clase y visibilidad del catálogo;
- avisos de nuevos registros, solicitudes de pago y poco aforo;
- estado de Supabase, RLS y Stripe sin mostrar credenciales privadas;
- recordatorio de las reglas de seguridad y auditoría.

Durante la fase de construcción los valores editables se guardan en el navegador con la clave `baila-admin-studio-settings`. Esto permite probar la experiencia sin inventar una tabla remota ni dar por guardado un dato que todavía no tiene un contrato de base de datos aprobado.

## Siguiente integración segura

Antes de conectar el guardado real, hay que aprobar un modelo único para la configuración de la academia. La opción recomendada es una tabla protegida, por ejemplo `public.studio_settings`, con una sola fila activa para esta academia:

- `studio_id` o identificador fijo de la academia;
- `settings jsonb` validado por una función de servidor;
- `updated_by`, `updated_at` y versión del documento;
- auditoría de cambios sensibles.

La escritura no debe ejecutarse como un `update` abierto desde el navegador. Debe pasar por una RPC o Edge Function que compruebe el rol confiable del administrador, valide rangos y registre quién cambió qué. Las lecturas públicas deben limitarse, como máximo, a los campos necesarios para mostrar el catálogo.

## Pendientes antes de producción

1. Revisar el esquema existente y confirmar si ya hay una tabla de configuración equivalente.
2. Aprobar el SQL de tabla, grants y políticas RLS antes de aplicar cualquier migración.
3. Crear la acción de servidor para leer y guardar ajustes con control de rol y auditoría.
4. Sustituir el adaptador local por el adaptador remoto y mostrar errores de Supabase sin perder los cambios del formulario.
5. Añadir pruebas de autorización, validación de rangos, concurrencia y recuperación ante fallo de red.
6. No guardar aquí claves de Stripe, service-role keys, contraseñas SMTP ni otros secretos.

La pantalla actual deja visible el estado de estas integraciones para que el administrador sepa qué está conectado y qué queda pendiente.
