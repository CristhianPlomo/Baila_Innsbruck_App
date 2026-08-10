# Cámara del control QR

El control QR del administrador abre la cámara trasera en teléfonos y tablets mediante `getUserMedia` con `facingMode: environment`.

- El navegador debe permitir el acceso a la cámara.
- La aplicación debe ejecutarse en `https` o en `localhost`.
- Cuando existe `BarcodeDetector`, el QR se lee automáticamente.
- Si el navegador no ofrece detección automática, la cámara permanece abierta y el valor QR puede pegarse en el campo manual.
- La acción de aprobar, rechazar o consumir sigue pasando por la misma validación existente.

La validación productiva todavía deberá trasladarse a Supabase mediante una función protegida y una operación atómica de consumo. La cámara del navegador solo captura el código; nunca debe decidir por sí sola si un acceso es válido.
