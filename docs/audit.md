# Informe de comprobación · Oliva Legal

Fecha: 13 de octubre de 2026. Alcance: demo de portfolio. Build estático de producción, servido localmente en http://127.0.0.1:4377/. Lighthouse 13.5.0, Chrome instalado, perfiles separados y tres navegaciones equivalentes por perfil. Perfil móvil: 412 × 823, red simulada y ralentización de CPU de 4×; escritorio: configuración desktop de Lighthouse. Sesiones temporales con restablecimiento de almacenamiento.

## Mediciones finales

| Métrica                  | Móvil: mediana (rango)    | Escritorio: mediana (rango) |
| ------------------------ | ------------------------- | --------------------------- |
| Rendimiento              | 99 (99–99)                | 100 (100–100)               |
| Accesibilidad automática | 100 (100–100)             | 100 (100–100)               |
| Buenas prácticas         | 100 (100–100)             | 100 (100–100)               |
| SEO                      | 63 (63–63)                | 63 (63–63)                  |
| LCP laboratorio          | 1.803 s (1.802–1.955)     | 0.363 s (0.363–0.365)       |
| CLS laboratorio          | 0.00304 (0.00304–0.00304) | 0.00231 (0.00231–0.00277)   |
| TBT laboratorio          | 0 ms (0–0)                | 0 ms (0–0)                  |

SEO incluye la exclusión deliberada de indexación de un despacho ficticio. No se inventa un dominio comercial, dirección, credenciales, valoraciones ni datos estructurados de un negocio real. Noindex es el único fallo binario final de Lighthouse y está admitido para este alcance.

Presupuesto conservador del build: JavaScript 961 bytes gzip y CSS 5,084 bytes gzip. No representa transferencia inicial. En la navegación móvil se observaron 5,585 bytes de documento, 5,408 de CSS, 65,748 de imagen y 73,748 de fuentes; incluye cabeceras. El JavaScript está integrado en el documento. No hay recursos de terceros en el recorrido. Las fuentes codificadas suman 72,788 bytes y la imagen responsive mayor ocupa aproximadamente 64 KiB.

## Verificaciones

- **Diseño: aprobado.** Capturas completas a 320, 375, 768, 1440 y 1920 px, revisadas por secciones. Titulares, imagen, leyenda y formulario sin colisiones ni desplazamiento horizontal. Capturas de detalle de móvil y presentación de escritorio incluidas.
- **Recorridos: aprobado.** Nueve pruebas: navegación, selección de área, FAQ, menú con Escape, diálogos y devolución de foco, formulario inválido y válido, ausencia de envío POST y almacenamiento, navegación sin JavaScript y movimiento reducido.
- **Accesibilidad: aprobado dentro del alcance probado.** Axe sin infracciones en los cinco tamaños. Enlace de salto con foco, errores por campo, primer campo inválido enfocado, confirmación anunciada y enfocada. Comprobación de reflow a 320 px y texto del cuerpo ampliado al 200%. Esta última prueba no equivale a una auditoría completa de zoom del navegador.
- **Rendimiento: aprobado.** Tres mediciones por perfil y presupuestos cubiertos. Sin bloqueos medidos.
- **SEO y semántica: aprobado para demo.** Idioma español, un h1, título y descripción propios, landmarks, textos alternativos y enlaces internos verificados. Noindex/nofollow deliberado.
- **Captación: no aplicable a solicitudes reales.** Validación en navegador, sin backend, sin cookies de seguimiento ni analítica. Identificación visible de demo y marca ficticia.
- **Entrega: aprobado localmente.** Fuente, workflow de GitHub Pages, documentación, pruebas, capturas y resumen de auditoría disponibles.

## Correcciones y límites

Se corrigió el foco del enlace de salto, la disponibilidad de la navegación sin JavaScript y el nombre accesible del logotipo. El botón de demostración permanece deshabilitado si JavaScript no está activo. La validación conserva los campos ante un error y el formulario se vacía tras la prueba válida.

Pendientes: lectura manual con lector de pantalla, modos de contraste del sistema y zoom real del navegador. Los resultados automáticos no certifican WCAG. Las mediciones son de laboratorio local y no prueban rendimiento del alojamiento, Core Web Vitals p75, INP real ni conversiones. Datos de campo y cohortes requieren tráfico real. Las condiciones profesionales y un backend seguro serían requisitos de una futura adaptación comercial.

Evidencias: `audits/summary.json`, `audits/gates.json`, `audits/evidence.json`, `audits/journeys.json`, `audits/seo.json` y `docs/screenshots/`. Los informes brutos por ejecución y por viewport se conservan localmente en `audits/`, fuera del control de versiones.
