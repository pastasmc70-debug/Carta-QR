# Menú QR para cafeterías y locales

Sitio **100 % estático** (HTML + CSS + JS, sin frameworks, sin build, sin servidor) pensado como **Template repository de GitHub**: un repo por negocio, mismo diseño. El dueño del local maneja todo desde una planilla de **Google Sheets** (precios, productos nuevos, agotados, fotos). No toca código.

Se publica en GitHub Pages y el QR (estático) apunta a un dominio propio, así que **nunca hay que reimprimirlo**.

## Cómo funciona

```
Google Sheet ──(Publicar en la web, CSV)──► app.js ──► menú en el celular
                                              │
                    si falla la red ──► último menú guardado en el teléfono (localStorage)
                    si no hay guardado ──► menu.csv local (demo)
                    si todo falla ──► mensaje amable con botón "Reintentar"
```

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura de la página (no se toca). |
| `style.css` | Diseño. Todos los colores están como variables en `:root`. |
| `app.js` | Lee la planilla y dibuja el menú. |
| `config.js` | **Lo único que se edita por cliente** (nombre, links, colores…). |
| `menu.csv` | Menú de demo. Se usa solo si `sheetCsvUrl` está vacío o como último recurso. |
| `img/` | Logo, portada y fotos de productos. |
| `herramientas/generar_qr.py` | Genera el QR estático (corrección de errores H). |
| `herramientas/plantilla-menu.xlsx` | Planilla modelo para subir a Google Sheets (se regenera con `crear_plantilla_xlsx.py`). |

## La planilla (columnas)

Una fila = un producto. Fila nueva = producto nuevo. Las categorías aparecen **en el orden en que figuran** en la planilla.

| Columna | Obligatoria | Qué va | Ejemplos |
|---|---|---|---|
| `categoria` | Sí* | Sección del menú. Si queda vacía, usa la de la fila de arriba. | `Cafetería` |
| `producto` | **Sí** | Nombre. Las filas sin producto se ignoran. | `Café Clásico` |
| `descripcion` | No | Texto corto. | `El de siempre, intenso y bien caliente.` |
| `precio` | No | Número o texto. | `4500` · `4.500` · `$ 4.500` · `4.500,50` · `Consultar` |
| `precio_anterior` | No | Si está, se muestra tachado junto al precio nuevo (oferta). | `5.200` |
| `imagen` | No | Nombre de archivo en `img/`, URL `https://…` o link compartido de Google Drive. | `cafe.jpg` |
| `disponible` | No | `SI` o `NO`. Con `NO` se ve atenuado con la etiqueta **Agotado** (no se oculta). | `NO` |
| `etiqueta` | No | Texto corto sobre la tarjeta. | `Nuevo` · `Promo` · `Vegano` |
| `icono` | No | Un emoji para la categoría; se toma el primero no vacío de cada categoría. Si no hay, se elige uno automático según el nombre (café, desayuno, postre, bebida, sándwich, pizza…). | `☕` |

Detalles útiles:

- Los **encabezados** no distinguen mayúsculas ni tildes, y admiten alias: `nombre`/`plato` = `producto`, `foto` = `imagen`.
- Las **columnas extra** se ignoran.
- **Precios**: se muestran con la moneda de `config.js` y formato argentino (`$ 4.500,50`). Si el texto no es un número (`Consultar`), se muestra tal cual.
- **Imágenes de Drive**: el archivo tiene que estar compartido como *Cualquier persona con el enlace*. Se convierte solo a una miniatura. Si una imagen falla, la tarjeta se muestra sin foto.
- **Producto agotado**: aparece atenuado, con la etiqueta *Agotado* y un solo precio tachado.

## `config.js`

Los campos vacíos no muestran nada.

| Campo | Qué es |
|---|---|
| `nombre` | Nombre del local. Si no hay logo, se muestra en letra script. |
| `eslogan` | Frase bajo el nombre. |
| `logo` | Ruta (ej. `img/logo.png`). Vacío = se usa el nombre. |
| `portada` | Imagen del encabezado. |
| `sheetCsvUrl` | Link CSV publicado de Google Sheets. **Vacío = lee `menu.csv` local (demo).** |
| `moneda` | Símbolo, ej. `$`. |
| `whatsapp` | Solo números, con código de país: `5491112345678`. |
| `instagram`, `facebook` | Usuario o URL completa. |
| `direccion`, `horarios` | Textos del encabezado. |
| `credito` | Opcional, línea chica al final. |
| `decoracion` | `true`/`false`: granos de café y hojas decorativos. |
| `colores` | Variables CSS del tema: `--fondo`, `--tarjeta`, `--texto`, `--suave`, `--acento`, `--linea`. |

## Alta de un negocio nuevo (checklist)

- [ ] Crear el repo desde la plantilla (**Use this template** en GitHub).
- [ ] Crear el Google Sheet: subir `herramientas/plantilla-menu.xlsx` a Drive y abrirla con Google Sheets.
- [ ] Publicarlo como CSV: **Archivo > Compartir > Publicar en la web**, elegir la hoja del menú y formato **CSV**.
- [ ] Pegar ese link en `sheetCsvUrl` de `config.js`.
- [ ] Completar el resto de `config.js` (nombre, WhatsApp, redes, dirección, horarios).
- [ ] Subir logo, portada y fotos a `img/` (o usar links de Drive).
- [ ] Activar GitHub Pages: **Settings > Pages > Deploy from a branch > `main` / root**.
- [ ] Dominio propio: agregar un archivo `CNAME` con el dominio, apuntar el DNS a GitHub Pages y tildar **Enforce HTTPS**.
- [ ] Generar el QR: `python herramientas/generar_qr.py https://tudominio.com` (requiere `pip install qrcode[pil]`).
- [ ] Probar escaneando el QR con un celular y cambiando un precio en la planilla.
- [ ] Borrar el `menu.csv` de demo o reemplazarlo por el menú real (queda como respaldo).

## Cambiar el tema (otro tipo de negocio)

1. **Colores**: en `config.js > colores` (o en `:root` de `style.css`). Ejemplo para una heladería clara:

   ```js
   colores: {
     "--fondo": "#fff4f8",
     "--tarjeta": "#ffffff",
     "--texto": "#3a2230",
     "--suave": "#8a6a7a",
     "--acento": "#ff7aa8",
     "--linea": "#f2a6c3"
   }
   ```
   Los extras (`--texto-claro`, `--suave-claro`, `--grano`, `--hoja`, `--verde`…) también viven en `:root`; si el fondo es claro, ajustá `--texto-claro` a un tono oscuro.
2. **Portada**: reemplazá `img/portada.jpg` (o cambiá `portada`). Una foto horizontal, con el motivo hacia la derecha, funciona mejor.
3. **Logo**: poné `logo: "img/logo.png"`.
4. **Íconos**: se asignan por el nombre de la categoría; para forzar uno, usá la columna `icono`.
5. **Decoración**: `decoracion: false` apaga granos y hojas (recomendado fuera de cafeterías).

## Probar en local

```bash
python -m http.server 8000
```

Abrí <http://localhost:8000>. (Abrir `index.html` con doble clic no funciona: el navegador bloquea la lectura del CSV.)

## Notas

- Google tarda hasta unos **5 minutos** en reflejar los cambios de la planilla publicada.
- El QR es estático: mientras el dominio sea el mismo, no hay que reimprimirlo.
- Sin dependencias ni build: el sitio sigue funcionando años sin mantenimiento.
