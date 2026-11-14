/* =====================================================================
   Menú QR — lógica. Sin dependencias.
   Lee la planilla (CSV publicado de Google Sheets) y dibuja el menú.
   Todo lo que viene de la planilla se inserta con textContent: nunca
   con innerHTML (evita XSS).
   ===================================================================== */
(function () {
  'use strict';

  var C = (typeof window !== 'undefined' && window.CONFIG) || {};
  var LS_PREFIX = 'menuqr:csv:v1:';

  /* ================================================================== */
  /*  Utilidades de texto                                               */
  /* ================================================================== */
  function limpiar(v) { return v == null ? '' : String(v).trim(); }
  function sinTildes(s) { return limpiar(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function clave(s) { return sinTildes(s).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }

  /* ================================================================== */
  /*  Parser CSV (comillas, comas y saltos de línea dentro de campos,   */
  /*  BOM, \r\n, \r)                                                    */
  /* ================================================================== */
  function detectarSeparador(texto) {
    // Mira la primera línea fuera de comillas: si hay más ";" que "," usa ";".
    var comas = 0, puntos = 0, q = false;
    for (var i = 0; i < texto.length; i++) {
      var ch = texto[i];
      if (ch === '"') q = !q;
      else if (!q && (ch === '\n' || ch === '\r')) break;
      else if (!q && ch === ',') comas++;
      else if (!q && ch === ';') puntos++;
    }
    return puntos > comas ? ';' : ',';
  }

  function parseCSV(texto) {
    texto = String(texto == null ? '' : texto);
    if (texto.charCodeAt(0) === 0xFEFF) texto = texto.slice(1);
    var sep = detectarSeparador(texto);
    var filas = [], fila = [], campo = '', enComillas = false, i = 0, n = texto.length;

    function cerrarCampo() { fila.push(campo); campo = ''; }
    function cerrarFila() {
      cerrarCampo();
      var vacia = true;
      for (var k = 0; k < fila.length; k++) { if (fila[k].trim() !== '') { vacia = false; break; } }
      if (!vacia) filas.push(fila);
      fila = [];
    }

    while (i < n) {
      var ch = texto[i];
      if (enComillas) {
        if (ch === '"') {
          if (texto[i + 1] === '"') { campo += '"'; i += 2; continue; }
          enComillas = false; i++; continue;
        }
        campo += ch; i++; continue;
      }
      if (ch === '"' && campo.trim() === '') { campo = ''; enComillas = true; i++; continue; }
      if (ch === sep) { cerrarCampo(); i++; continue; }
      if (ch === '\r') { cerrarFila(); i += (texto[i + 1] === '\n') ? 2 : 1; continue; }
      if (ch === '\n') { cerrarFila(); i++; continue; }
      campo += ch; i++;
    }
    if (campo !== '' || fila.length) cerrarFila();
    return filas;
  }

  /* ================================================================== */
  /*  Encabezados con alias                                             */
  /* ================================================================== */
  var ALIAS = {
    categoria: ['categoria', 'categorias', 'category', 'seccion', 'rubro'],
    producto: ['producto', 'nombre', 'plato', 'item', 'articulo', 'product'],
    descripcion: ['descripcion', 'detalle', 'desc', 'description'],
    precio: ['precio', 'valor', 'importe', 'price'],
    precio_anterior: ['precio_anterior', 'precio_antes', 'precio_previo', 'precio_viejo', 'precio_lista', 'antes'],
    imagen: ['imagen', 'foto', 'img', 'image', 'fotografia'],
    disponible: ['disponible', 'disponibilidad', 'stock', 'activo'],
    etiqueta: ['etiqueta', 'tag', 'badge'],
    icono: ['icono', 'emoji', 'icon']
  };

  function mapaEncabezados(fila) {
    var mapa = {};
    for (var col = 0; col < fila.length; col++) {
      var k = clave(fila[col]);
      for (var canon in ALIAS) {
        if (ALIAS[canon].indexOf(k) !== -1 && mapa[canon] === undefined) { mapa[canon] = col; break; }
      }
    }
    return mapa;
  }

  function filasAItems(filas) {
    if (!filas.length) throw new Error('csv-vacio');
    var mapa = mapaEncabezados(filas[0]);
    if (mapa.producto === undefined) throw new Error('csv-sin-producto');
    function get(f, canon) { return mapa[canon] === undefined ? '' : limpiar(f[mapa[canon]]); }

    var items = [], catActual = '';
    for (var r = 1; r < filas.length; r++) {
      var f = filas[r], producto = get(f, 'producto');
      if (!producto) continue;                        // fila sin producto: se ignora
      var cat = get(f, 'categoria');
      if (cat) catActual = cat; else cat = catActual; // categoría vacía: hereda la anterior
      items.push({
        categoria: cat || 'Menú',
        producto: producto,
        descripcion: get(f, 'descripcion'),
        precio: get(f, 'precio'),
        precioAnterior: get(f, 'precio_anterior'),
        imagen: get(f, 'imagen'),
        disponible: esDisponible(get(f, 'disponible')),
        etiqueta: get(f, 'etiqueta').slice(0, 24),
        icono: get(f, 'icono')
      });
    }
    return items;
  }

  function esDisponible(v) {
    var s = sinTildes(v);
    return !(s === 'no' || s === 'n' || s === '0' || s === 'false' || s === 'agotado' || s === 'x');
  }

  /* ================================================================== */
  /*  Precios (formato es-AR: "4.500", "4.500,50", "$ 4.500")           */
  /* ================================================================== */
  function parsePrecio(raw) {
    var s = limpiar(raw);
    if (!s) return { vacio: true };
    var t = s.replace(/\s+/g, '').replace(/^(ARS|AR\$|U\$S|USD|US\$)/i, '').replace(/\$/g, '');
    if (!/^\d[\d.,]*$/.test(t)) return { texto: s };      // "Consultar", "A confirmar"...
    var punto = t.indexOf('.') !== -1, coma = t.indexOf(',') !== -1, num;
    if (punto && coma) {
      // el último separador es el decimal
      if (t.lastIndexOf(',') > t.lastIndexOf('.')) num = t.replace(/\./g, '').replace(',', '.');
      else num = t.replace(/,/g, '');
    } else if (coma) {
      if (/^\d{1,3}(,\d{3})+$/.test(t)) num = t.replace(/,/g, '');        // 4,500 (miles)
      else num = t.replace(',', '.');                                     // 4,5 / 4,50 (decimal)
    } else if (punto) {
      if (/^\d{1,3}(\.\d{3})+$/.test(t)) num = t.replace(/\./g, '');      // 4.500 (miles)
      else if (/^\d+\.\d{1,2}$/.test(t)) num = t;                         // 4500.5 (decimal)
      else num = t.replace(/\./g, '');
    } else num = t;
    var n = parseFloat(num);
    if (!isFinite(n)) return { texto: s };
    return { numero: n };
  }

  function formatearNumero(n) {
    var entero = Number.isInteger(n);
    var partes = (entero ? String(n) : n.toFixed(2)).split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return partes.join(',');
  }

  function textoPrecio(raw, moneda) {
    var p = parsePrecio(raw);
    if (p.vacio) return '';
    if (p.texto !== undefined) return p.texto;
    var m = limpiar(moneda);
    return (m ? m + ' ' : '') + formatearNumero(p.numero);
  }

  /* ================================================================== */
  /*  Imágenes: archivo en img/, URL https o link de Google Drive       */
  /* ================================================================== */
  function resolverImagen(raw, ancho) {
    var s = limpiar(raw);
    if (!s) return '';
    ancho = ancho || 800;
    var drive = s.match(/drive\.google\.com\/file\/d\/([\w-]+)/i) ||
                s.match(/drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([\w-]+)/i) ||
                s.match(/docs\.google\.com\/uc\?[^#]*\bid=([\w-]+)/i);
    if (drive) return 'https://drive.google.com/thumbnail?id=' + drive[1] + '&sz=w' + ancho;
    if (/^https:\/\//i.test(s)) return s;
    if (/^http:\/\//i.test(s)) return 'https://' + s.slice(7);
    if (/^[a-z][a-z0-9+.\-]*:/i.test(s) || s.indexOf('//') === 0) return '';   // data:, javascript:, etc.
    var ruta = s.replace(/\\/g, '/').replace(/^\.?\/+/, '').replace(/^img\//i, '');
    var segs = ruta.split('/');
    for (var i = 0; i < segs.length; i++) { if (segs[i] === '..' || segs[i] === '') return ''; }
    return 'img/' + segs.map(encodeURIComponent).join('/');
  }

  /* ================================================================== */
  /*  Categorías e íconos                                               */
  /* ================================================================== */
  var ICONOS_AUTO = [
    [/(^| )(helad|gelato|paleta)/, '🍦'],
    [/(^| )(cafe|cafeteria|espresso|capuch|capuc|latte|cortado)/, '☕'],
    [/(^| )(desayuno|brunch|merienda|medialuna|croissant|facturas?)/, '🥐'],
    [/(^| )(postre|torta|tarta|dulce|pastel|brownie|cheesecake|panaderia dulce|reposteria)/, '🍰'],
    [/(^| )(hamburguesa|burger)/, '🍔'],
    [/(^| )(sandwich|sanguche|tostado|lomito|wrap)/, '🥪'],
    [/(^| )pizza/, '🍕'],
    [/(^| )empanada/, '🥟'],
    [/(^| )(pasta|fideo|ravio|noqui|sorrento)/, '🍝'],
    [/(^| )ensalada/, '🥗'],
    [/(^| )(carne|parrilla|asado|grill)/, '🥩'],
    [/(^| )(pescado|marisco|mar)( |$)/, '🐟'],
    [/(^| )sushi/, '🍣'],
    [/(^| )(pan|panaderia)( |$)/, '🥖'],
    [/(^| )(cerveza|birra|chop)/, '🍺'],
    [/(^| )(vino|bodega)/, '🍷'],
    [/(^| )(trago|coctel|cocktail|aperitivo|coctel)/, '🍹'],
    [/(^| )(bebida|jugo|licuado|gaseosa|agua|limonada|batido|smoothie|refresco)/, '🥤'],
    [/(^| )(te|infusion|infusiones|mate)( |$)/, '🍵'],
    [/(^| )(promo|combo|oferta|especial)/, '⭐'],
    [/(^| )(entrada|picada|snack|tapa|aperitivo|para compartir)/, '🧀'],
    [/(^| )(vegano|vegetariano|veggie|saludable)/, '🥬'],
    [/(^| )(kids|infantil|chicos|nino)/, '🧸'],
    [/(^| )(almuerzo|cena|plato|principal|menu|minuta)/, '🍽️']
  ];

  function iconoAuto(nombre) {
    var k = sinTildes(nombre).replace(/[^a-z0-9]+/g, ' ').trim();
    for (var i = 0; i < ICONOS_AUTO.length; i++) { if (ICONOS_AUTO[i][0].test(k)) return ICONOS_AUTO[i][1]; }
    return '🍽️';
  }

  function primerGrafema(s) {
    s = limpiar(s);
    if (!s || /^[\w\s.,\-]+$/.test(s)) return '';       // texto común, no un emoji
    try {
      if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        var it = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)[Symbol.iterator]().next();
        return it.value ? it.value.segment : '';
      }
    } catch (e) { /* cae al plan B */ }
    return Array.from(s)[0] || '';
  }

  function agruparCategorias(items) {
    var mapa = {}, lista = [];
    items.forEach(function (it) {
      var k = clave(it.categoria) || 'menu';
      if (!mapa[k]) { mapa[k] = { nombre: it.categoria, icono: '', items: [] }; lista.push(mapa[k]); }
      var cat = mapa[k];
      if (!cat.icono) cat.icono = primerGrafema(it.icono);
      cat.items.push(it);
    });
    lista.forEach(function (cat) { if (!cat.icono) cat.icono = iconoAuto(cat.nombre); });
    return lista;
  }

  function construirMenu(texto) { return agruparCategorias(filasAItems(parseCSV(texto))); }

  /* ================================================================== */
  /*  Dibujo (createElement + textContent)                              */
  /* ================================================================== */
  function el(tag, clase, texto) {
    var e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto != null && texto !== '') e.textContent = texto;
    return e;
  }

  function tarjeta(it) {
    var moneda = C.moneda == null ? '$' : C.moneda;
    var agotado = !it.disponible;
    var urlFoto = resolverImagen(it.imagen, 800);
    var card = el('article', 'card' + (agotado ? ' agotado' : '') + (urlFoto ? '' : ' sin-foto'));

    var etiquetaTxt = agotado ? 'Agotado' : it.etiqueta;
    if (urlFoto) {
      var foto = el('div', 'foto');
      var img = document.createElement('img');
      img.loading = 'lazy'; img.decoding = 'async'; img.alt = it.producto;
      if (!/^img\//.test(urlFoto)) img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', function () {      // si falla, tarjeta sin foto
        card.classList.add('sin-foto');
        if (foto.parentNode) foto.parentNode.removeChild(foto);
      }, { once: true });
      img.src = urlFoto;
      foto.appendChild(img);
      card.appendChild(foto);
    }

    var info = el('div', 'info');
    info.appendChild(el('h3', '', it.producto));
    if (it.descripcion) info.appendChild(el('p', 'desc', it.descripcion));

    var precio = textoPrecio(it.precio, moneda);
    var antes = textoPrecio(it.precioAnterior, moneda);
    if (precio || (agotado && antes)) {
      var fila = el('div', 'precio-fila');
      if (agotado) {
        fila.appendChild(el('span', 'precio', precio || antes));          // UN solo precio, tachado por CSS
      } else if (antes) {
        fila.appendChild(el('s', 'antes', antes));
        fila.appendChild(el('span', 'precio oferta', precio));
      } else {
        fila.appendChild(el('span', 'precio', precio));
      }
      info.appendChild(fila);
    }
    card.appendChild(info);
    if (etiquetaTxt) card.appendChild(el('span', 'etiqueta', etiquetaTxt));
    return card;
  }

  function dibujar(categorias) {
    var menu = document.getElementById('menu');
    var nav = document.getElementById('cats');
    var navIn = document.getElementById('catsIn');
    menu.textContent = ''; navIn.textContent = '';

    if (!categorias.length || !categorias.some(function (c) { return c.items.length; })) {
      mostrarMensaje('☕', 'Menú en preparación', 'Todavía no hay productos cargados. ¡Volvé en un ratito!', false);
      nav.hidden = true;
      return;
    }

    categorias.forEach(function (cat, i) {
      var id = 'cat-' + i;
      var chip = el('a', 'chip');
      chip.href = '#' + id; chip.dataset.id = id;
      chip.appendChild(el('span', 'chip-ico', cat.icono));
      chip.appendChild(el('span', '', cat.nombre));
      navIn.appendChild(chip);

      var sec = el('section', 'seccion'); sec.id = id;
      var h = el('div', 'seccion-titulo');
      h.appendChild(el('span', 'ico-cat', cat.icono));
      h.appendChild(el('h2', '', cat.nombre));
      sec.appendChild(h);
      var grilla = el('div', 'grilla');
      cat.items.forEach(function (it) { grilla.appendChild(tarjeta(it)); });
      sec.appendChild(grilla);
      menu.appendChild(sec);
    });

    nav.hidden = false;
    activarNavegacion();
  }

  function mostrarMensaje(icono, titulo, texto, conBoton) {
    var menu = document.getElementById('menu');
    menu.textContent = '';
    var c = el('div', 'estado-card');
    c.appendChild(el('div', 'taza', icono));
    c.appendChild(el('h2', '', titulo));
    c.appendChild(el('p', '', texto));
    if (conBoton) {
      var b = el('button', 'btn', 'Reintentar'); b.type = 'button';
      b.addEventListener('click', function () { iniciarCarga(); });
      c.appendChild(b);
    }
    menu.appendChild(c);
  }

  /* ================================================================== */
  /*  Barra de categorías: chip activo según la sección visible         */
  /* ================================================================== */
  var navListo = false, bloqueoHasta = 0, ticking = false;

  function alturaNav() {
    var nav = document.getElementById('cats');
    if (nav && !nav.hidden) document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
  }

  function activarChip(id) {
    var chips = document.querySelectorAll('.chip');
    var activo = null;
    chips.forEach(function (c) {
      var on = c.dataset.id === id;
      if (on) { c.setAttribute('aria-current', 'true'); activo = c; } else c.removeAttribute('aria-current');
    });
    var contenedor = document.getElementById('catsIn');
    if (activo && contenedor) {   // centra el chip dentro de la barra sin mover la página
      var objetivo = activo.offsetLeft - (contenedor.clientWidth - activo.offsetWidth) / 2;
      contenedor.scrollTo({ left: Math.max(0, objetivo), behavior: 'smooth' });
    }
  }

  function actualizar() {
    ticking = false;
    var nav = document.getElementById('cats');
    if (!nav || nav.hidden) return;
    nav.classList.toggle('pegada', nav.getBoundingClientRect().top <= 0.5);
    if (Date.now() < bloqueoHasta) return;
    var secs = document.querySelectorAll('.seccion');
    if (!secs.length) return;
    var corte = nav.offsetHeight + 24, actual = secs[0].id;
    for (var i = 0; i < secs.length; i++) { if (secs[i].getBoundingClientRect().top <= corte) actual = secs[i].id; }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) actual = secs[secs.length - 1].id;
    if (!document.querySelector('.chip[aria-current="true"][data-id="' + actual + '"]')) activarChip(actual);
  }

  function pedirActualizar() { if (!ticking) { ticking = true; requestAnimationFrame(actualizar); } }

  function activarNavegacion() {
    alturaNav();
    document.getElementById('catsIn').onclick = function (ev) {
      var chip = ev.target.closest ? ev.target.closest('.chip') : null;
      if (!chip) return;
      ev.preventDefault();
      var sec = document.getElementById(chip.dataset.id);
      if (!sec) return;
      bloqueoHasta = Date.now() + 900;
      activarChip(chip.dataset.id);
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (!navListo) {
      navListo = true;
      window.addEventListener('scroll', pedirActualizar, { passive: true });
      window.addEventListener('resize', function () { alturaNav(); pedirActualizar(); });
    }
    actualizar();
  }

  /* ================================================================== */
  /*  Configuración (config.js)                                         */
  /* ================================================================== */
  function enlaceRed(valor, base) {
    var v = limpiar(valor);
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    return base + v.replace(/^@/, '').replace(/^\/+/, '');
  }

  function aplicarConfig() {
    var $ = function (id) { return document.getElementById(id); };
    var raiz = document.documentElement;

    // Colores del tema
    var colores = C.colores || {};
    Object.keys(colores).forEach(function (k) {
      if (colores[k]) raiz.style.setProperty(k.indexOf('--') === 0 ? k : '--' + k, String(colores[k]));
    });
    var fondo = getComputedStyle(raiz).getPropertyValue('--fondo').trim();
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc && fondo) tc.setAttribute('content', fondo);

    // Decoración
    if (C.decoracion === false) document.body.classList.add('sin-deco');

    // Textos
    var nombre = limpiar(C.nombre);
    if (nombre) {
      document.title = nombre + ' — Menú';
      var desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', 'Menú digital de ' + nombre + (limpiar(C.eslogan) ? '. ' + limpiar(C.eslogan) : ''));
    }
    $('nombre').textContent = nombre;
    if (!nombre) $('marca').hidden = true;

    // Logo (si carga, reemplaza al nombre; si falla, queda el nombre)
    var logoUrl = resolverImagen(C.logo, 400);
    if (logoUrl) {
      var logo = $('logo');
      logo.alt = nombre;
      if (!/^img\//.test(logoUrl)) logo.referrerPolicy = 'no-referrer';
      logo.addEventListener('load', function () { logo.hidden = false; $('nombre').hidden = true; $('marca').hidden = false; }, { once: true });
      logo.src = logoUrl;
    }

    // Portada
    var portada = resolverImagen(C.portada, 1600);
    if (portada) $('portadaImg').style.backgroundImage = 'url("' + portada.replace(/"/g, '%22') + '")';

    var eslogan = limpiar(C.eslogan);
    if (eslogan) { var e = $('eslogan'); e.textContent = eslogan; e.hidden = false; }

    var dir = limpiar(C.direccion), hor = limpiar(C.horarios);
    if (dir) { $('datoDir').hidden = false; $('datoDir').querySelector('span').textContent = dir; }
    if (hor) { $('datoHor').hidden = false; $('datoHor').querySelector('span').textContent = hor; }
    if (dir || hor) $('datos').hidden = false;

    // Pie
    var ig = enlaceRed(C.instagram, 'https://instagram.com/');
    var fb = enlaceRed(C.facebook, 'https://facebook.com/');
    if (ig) { $('linkIg').href = ig; $('linkIg').hidden = false; }
    if (fb) { $('linkFb').href = fb; $('linkFb').hidden = false; }
    if (ig || fb) $('redes').hidden = false;

    var wa = limpiar(C.whatsapp).replace(/\D+/g, '');
    if (wa) {
      var a = $('linkWa');
      a.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent('¡Hola! Quiero hacer un pedido.');
      a.hidden = false;
    }
    var cred = limpiar(C.credito);
    if (cred) { $('credito').textContent = cred; $('credito').hidden = false; }
  }

  /* ================================================================== */
  /*  Carga de datos: red → último guardado → menu.csv local → error    */
  /* ================================================================== */
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin storage */ } }
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function conBuster(url) { return url + (url.indexOf('?') === -1 ? '?' : '&') + '_=' + Date.now(); }

  async function descargar(url, ms) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, ms) : 0;
    try {
      var r = await fetch(conBuster(url), { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
      if (!r.ok) throw new Error('http-' + r.status);
      return await r.text();
    } finally { clearTimeout(t); }
  }

  async function cargar() {
    var url = limpiar(C.sheetCsvUrl);
    var claveLS = LS_PREFIX + (url || 'local');
    var fuentes = url
      ? [{ t: 'red', url: url, guardar: true }, { t: 'cache' }, { t: 'red', url: 'menu.csv', guardar: false }]
      : [{ t: 'red', url: 'menu.csv', guardar: true }, { t: 'cache' }];

    for (var i = 0; i < fuentes.length; i++) {
      var f = fuentes[i];
      try {
        var texto = f.t === 'cache' ? leer(claveLS) : await descargar(f.url, 10000);
        if (!texto) continue;
        var categorias = construirMenu(texto);   // valida el formato (si es HTML o basura, lanza error)
        if (f.guardar) guardar(claveLS, texto);
        return categorias;
      } catch (e) { /* prueba la siguiente fuente */ }
    }
    throw new Error('sin-datos');
  }

  function iniciarCarga() {
    var menu = document.getElementById('menu');
    menu.textContent = '';
    var est = el('div', 'estado');
    est.appendChild(el('div', 'taza', '☕'));
    est.appendChild(el('p', '', 'Preparando el menú…'));
    menu.appendChild(est);
    cargar().then(dibujar).catch(function () {
      document.getElementById('cats').hidden = true;
      mostrarMensaje('☕', 'No pudimos cargar el menú', 'Revisá tu conexión y probá de nuevo en un momento.', true);
    });
  }

  function iniciar() { aplicarConfig(); iniciarCarga(); }

  /* Exposición para pruebas (no se usa en producción) */
  if (typeof window !== 'undefined') {
    window.MenuQR = {
      parseCSV: parseCSV, parsePrecio: parsePrecio, textoPrecio: textoPrecio,
      resolverImagen: resolverImagen, iconoAuto: iconoAuto, construirMenu: construirMenu, esDisponible: esDisponible
    };
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
  }
})();
