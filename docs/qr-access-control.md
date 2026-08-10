# Control de accesos QR

## Estado actual

El panel `/admin/qr-control` centraliza los registros QR de construcción que existen en el dispositivo actual:

- clases gratuitas con validez de 14 días;
- pases mensuales, trimestrales y Full Month;
- QR individual de cada sesión de un package;
- solicitudes de pago «Comprar en clase» pendientes.

El personal puede pegar un valor QR, usar la cámara cuando el navegador dispone de `BarcodeDetector`, buscar al alumno, revisar su estado y actualizar el flujo de construcción. Un pase mensual o trimestral se puede comprobar varias veces; un QR de clase gratuita o de sesión de package solo se puede consumir una vez.

La interfaz está implementada como un control de personal reutilizable. Cuando se cree el panel de profesor, debe utilizar el mismo componente y la misma validación, cambiando únicamente el rol autorizado y el alcance de las clases.

## Límite importante de la fase de construcción

Los registros actuales proceden de `localStorage` porque las compras simuladas y las clases gratuitas todavía se generan localmente. Esto permite probar el flujo en el mismo dispositivo, pero no es una fuente válida para producción ni permite sincronizar varios dispositivos.

No se ha modificado el esquema remoto de Supabase sin aprobación.

## Modelo de producción recomendado

Antes de publicar el escaneo real, Supabase debe convertirse en la fuente de verdad mediante entidades separadas:

```text
purchase
  └─ access_entitlement
       ├─ access_qr_token_hash
       ├─ valid_from / valid_until
       ├─ status: pending | active | expired | refunded | revoked
       └─ access_sessions
            ├─ number
            ├─ consumed_at
            └─ consumed_by

access_scan_events
  ├─ entitlement_id / session_id
  ├─ scanned_by
  ├─ scanned_at
  ├─ result
  └─ class_instance_id
```

La aplicación no debe guardar el QR en claro como autorización. El QR debe contener un token aleatorio de un solo uso o un identificador opaco; el servidor guarda su hash. La operación de validación y consumo debe ser atómica:

1. autenticar al administrador o profesor;
2. comprobar `user_roles` en servidor/RLS;
3. comprobar vigencia, reembolso, categoría y compatibilidad con la clase;
4. consumir la sesión con una actualización condicional cuando sea un package;
5. registrar siempre el resultado en `access_scan_events`;
6. devolver al panel solo el resultado necesario, sin exponer datos sensibles.

El panel web nunca debe recibir una `service_role`/secret key. La operación real debe vivir en una RPC protegida o Edge Function con JWT, y las políticas deben permitir que un profesor solo valide clases asignadas a él, mientras que el administrador tenga el alcance completo.

## Siguiente migración, pendiente de aprobación

Cuando se apruebe el modelo, crear una migración versionada para `access_entitlements`, `access_sessions` y `access_scan_events`, activar RLS, añadir índices por hash/estado/vigencia y crear una función atómica de validación. Después habrá que sustituir el adaptador de construcción de `src/lib/qr-access.ts` por el adaptador remoto y probar simultáneamente el rol `admin` y el futuro rol `teacher`.
