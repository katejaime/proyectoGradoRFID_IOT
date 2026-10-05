from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.schemas.alert import AlertaRead

COLUMNAS = ["Fecha", "Pasajero", "Discapacidad", "Parada", "Bus", "Conductor", "Estado", "Tiempo de espera"]


def _formato_espera(segundos: int | None) -> str:
    if segundos is None:
        return "-"
    minutos, seg = divmod(segundos, 60)
    return f"{minutos}m {seg}s"


def _fila(alerta: AlertaRead) -> list[str]:
    return [
        alerta.fechaHora.strftime("%Y-%m-%d %H:%M:%S"),
        alerta.pasajeroNombre or "-",
        alerta.pasajeroTipoDiscapacidad or "-",
        alerta.paradaNombre or "-",
        alerta.busPlaca or "-",
        alerta.conductorNombre or "-",
        "Atendida" if alerta.atendida else "Sin atender",
        _formato_espera(alerta.tiempoEsperaSegundos),
    ]


def generar_excel_alertas(alertas: list[AlertaRead]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Alertas"

    ws.append(COLUMNAS)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for alerta in alertas:
        ws.append(_fila(alerta))

    for columna in ws.columns:
        ancho = max(len(str(celda.value)) for celda in columna)
        ws.column_dimensions[columna[0].column_letter].width = min(40, ancho + 2)

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def generar_pdf_alertas(alertas: list[AlertaRead], titulo: str) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
    estilos = getSampleStyleSheet()

    total = len(alertas)
    atendidas = sum(1 for a in alertas if a.atendida)
    sin_atender = total - atendidas

    elementos = [
        Paragraph(titulo, estilos["Title"]),
        Spacer(1, 10),
        Paragraph(
            f"Total: {total} &nbsp;&nbsp;·&nbsp;&nbsp; Atendidas: {atendidas} "
            f"&nbsp;&nbsp;·&nbsp;&nbsp; Sin atender: {sin_atender}",
            estilos["Normal"],
        ),
        Spacer(1, 14),
    ]

    datos = [COLUMNAS] + [_fila(alerta) for alerta in alertas]
    tabla = Table(datos, repeatRows=1)
    tabla.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4f46e5")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
            ]
        )
    )
    elementos.append(tabla)

    doc.build(elementos)
    return buffer.getvalue()
