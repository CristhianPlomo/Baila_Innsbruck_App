# Visión del producto

## Baila Innsbruck App

Baila Innsbruck App es la aplicación oficial de **BAILA INNSBRUCK - DANCE STUDIO**. Centraliza la relación entre la academia, sus alumnos y el equipo administrativo.

La primera etapa está pensada para una única academia. No se diseñará como una plataforma multiempresa hasta que exista una necesidad real y se apruebe una arquitectura específica para ello.

## Objetivos principales

- Permitir que los alumnos consulten cursos, precios, compras, membresías, packs y asistencias.
- Permitir que el administrador gestione usuarios, productos, cursos, pagos y accesos.
- Registrar asistencias mediante códigos QR y consumir sesiones de forma segura.
- Mantener una experiencia visual coherente con la web oficial de Baila Innsbruck.
- Poder instalarse como PWA y mantener una base preparada para Android e iOS mediante Capacitor.

## Alcance del MVP

| Área | Incluido en el MVP | No incluido todavía |
| --- | --- | --- |
| Acceso | Login, registro controlado, recuperación de contraseña y redirección por rol. | SSO empresarial y login social. |
| Alumno | Perfil, calendario, compras, productos activos, QR y asistencias. | Chat, gamificación y comunidad social. |
| Admin | Usuarios, cursos, productos, pagos, aprobaciones, QR y eventos. | Contabilidad completa, nóminas y CRM avanzado. |
| Pagos | Pago en clase y aprobación manual. | Stripe, PayPal, Apple Pay y Google Pay. |
| Móvil | PWA y base preparada para Capacitor. | Publicación inmediata en App Store y Google Play. |
| SaaS | Una sola academia. | Multiempresa, superadmin y facturación a terceros. |

Este alcance tiene prioridad sobre ideas futuras. Cualquier funcionalidad que no figure como incluida deberá tratarse como backlog y no incorporarse al MVP sin una decisión explícita.

## Usuarios, roles y perfiles

El login es único. Después de autenticar al usuario, la aplicación debe consultar su rol y redirigirlo al área correspondiente. El rol visual del frontend nunca sustituye las políticas de seguridad, los roles confiables ni las reglas RLS de Supabase.

| Rol | Acceso | Puede ser estudiante | Estado |
| --- | --- | --- | --- |
| `admin` | Panel administrativo completo. | No por defecto. | Activo. |
| `student` / `user` | Dashboard del alumno cuando tenga condición de estudiante. | Sí / no. | Activo. |
| `teacher` | Asistencias y clases asignadas. | No por defecto. | Preparado para una fase futura. |

### Separación entre User y Student

- `User` y `Student` representan la misma identidad base: Auth, email, sesión, rol y preferencias.
- Las compras, packs, membresías, cursos y asistencias se relacionan con esa identidad, pero no deben mezclarse con los datos técnicos de autenticación.
- Un usuario puede existir sin ser estudiante y seguirá siendo un `user` hasta que se le asigne la condición correspondiente.
- Un administrador no recibe automáticamente un perfil de estudiante ni datos académicos por el hecho de tener una cuenta de Auth.
- Los datos de Auth, los datos de perfil, los datos académicos y los datos financieros deben mantenerse separados por responsabilidad y permisos.
- Cualquier vista previa del perfil del alumno dentro del administrador será únicamente una representación visual hasta que se seleccione un usuario real; no debe crear ni convertir registros académicos.

## Categorías comerciales

Las categorías comerciales y sus condiciones deben proceder del brief oficial de Baila Innsbruck y de la fuente de datos aprobada. Los precios no se codificarán directamente en React y el usuario no podrá asignarse a sí mismo una categoría con descuento.

| Categoría | Asignación | Uso comercial | Control |
| --- | --- | --- | --- |
| `regular` | Por defecto. | Precio estándar. | Automático. |
| `student` | Después de validación. | Tarifa de estudiante para clases regulares. | Aprobación o comprobación. |
| `erasmus` | Según las reglas del brief. | Solo productos permitidos para Erasmus. | No puede comprar productos restringidos. |
| `member` | Membresía anual activa. | Beneficios y tarifas de miembro. | Derivada de un entitlement activo. |

### Reglas de descuentos y acceso

- Un `student` puede obtener descuento en las clases regulares.
- La categoría `student` no aplica descuento a workshops, fiestas ni otros eventos.
- Un `member` conserva los beneficios de estudiante para las clases regulares y añade las ofertas o tarifas de miembro para workshops, fiestas y eventos.
- La condición de `member` depende de una membresía anual activa; no se puede activar desde el frontend sin una validación comercial válida.
- La condición de `student` requiere validación o aprobación antes de aplicar la tarifa reducida.
- La condición `erasmus` debe limitarse a los productos permitidos por el brief y bloquear los productos restringidos.
- El precio final y la elegibilidad deben calcularse desde datos confiables del backend o de Supabase, no desde valores enviados por el cliente.

## Modelo académico

La aplicación debe separar la disciplina, el nivel y la oferta concreta. Esta separación evita duplicaciones y permite administrar horarios y ventas de forma coherente.

| Entidad | Qué representa | Ejemplos |
| --- | --- | --- |
| `course` | Disciplina o estilo. | Salsa, Bachata, Zouk, Heels, Popping. |
| `level` | Nivel reutilizable. | Beginner, Improver, Intermediate, Open Level. |
| `course_offering` | Oferta concreta impartida y vendible. | Salsa On1 Beginner, Bachata Sensual Intermediate. |
| `session` | Clase real en una fecha y hora. | Martes, 18:00-19:00. |

### Reglas académicas

- Las compras y las inscripciones se vinculan a un `course_offering`, nunca directamente a un `level`.
- Solo se muestran niveles que tengan ofertas activas.
- Cada oferta puede definir profesor, horario, duración, sala, capacidad y métodos de compra.
- Una oferta puede tener varias sesiones reales, y cada sesión debe conservar su fecha y hora concretas.
- El administrador debe poder distinguir entre la disciplina reutilizable, el nivel y la oferta que realmente se vende.

### Navegación del catálogo y evolución de Bachata

- Cada curso define un `catalog_mode`: `direct` muestra sus clases y niveles inmediatamente; `styles` añade primero una pantalla de estilos.
- Salsa utiliza actualmente el modo `styles`.
- Bachata utiliza actualmente el modo `direct`: al elegir Bachata, el alumno ve directamente todas sus clases disponibles.
- Bachata queda marcado con `supports_styles = true` para poder evolucionar sin cambiar el modelo ni romper compras o inscripciones históricas.
- Los estilos previstos para una fase futura son Bachata Tradicional, Bachata Sensual, Bachazouk y Bachata Influence.
- Estos estilos no se publicarán ni se mostrarán al alumno hasta que el administrador decida activarlos y se hayan reasignado las ofertas correspondientes.

## Productos y lógica de precios

Los precios deben importarse del brief actualizado de la web. Supabase será la fuente de verdad y el frontend solo mostrará el resultado calculado por el servidor.

### Tarifas aprobadas de cursos regulares

Una compra con una única clase o curso seleccionado se considera `solo`. Una compra con dos selecciones se considera `duo`. Cada clase o estilo añadido al carrito cuenta como una selección comercial. El usuario elige primero mensualidad, trimestre de 11 semanas o bono; después se resuelve el precio según su categoría comercial validada.

| Plan | Regular | Miembro / estudiante | Erasmus |
|---|---:|---:|---:|
| Solo · mensual | 64 € | 59 € | 39 € |
| Solo · trimestre (11 semanas) | 180 € | 165 € | 105 € |
| Duo · mensual | 99 € | 89 € | 59 € |
| Duo · trimestre (11 semanas) | 285 € | 255 € | 165 € |
| Full Month · mensual (3 o más cursos) | 130 € | 120 € | No disponible por ahora |

Con tres o más clases o cursos seleccionados en el carrito dejan de ofrecerse los planes Solo, Duo y trimestral. El usuario puede elegir entre Full Month mensual, con acceso a todos los cursos regulares, o el Package flexible de 10 sesiones. Para contratar Solo o Duo debe retirar selecciones hasta dejar una o dos respectivamente. Erasmus permanece fuera de estas dos opciones por ahora.

### Opciones flexibles aprobadas

| Opción | Regular | Miembro / estudiante | Erasmus |
|---|---:|---:|---:|
| Primera clase de prueba | Gratis | Gratis | Gratis |
| Clase individual | 18 € | 17 € | 10 € |
| Bono de 10 clases | 160 € | 150 € | No disponible |
| Membresía anual | 25 €/año | 25 €/año | No disponible |

La categoría con descuento nunca se autoasigna desde el navegador. Para compras reales, Supabase debe validar la categoría, el producto, el número de cursos distintos y el precio vigente antes de crear o aprobar la compra.

### Reglas de precios

- Nunca se debe confiar en un importe enviado por el navegador.
- El servidor debe validar que el producto está activo, que la categoría del cliente es válida y que el precio está vigente.
- Los cambios de precio solo los puede realizar un administrador autorizado.
- Cada compra debe conservar snapshots del nombre, precio y categoría aplicados en el momento de la compra para mantener el histórico.

### Tipos de producto

| Tipo | Lógica | Ejemplo |
| --- | --- | --- |
| `monthly` | Acceso durante un periodo según el plan y la oferta. | Plan Solo, Plan Dúo. |
| `single_class` | Acceso a una sesión concreta. | Single class. |
| `standard_pack` | Créditos reutilizables en cursos permitidos. | Pack de 10 sesiones. |
| `fixed_course_package` | Curso cerrado con sesiones y fechas concretas. | Curso especial de 8 o 10 sesiones. |
| `membership` | Derecho anual que activa beneficios. | Membresía anual. |
| `event` | Entrada para un evento concreto. | Workshop o fiesta. |

Los productos deben indicar qué ofertas o sesiones permiten consumir, qué categorías comerciales pueden comprarlos y qué regla de acceso aplican. La lógica final debe resolverse en backend/RLS y no mediante condiciones de precio aisladas en React.

## Flujo de compra y aprobación

La compra y su aprobación deben seguir este flujo controlado:

1. El usuario elige un producto disponible.
2. La aplicación envía únicamente el identificador del producto y el método de pago.
3. El servidor recupera el precio, las reglas y la categoría del usuario desde Supabase.
4. Se crea una compra con estado `pending`.
5. El administrador verifica el pago y aprueba o rechaza la compra.
6. La aprobación crea el `entitlement`, la membresía o el pack correspondiente.
7. El alumno ve el producto activo en su dashboard.

La interfaz ofrece dos vías: pago con tarjeta y `Comprar en clase`. Durante el desarrollo, la tarjeta de prueba confirma una compra local sin cobro real. En producción, el servidor creará una sesión de Stripe Checkout usando únicamente identificadores del catálogo, resolverá el precio desde Supabase y redirigirá al usuario a Stripe. El retorno a la app será solo una confirmación visual: la compra y su entitlement se activarán mediante el webhook verificado de Stripe. `Comprar en clase` crea una solicitud pendiente que debe aprobar o rechazar un profesor o administrador autorizado; ambas acciones se ejecutarán en servidor y quedarán registradas en el log de auditoría.

Los pases mensuales siguen el mes natural: el QR caduca el último día del mes correspondiente. Si el pase mensual se compra a partir del día 15, se aplica una reducción del 40 % sobre la tarifa validada. Esta regla deberá calcularse en servidor antes de crear la compra real.

### Regla de seguridad

Una compra nunca se aprueba desde el navegador. Ningún usuario puede cambiar directamente el importe, estado, producto o número de sesiones. El cliente solo solicita la operación y muestra el resultado confirmado por el servidor.

## Derechos de acceso y consumo

La compra no es el derecho de uso en sí. Cuando una compra se aprueba, el servidor crea un `entitlement` o acceso activo que define qué puede utilizar el alumno.

- **Membresía:** vigencia anual y beneficios asociados.
- **Pack:** número total de sesiones, sesiones utilizadas y fecha de caducidad.
- **Curso cerrado:** inscripción a una oferta concreta.
- **Evento:** entrada válida para un evento determinado.
- Las operaciones de aprobación, creación de accesos y consumo deben ser idempotentes para evitar duplicados por dobles clics o reintentos.

## QR y control de asistencia

- El alumno muestra su QR personal o el QR asociado a un producto válido.
- Mensualidades, trimestre, Full Month y Package generan un QR. Los packages mantienen además un QR independiente por sesión para permitir su consumo controlado.
- Un QR asociado a una compra pendiente puede mostrarse al alumno, pero no se activa hasta que el pago haya sido aprobado.
- El administrador escanea el QR y el servidor valida identidad, `entitlement`, vigencia y compatibilidad con la clase o evento.
- Cuando corresponde, el servidor consume una sesión de forma atómica.
- La asistencia registra fecha, sesión, usuario y operador que realizó el escaneo.
- Una sesión ya consumida no puede reutilizarse.
- El alumno solo puede consultar sus registros de asistencia; nunca modificarlos.

## Pantallas del MVP

### Área pública

- Inicio.
- Login y recuperación de contraseña.
- Cursos activos.
- Horario.
- Precios.
- Eventos.
- Información legal.
- Selector de idioma.

### Área del alumno

- Dashboard.
- Perfil.
- Categoría comercial.
- Compras y pedidos.
- Productos activos.
- Membresía.
- Packs y sesiones.
- Historial de asistencia.
- QR personal.

### Área del administrador

- Dashboard.
- Usuarios.
- Estudiantes y verificaciones.
- Compras pendientes.
- Cursos y niveles.
- Ofertas y horarios.
- Productos y precios.
- Membresías y packs.
- Escáner QR.
- Asistencias.
- Eventos.
- Logs esenciales.

Cada pantalla deberá tener una ruta y un permiso claramente definido. Las pantallas administrativas no deben limitarse a ocultarse visualmente: el acceso debe estar protegido por autenticación, rol confiable y políticas de Supabase.

## Arquitectura técnica

Para el MVP se adoptará una arquitectura de **monolito modular**: una sola aplicación y una sola academia, organizada por dominios claros. No se introducirán microservicios ni una arquitectura multiempresa hasta que exista una necesidad real.

| Capa | Tecnología / decisión | Responsabilidad |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite. | Interfaz, navegación y experiencia de usuario. |
| UI | Sistema visual CSS existente + componentes React pequeños + Lucide. | Identidad visual coherente con Baila Innsbruck, responsive y accesible. |
| Rutas | React Router con rutas públicas, de alumno y de administrador. | Separar áreas y aplicar protección de acceso. |
| Estado remoto | TanStack Query. | Caché, carga, errores, revalidación e invalidación de datos de Supabase. |
| Estado local | Estado de React y utilidades del dominio. | Formularios, filtros, menús y estado efímero de la interfaz. |
| Backend | Supabase Auth, PostgreSQL, Storage, RLS y Edge Functions. | Identidad, persistencia, archivos, políticas y operaciones servidoras. |
| Lógica crítica | RPC para transacciones atómicas y Edge Functions para orquestación segura. | Precios, aprobación, entitlements, consumo de sesiones y operaciones idempotentes. |
| Móvil | PWA ahora; Capacitor cuando se cierre el alcance nativo. | Instalación web y futuro empaquetado Android/iOS. |

### Decisiones técnicas

- Se mantendrá el sistema CSS actual en lugar de introducir Tailwind o shadcn/ui, porque ya existe una identidad visual funcional y coherente. Se podrán extraer componentes y tokens compartidos sin cambiar de sistema de estilos.
- La aplicación se organizará por dominios: `auth`, `catalog`, `commerce`, `attendance`, `events` y `admin`, aunque inicialmente puedan convivir en un mismo bundle.
- TanStack Query gestionará el estado procedente de Supabase; React state se reservará para interacción local y no para simular persistencia remota.
- El navegador solo usará la clave publicable de Supabase. Nunca tendrá claves service-role, secretos ni lógica de aprobación privilegiada.
- RLS será la primera barrera de autorización. Las Edge Functions y RPC solo ampliarán permisos cuando la operación lo necesite y deberán comprobar identidad, rol, ownership e idempotencia.
- Los precios, categorías comerciales, entitlements y consumos se calcularán o validarán en servidor. React mostrará estados confirmados, no decisiones de seguridad.
- La arquitectura debe permitir añadir Capacitor sin duplicar la lógica de autenticación, permisos, catálogo, compras o asistencias.

## Seguridad obligatoria

Estas reglas son requisitos de arquitectura y no detalles opcionales de implementación:

- Todas las tablas expuestas mediante la Data API deben tener RLS habilitado y políticas específicas para cada operación.
- El alumno solo puede consultar y modificar los datos propios que el modelo permita; nunca puede acceder a datos de otros usuarios.
- Las acciones administrativas deben validar el rol y el ownership en la base de datos o en una Edge Function segura, no solo en el frontend.
- La clave `service_role` y cualquier secreto nunca se expone en el frontend, en variables `VITE_*`, en logs ni en el repositorio.
- La autorización no puede depender de `user_metadata`, porque el usuario puede modificarlo. Debe usar roles confiables, `app_metadata` controlada o tablas protegidas como `user_roles`.
- El cliente no puede actualizar directamente `purchases`, `packs`, `entitlements`, `attendance`, precios, estados de aprobación ni número de sesiones.
- Los precios se resuelven desde el catálogo y el servidor valida producto activo, categoría, vigencia, permisos y precio actual.
- Las compras, aprobaciones, entitlements y consumos deben ser idempotentes y transaccionales para evitar duplicados o doble consumo.
- Los QR de asistencia deben ser de corta duración o estar firmados, comprobar compatibilidad y evitar reutilización o replay.
- El servidor debe validar todos los identificadores, fechas, cantidades, estados y entradas recibidas desde el cliente. No se confía en datos ocultos en formularios ni en importes enviados por el navegador.
- Las funciones `SECURITY DEFINER` no se usarán por defecto. Si una operación las necesita, deberá comprobar explícitamente `auth.uid()`, limitar permisos y vivir fuera de un esquema expuesto.
- Los logs deben registrar aprobaciones, rechazos, consumos y ajustes manuales sin guardar contraseñas, tokens, claves ni datos innecesarios.
- Las migraciones deben estar versionadas, revisadas y alineadas con el esquema real de Supabase. No se modificará producción sin revisar SQL, RLS y permisos.
- Los secretos locales deben vivir fuera del control de versiones y las dependencias deben mantener su lockfile actualizado.
- Deben existir límites de frecuencia y protección contra abuso en login, recuperación de contraseña, invitaciones, compras, escaneo QR y endpoints administrativos.
- La aplicación debe minimizar los datos personales almacenados, respetar los permisos de acceso y preparar eliminación o corrección controlada de datos conforme a las obligaciones de privacidad aplicables.
- Cualquier cambio de autenticación, autorización, pagos o asistencia debe incluir pruebas de casos permitidos, denegados, repetidos y manipulados.

## PWA, Android e iOS

La primera entrega será una aplicación web responsive e instalable como PWA. Más adelante se podrá empaquetar con Capacitor para Android e iOS sin reescribir la lógica de negocio.

### Primera entrega: PWA

- Manifest con el nombre `Baila Innsbruck App`, iconos, colores de marca, idioma y configuración de instalación.
- Modo standalone y pantalla de carga o fallback offline sencilla.
- Service worker limitado a recursos públicos y al shell de la aplicación.
- Las páginas autenticadas, compras, precios, entitlements, asistencias y operaciones administrativas no se deben servir desde una caché obsoleta ni permitir escrituras privilegiadas offline.
- Las consultas públicas pueden usar estrategias de caché controladas, pero siempre deben revalidarse cuando el usuario vuelva a estar online.
- La aplicación debe avisar claramente cuando está offline y no presentar datos antiguos como confirmaciones actuales.
- Rendimiento, accesibilidad, teclado, lectores de pantalla y `prefers-reduced-motion` deben validarse también en pantallas pequeñas.

### Preparación para Capacitor

- La lógica de autenticación, permisos, catálogo, compras y asistencias permanecerá en módulos web compartidos.
- Cámara/QR, notificaciones y deep links se añadirán mediante adaptadores de plataforma, sin duplicar reglas de negocio.
- Los deep links deben contemplar rutas de login, confirmación de email, recuperación de contraseña, productos, eventos y asistencias.
- Las notificaciones requerirán consentimiento explícito y una estrategia de permisos distinta para web, Android e iOS.
- La compilación iOS requerirá macOS, Xcode y una cuenta de Apple Developer; Android requerirá Android Studio, firma de aplicación y configuración de Google Play.
- La publicación en tiendas solo se hará después de validar la versión web, los flujos de autenticación, los pagos manuales, el QR y la política de privacidad.

### Proceso de releases

- Cada versión debe tener un número de versión, notas de cambio y una referencia clara al commit o release aprobado.
- Antes de publicar se validarán lint, build, pruebas, instalación PWA, actualización del service worker y rutas protegidas.
- Las versiones móviles deben pasar una prueba de humo en dispositivos reales o emuladores antes de subirlas a las tiendas.
- Debe existir una estrategia de recuperación para una versión web defectuosa y un control de compatibilidad entre frontend y Edge Functions.

## Límites de la primera etapa

- Supabase seguirá siendo la fuente de verdad para autenticación, perfiles, roles y datos de negocio.
- No se introducirán migraciones ni tablas nuevas hasta revisar y aprobar el modelo remoto existente.
- La autorización administrativa dependerá de roles confiables y de RLS, nunca de datos editables desde el navegador.
- Las acciones sensibles, como crear usuarios de Auth o consumir sesiones, deberán ejecutarse mediante un mecanismo seguro del lado servidor.
- Los datos de demostración solo podrán actuar como fallback visual; no deben presentarse como registros guardados en Supabase.

## Fases de desarrollo

Las fases ordenan dependencias técnicas y de negocio. Algunas tareas de interfaz pueden avanzar en paralelo, pero ninguna fase puede saltarse las reglas de seguridad y validación que le correspondan.

| Fase | Resultado esperado |
| --- | --- |
| Fase 0 - Auditoría y especificación | Brief, código, assets y esquema Supabase revisados; requisitos, riesgos, permisos y criterios de aceptación definidos. Sin programar a ciegas. |
| Fase 1 - Fundaciones | Sistema visual, layout responsive, navegación, traducciones, rutas base y PWA inicial. |
| Fase 2 - Auth, roles y perfiles | Login, registro controlado, recuperación, redirección por rol y separación User/Student. |
| Fase 3 - Modelo académico | `course`, `level`, `course_offering`, `session`, horario, profesor, sala, capacidad y visibilidad de ofertas activas. |
| Fase 4 - Catálogo comercial | Productos, categorías `regular`/`student`/`erasmus`/`member`, precios, elegibilidad, packs y membresías. |
| Fase 5 - Operaciones administrativas | Usuarios, verificaciones de estudiantes, cursos, niveles, ofertas, horarios, productos, precios, eventos y logs esenciales. |
| Fase 6 - Compra y derechos de acceso | Compra `pending`, pago manual, aprobación o rechazo, snapshots y creación segura de entitlements, membresías o packs. |
| Fase 7 - Área del alumno | Dashboard, perfil, categoría comercial, pedidos, productos activos, membresía, packs, sesiones, QR personal e historial de asistencia. |
| Fase 8 - QR y asistencia | Escáner administrativo, validación servidor, compatibilidad, consumo atómico, bloqueo de reutilización y registro de operador. |
| Fase 9 - Mobile release | PWA endurecida, Capacitor, cámara, deep links, notificaciones y preparación de Android/iOS. |

### Trabajo transversal en todas las fases

- RLS, validación de roles, ownership y permisos antes de exponer datos o acciones.
- Pruebas de autenticación, lógica de negocio, casos límite, duplicados y accesos denegados.
- Lint, build, revisión de seguridad, logs útiles y documentación de decisiones.
- Verificación de responsive, accesibilidad, rendimiento y `prefers-reduced-motion`.
- Cambios importantes mediante branch/PR y sin tratar `main` como un entorno de pruebas.
- Ninguna funcionalidad se considera terminada si solo funciona con el fallback local y no se ha verificado su comportamiento remoto.

## Criterios de aceptación

Una fase solo se considera terminada cuando cumple todos estos criterios:

- La funcionalidad funciona en móvil y escritorio.
- No existen errores de TypeScript, lint ni build.
- Los estados `loading`, vacío, error, sin permisos, offline y éxito están diseñados y traducidos.
- Los textos están preparados para español, alemán e inglés.
- Los datos sensibles están protegidos por RLS o lógica server-side verificable.
- Las escrituras remotas muestran éxito únicamente después de recibir confirmación de Supabase.
- La fase incluye instrucciones o casos de prueba manual para el flujo principal y sus errores.
- Las pruebas cubren, cuando corresponda, acceso autorizado, acceso denegado, datos manipulados, doble envío y reintentos.
- Se verifica la ruta real y el comportamiento responsive cuando el cambio afecta a la interfaz.
- No se continúa a la siguiente fase sin validar la anterior y registrar cualquier bloqueo pendiente.

## Información que debe tomarse del brief web

Antes de implementar precios, categorías comerciales o identidad visual definitiva, se debe leer el brief actualizado de la web oficial y extraer sus datos sin inventarlos.

- Tipografías oficiales y sus pesos.
- Tabla final de precios 2026/2027 o la versión vigente aprobada.
- Reglas definitivas para `regular`, `student`, `erasmus` y `member`.
- Beneficios, vigencia y restricciones de las membresías.
- Cursos, niveles, ofertas y horarios vigentes.
- Textos legales y política de privacidad.
- Fotografías, derechos y usos autorizados.
- Colores, logotipo, iconos y otros elementos oficiales de marca.

El brief de la web se utilizará como referencia de solo lectura desde este proyecto. No se copiarán precios, fotografías o textos definitivos a la aplicación hasta confirmar que la versión consultada es la vigente.

## Principios finales de decisión

- Seguridad antes que velocidad.
- Simplicidad antes que sobreingeniería.
- Datos aprobados del brief antes que suposiciones.
- Supabase como fuente de verdad.
- Una función bien probada antes que cinco funciones incompletas.
- Frontend para la experiencia; servidor, RLS y RPC/Edge Functions para decisiones críticas.
- Las operaciones comerciales deben ser trazables, idempotentes y reversibles cuando sea posible.
- La privacidad y la accesibilidad forman parte de la definición de terminado.
- Primero Baila Innsbruck; el SaaS multiacademia se evaluará más adelante.

## Criterios de calidad

- Cada cambio relevante debe tener una intención y unos criterios de aceptación claros.
- La autenticación, autorización, lógica de negocio e integraciones con Supabase tendrán prioridad en las pruebas.
- Ningún cambio se considerará terminado solo porque compile: debe revisarse seguridad, accesibilidad, responsive, casos límite y comportamiento real.
- Los cambios importantes deberán validarse mediante lint, build y pruebas automatizadas cuando exista el runner correspondiente.
