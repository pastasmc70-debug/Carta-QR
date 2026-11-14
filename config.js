/* =====================================================================
   config.js — lo ÚNICO que se edita para cada cliente.
   Los campos vacíos ("") no muestran nada en el menú.
   ===================================================================== */
window.CONFIG = {
  // --- Identidad ---------------------------------------------------------
  nombre: "Rincón Café",
  eslogan: "Buen café, mejores momentos",
  logo: "",                      // ej: "img/logo.png". Vacío = se muestra el nombre en letra script
  portada: "img/portada.jpg",    // imagen del encabezado (ruta en img/, URL https o link de Drive)

  // --- Datos del menú ----------------------------------------------------
  // Link CSV de Google Sheets (Archivo > Compartir > Publicar en la web > CSV).
  // Vacío = lee el menu.csv local (útil para demos).
  sheetCsvUrl: "",
  moneda: "$",

  // --- Contacto ----------------------------------------------------------
  whatsapp: "5491112345678",     // solo números, con código de país
  instagram: "rinconcafe",       // usuario o URL completa
  facebook: "rinconcafe",        // usuario/página o URL completa
  direccion: "Av. San Martín 1234",
  horarios: "Lun. a Dom. 8hs - 23hs",
  credito: "",                   // ej: "Menú digital por Tu Estudio" (opcional)

  // --- Estilo ------------------------------------------------------------
  decoracion: true,              // granos de café y hojas (false = apagado)
  colores: {                     // variables CSS del tema; se pueden borrar las que no cambien
    "--fondo": "#1b110c",        // fondo de la página
    "--tarjeta": "#f5e6cc",      // fondo de las tarjetas
    "--texto": "#2b1a0f",        // texto sobre tarjetas
    "--suave": "#6d5a47",        // texto secundario sobre tarjetas
    "--acento": "#d9ad6c",       // dorado: chips, etiquetas, detalles
    "--linea": "#b98a4e"         // líneas y bordes finos
  }
};
