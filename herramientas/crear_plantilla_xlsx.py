#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Crea plantilla-menu.xlsx (junto a este script) para cargar el menú.

Uso:
    pip install openpyxl
    python crear_plantilla_xlsx.py

Después se sube el .xlsx a Google Drive y se abre con Google Sheets.
"""
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

ENCABEZADOS = ["categoria", "producto", "descripcion", "precio", "precio_anterior",
               "imagen", "disponible", "etiqueta", "icono"]
ANCHOS = [16, 24, 42, 12, 16, 34, 12, 12, 8]

EJEMPLOS = [
    ["Cafetería", "Café Clásico", "El de siempre, intenso y bien caliente.", 2000, None, "cafe-clasico.jpg", "SI", None, "☕"],
    ["Cafetería", "Capuccino", "Espuma perfecta, sabor único.", 2500, None, None, "SI", "Nuevo", None],   # sin imagen
    ["Postres", "Cookie", "Con chips de chocolate.", 1500, 2000, "cookie.jpg", "NO", None, "🍰"],          # agotado + precio anterior
    ["Bebidas", "Limonada", "Con menta y jengibre.", 2800, None,
     "https://drive.google.com/file/d/ID_DEL_ARCHIVO/view?usp=sharing", "SI", "Vegano", "🥤"],            # imagen de Drive
]

DATOS = [
    ["nombre", "Rincón Café"],
    ["eslogan", "Buen café, mejores momentos"],
    ["direccion", "Av. San Martín 1234"],
    ["horarios", "Lun. a Dom. 8hs - 23hs"],
    ["whatsapp", "5491112345678"],
    ["instagram", "rinconcafe"],
    ["facebook", "rinconcafe"],
    ["logo", None],
    ["portada", None],
]

INSTRUCCIONES = [
    "CÓMO USAR LA PLANILLA",
    "1. Una fila = un producto. Fila nueva = producto nuevo.",
    "2. categoria: las secciones del menú; aparecen en el orden en que están acá. Podés dejarla vacía para seguir con la de arriba.",
    "3. producto: el nombre. Las filas sin producto se ignoran.",
    "4. descripcion: opcional, una línea corta.",
    "5. precio: 4500, 4.500 o $ 4.500. Si escribís texto (ej: Consultar) se muestra tal cual.",
    "6. precio_anterior: opcional. Si lo completás, se ve tachado junto al precio nuevo (oferta).",
    "7. imagen: opcional. Nombre del archivo subido a la carpeta img/ del sitio, un link https o un link compartido de Google Drive.",
    "8. disponible: SI o NO. Con NO el producto se ve atenuado con la etiqueta Agotado (no se oculta).",
    "9. etiqueta: opcional, texto corto (Nuevo, Promo, Vegano).",
    "10. icono: opcional, un emoji para la categoría (se usa el primero que encuentre). Si no hay, se elige uno automático.",
    "",
    "HOJA DATOS (nombre del local y contacto)",
    "En la hoja Datos se cambia el nombre del local, el eslogan, la dirección, los horarios, el WhatsApp (solo números, con 549), Instagram y Facebook.",
    "Solo se escribe en la columna B (valor). Si una celda queda vacía, se usa el valor que está en config.js.",
    "logo y portada: nombre de un archivo de la carpeta img/, un link https o un link compartido de Google Drive.",
]


def main():
    wb = Workbook()
    ws = wb.active
    ws.title = "Menu"

    ws.append(ENCABEZADOS)
    for celda in ws[1]:
        celda.font = Font(bold=True, color="F6E7CF")
        celda.fill = PatternFill("solid", fgColor="3B2418")
        celda.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 24
    for i, ancho in enumerate(ANCHOS, start=1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = ancho

    for fila in EJEMPLOS:
        ws.append(fila)
    for fila in ws.iter_rows(min_row=2, max_row=ws.max_row):
        fila[2].alignment = Alignment(wrap_text=True, vertical="top")

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{ws.cell(row=1, column=len(ENCABEZADOS)).column_letter}500"

    validacion = DataValidation(type="list", formula1='"SI,NO"', allow_blank=True,
                                showErrorMessage=True, errorTitle="Valor no válido",
                                error="Elegí SI o NO.")
    ws.add_data_validation(validacion)
    validacion.add("G2:G500")

    datos = wb.create_sheet("Datos")
    datos.append(["campo", "valor"])
    for celda in datos[1]:
        celda.font = Font(bold=True, color="F6E7CF")
        celda.fill = PatternFill("solid", fgColor="3B2418")
    for fila in DATOS:
        datos.append(fila)
    for celda in datos["A"][1:]:
        celda.font = Font(bold=True)
    for celda in datos["B"]:
        celda.number_format = "@"   # texto: que el WhatsApp no se vuelva 5,49E+12
    datos.column_dimensions["A"].width = 16
    datos.column_dimensions["B"].width = 50
    datos.column_dimensions["C"].width = 60
    datos["C1"] = "No cambies la columna A. Solo escribí en la columna B."
    datos["C1"].font = Font(italic=True, color="6D5A47")

    ayuda = wb.create_sheet("Instrucciones")
    for linea in INSTRUCCIONES:
        ayuda.append([linea])
    ayuda["A1"].font = Font(bold=True, size=13)
    ayuda.column_dimensions["A"].width = 120

    destino = Path(__file__).parent / "plantilla-menu.xlsx"
    wb.save(destino)
    print(f"Plantilla creada: {destino}")


if __name__ == "__main__":
    main()
