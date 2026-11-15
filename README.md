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
| `datos.csv` | Datos del local de demo (nombre, eslogan, contacto). Se usa solo si `datosCsvUrl` está vacío. |
| `img/` | Logo, portada y fotos del negocio (la plantilla viene vacía, solo `.gitkeep`). |
| `herramientas/generar_qr.py` | Genera el QR estático (corrección de errores H). |
| `herramientas/plantilla-menu.xlsx` | Planilla modelo para subir a Google Sheets (se regenera con `crear_plantilla_xlsx.py`). |

## Fotos (opcionales)

La plantilla **no incluye fotos**: cada negocio sube las suyas. Nada depende de ellas; sin fotos el menú se ve completo, con filas de nombre, descripción y precio.

- **Dónde**: copiá los archivos a `img/` y escribí el nombre en la columna `imagen` (`cafe.jpg`), o pegá un link `https://…` o un link compartido de Google Drive (*Cualquier persona con el enlace*).
- **Tamaño recomendado**: productos, **mínimo 800 px de ancho**; portada, **1600 px de ancho o más**, horizontal. Mejor `.jpg` o `.webp` de menos de 400 KB cada una para que cargue rápido con datos móviles.
- Una foto borrosa o recortada de un póster rinde peor que ninguna foto: si no tenés una buena, dejá la celda vacía.

## La planilla (columnas)

Una fila = un producto. Fila nueva = producto nuevo. Las categorías aparecen **en el orden en que figuran** en la planilla.

| Columna | Obligatoria | Qué va | Ejemplos |
|---|---|---|---|
| `categoria` | Sí* | Sección del menú. Si queda vacía, usa la de la fila de arriba. | `Cafetería` |
| `producto` | **Sí** | Nombre. Las filas sin producto se ignoran. | `Café Clásico` |
| `descripcion` | No | Texto corto. | `El de siempre, intenso y bien caliente.` |
| `precio` | No | Número o texto. | `4500` · `4.500` · `$ 4.500` · `4.500,50` · `Consultar` |
| `precio_anterior` | No | Si está, se muestra tachado junto al precio nuevo (oferta). | `5.200` |
| `imagen` | No | Foto del producto (opcional): nombre de archivo en `img/`, URL `https://…` o link compartido de Google Drive. Vacía = el producto se muestra como fila sin foto. | `cafe.jpg` |
| `disponible` | No | `SI` o `NO`. Con `NO` se ve atenuado con la etiqueta **Agotado** (no se oculta). | `NO` |
| `etiqueta` | No | Texto corto sobre la tarjeta. | `Nuevo` · `Promo` · `Vegano` |
| `icono` | No | Un emoji para la categoría; se toma el primero no vacío de cada categoría. Si no hay, se elige uno automático según el nombre (café, desayuno, postre, bebida, sándwich, pizza…). | `☕` |

Detalles útiles:

- Los **encabezados** no distinguen mayúsculas ni tildes, y admiten alias: `nombre`/`plato` = `producto`, `foto` = `imagen`.
- Las **columnas extra** se ignoran.
- **Precios**: se muestran con la moneda de `config.js` y formato argentino (`$ 4.500,50`). Si el texto no es un número (`Consultar`), se muestra tal cual.
- **Imágenes de Drive**: el archivo tiene que estar compartido como *Cualquier persona con el enlace*. Se convierte solo a una miniatura. Si una imagen falla, la tarjeta se muestra sin foto.
- **Producto agotado**: aparece atenuado pero legible, con la etiqueta *Agotado* y un solo precio tachado.
- **Con y sin foto en la misma sección**: primero van los productos con foto (tarjetas grandes) y debajo los que no la tienen (filas con el precio a la derecha). Ojo: esto cambia el orden de la planilla dentro de la categoría; si querés un orden exacto, poné foto a todos los productos de esa categoría o a ninguno.

## La hoja `Datos` (nombre del local y contacto)

El dueño puede cambiar el nombre del local y los datos de contacto desde la planilla, sin tocar código. La hoja `Datos` tiene dos columnas: `campo` (no se cambia) y `valor` (lo que se edita).

| campo | Qué va |
|---|---|
| `nombre` | Nombre del local. |
| `eslogan` | Frase bajo el nombre. |
| `direccion`, `horarios` | Textos del encabezado. |
| `whatsapp` | Solo números, con código de país: `5491112345678`. |
| `instagram`, `facebook` | Usuario o URL completa. |
| `logo`, `portada` | Archivo de `img/`, link `https://…` o link compartido de Drive. |

- Un valor **vacío** usa el de `config.js`, que queda como respaldo.
- Se publica igual que la hoja del menú (ver checklist) y el link va en `datosCsvUrl`.
- Si la hoja no está publicada o no carga, el menú usa `config.js` y la última versión que guardó el celular.
- Moneda, colores y decoración siguen solo en `config.js`.

## `config.js`

Los campos vacíos no muestran nada.

| Campo | Qué es |
|---|---|
| `nombre` | Nombre del local. Si no hay logo, se muestra en letra script. |
| `eslogan` | Frase bajo el nombre. |
| `logo` | Ruta (ej. `img/logo.png`). Vacío = se usa el nombre. |
| `portada` | Foto del encabezado (opcional). Vacío = el encabezado usa un fondo hecho con CSS (degradado cálido de la paleta con textura y granos de café). |
| `sheetCsvUrl` | Link CSV publicado de Google Sheets. **Vacío = lee `menu.csv` local (demo).** |
| `datosCsvUrl` | Link CSV publicado de la hoja `Datos`. Lo que tenga valor ahí reemplaza `nombre`, `eslogan`, `direccion`, `horarios`, `whatsapp`, `instagram`, `facebook`, `logo` y `portada` de este archivo. **Vacío = lee `datos.csv` local.** |
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
- [ ] Repetir la publicación eligiendo la hoja **Datos** y pegar ese otro link en `datosCsvUrl`.
- [ ] Completar la hoja **Datos** (nombre, eslogan, WhatsApp, redes, dirección, horarios) y, como respaldo, los mismos campos en `config.js`.
- [ ] (Opcional) Subir las fotos **propias del negocio**: logo, portada y productos a `img/`, o usar links de Drive en la columna `imagen`. Sin fotos el menú se ve completo igual.
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
2. **Portada**: es opcional. Para usar una, subí tu foto a `img/` y poné `portada: "img/portada.jpg"` en `config.js`. Conviene una **foto horizontal de al menos 1600 px de ancho**, con el motivo hacia la derecha; se ajusta con `background-size: cover`, así que se recorta según la pantalla.
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
