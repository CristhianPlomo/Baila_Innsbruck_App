# Home y contenido editorial

El Home ahora está organizado para responder rápidamente a cuatro preguntas del usuario:

1. ¿Qué puedo hacer ahora? Cursos y horario semanal.
2. ¿Qué está pasando en la academia? Eventos destacados y avisos de la escuela.
3. ¿Qué ventajas tengo? Ofertas de temporada, packages y membresía anual.
4. ¿Cómo funciona la App? El bloque `Everything in one place` queda al final como resumen de cursos, compras, QR y espacio seguro.

## Estado actual

- Los eventos del Home se leen desde `public.events` cuando existen eventos activos publicados.
- Si no hay datos remotos disponibles, se muestran tarjetas de construcción para poder revisar el diseño sin presentar una escritura falsa en Supabase.
- La membresía se presenta como una compra anual de 25 € y mantiene separadas sus ventajas de los productos de clases y eventos.
- Las ofertas y el aviso de academia son contenido de construcción. No aplican descuentos ni crean compras todavía.

## Modelo editorial pendiente de aprobar

Para que el administrador pueda decidir qué aparece en el Home de forma persistente, el modelo remoto debería incorporar, mediante una migración revisada y aprobada:

- `events.is_featured boolean not null default false`.
- `events.featured_order integer not null default 0`.
- `events.visible_from timestamptz` y `events.visible_until timestamptz`.
- Una tabla `promotions` para campañas como verano, Halloween, San Valentín y Black Friday, con fechas, CTA, categoría elegible, producto aplicable y estado de publicación.
- Una tabla `studio_notices` o `academic_breaks` para anunciar semanas sin clases, fechas de cierre, motivo y fecha de regreso.

El frontend no debe guardar estos campos en `localStorage` como sustituto de Supabase en producción. Hasta aprobar el esquema, el Home mantiene un fallback visual y el adapter de eventos solo usa columnas que existen actualmente.

Cuando se apruebe el modelo, el panel de eventos deberá añadir los controles `Destacado`, `Orden`, `Visible desde` y `Visible hasta`; las promociones y avisos deberían tener sus propias secciones administrativas y validación de fechas. Los precios y descuentos finales seguirán validándose en servidor.
