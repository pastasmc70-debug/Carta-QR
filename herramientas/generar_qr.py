#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera un código QR ESTÁTICO (PNG) para el menú del local.

Uso:
    python generar_qr.py https://ejemplo.com/menu
    python generar_qr.py https://ejemplo.com/menu -o qr-menu.png --tamano 12

El QR es estático: siempre apunta a la misma dirección y no se puede editar
después de generado. Si cambia la URL del menú, hay que volver a generarlo.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# La librería se importa de forma protegida: si falta, el script lo explica
# con un mensaje amable en lugar de mostrar un traceback.
try:
    import qrcode
    from qrcode.constants import ERROR_CORRECT_H
except ImportError:  # pragma: no cover - depende del entorno del usuario
    qrcode = None
    ERROR_CORRECT_H = None


COMANDO_INSTALACION = "pip install qrcode[pil]"
TAMANO_POR_DEFECTO = 12
BORDE_POR_DEFECTO = 4
SALIDA_POR_DEFECTO = "qr-menu.png"
PREFIJOS_VALIDOS = ("http://", "https://")


class ErrorQR(Exception):
    """Error controlado: se muestra el mensaje y se sale con código 1."""


def construir_parser() -> argparse.ArgumentParser:
    """Arma el parser de argumentos con ayuda breve y en español."""
    parser = argparse.ArgumentParser(
        description="Genera un QR estático (PNG) que apunta a la URL del menú.",
        epilog=(
            "Ejemplos:\n"
            "  python generar_qr.py https://ejemplo.com/menu\n"
            "  python generar_qr.py https://ejemplo.com/menu -o img/qr-menu.png --tamano 8"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "url",
        help="Dirección a la que debe apuntar el QR (debe empezar con http:// o https://).",
    )
    parser.add_argument(
        "-o",
        "--salida",
        default=SALIDA_POR_DEFECTO,
        help=f"Archivo PNG de destino (por defecto: {SALIDA_POR_DEFECTO}).",
    )
    parser.add_argument(
        "--tamano",
        type=int,
        default=TAMANO_POR_DEFECTO,
        metavar="N",
        help=f"Tamaño en píxeles de cada módulo del QR (por defecto: {TAMANO_POR_DEFECTO}).",
    )
    return parser


def validar_url(url: str) -> str:
    """Devuelve la URL limpia o lanza ErrorQR si no es http(s)."""
    limpia = url.strip()
    if not limpia:
        raise ErrorQR("La URL está vacía. Pasá una dirección que empiece con http:// o https://.")
    if not limpia.lower().startswith(PREFIJOS_VALIDOS):
        raise ErrorQR(
            f"La URL debe empezar con http:// o https:// (recibido: {limpia!r})."
        )
    return limpia


def validar_tamano(tamano: int) -> int:
    """El tamaño de cada módulo tiene que ser un entero positivo."""
    if tamano < 1:
        raise ErrorQR(
            f"El tamaño (--tamano) debe ser un entero mayor o igual a 1 (recibido: {tamano})."
        )
    return tamano


def preparar_ruta_salida(salida: str) -> Path:
    """Normaliza la ruta de destino y garantiza la extensión .png."""
    ruta = Path(salida).expanduser()
    if ruta.suffix.lower() != ".png":
        ruta = ruta.with_suffix(".png")
    return ruta


def generar_qr(url: str, destino: Path, tamano: int) -> Path:
    """Crea el QR estático y lo guarda en disco. Devuelve la ruta final."""
    qr = qrcode.QRCode(
        version=None,  # se ajusta solo según el largo de la URL
        error_correction=ERROR_CORRECT_H,  # hasta un 30 % del código puede taparse
        box_size=tamano,
        border=BORDE_POR_DEFECTO,  # 4 módulos de margen blanco, como pide el estándar
    )
    qr.add_data(url)
    qr.make(fit=True)

    try:
        # Módulos negros sobre fondo blanco: máxima legibilidad al imprimir.
        imagen = qr.make_image(fill_color="black", back_color="white")
    except ImportError as error:
        # qrcode necesita Pillow para dibujar la imagen.
        raise ErrorQR(
            "Falta Pillow, que qrcode usa para generar el PNG.\n"
            f"Instalá todo con:\n    {COMANDO_INSTALACION}"
        ) from error

    try:
        destino.parent.mkdir(parents=True, exist_ok=True)
        imagen.save(destino)
    except OSError as error:
        raise ErrorQR(f"No se pudo guardar el archivo '{destino}': {error}") from error

    return destino


def main(argv: list[str] | None = None) -> int:
    """Punto de entrada del CLI. Devuelve el código de salida del proceso."""
    parser = construir_parser()
    args = parser.parse_args(argv)

    # Chequeo temprano de la dependencia: mensaje claro y sin traceback.
    if qrcode is None:
        print("No se encontró la librería 'qrcode'.", file=sys.stderr)
        print("Instalala con:", file=sys.stderr)
        print(f"    {COMANDO_INSTALACION}", file=sys.stderr)
        print("Después volvé a ejecutar el script.", file=sys.stderr)
        return 1

    try:
        url = validar_url(args.url)
        tamano = validar_tamano(args.tamano)
        destino = preparar_ruta_salida(args.salida)
        ruta_final = generar_qr(url, destino, tamano)
    except ErrorQR as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(f"QR generado para: {url}")
    print(f"Tamaño de módulo: {tamano} px | Corrección de errores: alta (H)")
    print(f"Archivo guardado en: {ruta_final.resolve()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
