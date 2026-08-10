# Alta manual de usuarios

## Qué cubre el formulario

`Admin → Add user` permite preparar una ficha completa para alumnos que necesitan ayuda presencial:

- identidad, email, teléfono y dirección;
- rol de acceso a la App (`user`, `student` o `admin`, que son los valores actuales de `public.user_roles`);
- rol de baile (`leader`, `follower` o `both`);
- categoría comercial (`regular`, `student`, `member` o `erasmus`);
- verificación administrativa de cualquier categoría con descuento;
- invitación por email o contraseña temporal;
- notas internas para la academia.

El rol de acceso y la categoría comercial son conceptos distintos. La selección de Student, Member o Erasmus no debe conceder un descuento sin verificación del equipo.

En el esquema remoto actual, Member y Erasmus no son roles de autenticación. Se deben registrar mediante la capa comercial: `public.memberships` y, cuando corresponda, `public.student_verifications`. Los datos personales que todavía no tienen columnas propias en `public.profiles` requieren una decisión de modelo antes de hacer el endpoint productivo.

## Seguridad de credenciales

El navegador nunca llama a `auth.admin.*` ni contiene una service-role key. Si se configura `VITE_ADMIN_USER_ENDPOINT`, el cliente solo envía una solicitud autenticada al endpoint seguro mediante el token de la sesión actual. El endpoint debe:

1. verificar el JWT y el rol confiable del administrador;
2. validar de nuevo todos los campos y la categoría comercial;
3. crear el usuario mediante el servidor con `email_confirm: true` únicamente cuando el método elegido lo permita;
4. guardar los datos de perfil y el rol en tablas protegidas;
5. exigir cambio de contraseña si se usó una contraseña temporal;
6. enviar el email de invitación o recuperación mediante el proveedor configurado;
7. registrar la acción en un audit log sin guardar la contraseña temporal.

Mientras el endpoint no esté configurado, el formulario muestra el estado pendiente y no crea ningún usuario local ni remoto. Esto evita una falsa sensación de alta realizada y evita que una contraseña se quede guardada en el navegador.

## Integración pendiente

La función de servidor todavía necesita un contrato revisado y aprobado junto con las tablas reales del proyecto. No se deben aplicar migraciones ni políticas nuevas desde este formulario. Al conectar el endpoint habrá que probar autorización, duplicados de email, cambio obligatorio de contraseña, errores de email, RLS y auditoría.
