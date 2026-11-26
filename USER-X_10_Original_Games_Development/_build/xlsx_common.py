"""Shared styling for the USER-X workbooks (RTL, Arabic fonts, brand colours)."""

from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName

INK = "0B0B0F"
SIGNAL = "FF4D00"
SAND = "C9A66B"
BONE = "F3EFE6"
INPUT = "FFF4CC"  # yellow = editable input
CALC = "FFFFFF"
HEAD = "16161C"
thin = Side(style="thin", color="D0CCC2")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
FONT = "Tajawal"


def sheet(wb, title, first=False):
    ws = wb.active if first else wb.create_sheet()
    ws.title = title
    ws.sheet_view.rightToLeft = True
    ws.sheet_view.showGridLines = False
    return ws


def title(ws, text, sub=None, width=10):
    ws["A1"] = text
    ws["A1"].font = Font(name="Cairo", size=16, bold=True, color="FFFFFF")
    ws["A1"].fill = PatternFill("solid", fgColor=INK)
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=width)
    ws.row_dimensions[1].height = 30
    if sub:
        ws["A2"] = sub
        ws["A2"].font = Font(name=FONT, size=10, italic=True, color="555555")
        ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=width)


def header(ws, row, cols, start_col=1, fill=HEAD):
    for i, c in enumerate(cols):
        cell = ws.cell(row=row, column=start_col + i, value=c)
        cell.font = Font(name=FONT, bold=True, color="FFFFFF", size=10)
        cell.fill = PatternFill("solid", fgColor=fill)
        cell.alignment = Alignment(
            horizontal="center", vertical="center", wrap_text=True
        )
        cell.border = BORDER
    ws.row_dimensions[row].height = 32


def put(
    ws,
    row,
    col,
    value,
    fmt=None,
    bold=False,
    inp=False,
    fill=None,
    wrap=False,
    color=None,
):
    c = ws.cell(row=row, column=col, value=value)
    c.font = Font(name=FONT, size=10, bold=bold, color=color or "111111")
    c.border = BORDER
    c.alignment = Alignment(
        horizontal="right"
        if isinstance(value, str) and not str(value).startswith("=")
        else "center",
        vertical="center",
        wrap_text=wrap,
    )
    if fmt:
        c.number_format = fmt
    if inp:
        c.fill = PatternFill("solid", fgColor=INPUT)
    elif fill:
        c.fill = PatternFill("solid", fgColor=fill)
    return c


def widths(ws, ws_widths):
    for i, w in enumerate(ws_widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w


def name(wb, nm, ref):
    wb.defined_names[nm] = DefinedName(nm, attr_text=ref)


SAR = '#,##0" ر.س"'
SAR0 = "#,##0"
PCT = "0%"
PCT1 = "0.0%"
