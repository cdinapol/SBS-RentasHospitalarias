"""Datos sintéticos de pólizas y reclamaciones de renta hospitalaria."""

from __future__ import annotations

from datetime import date

from .config import DOCUMENTOS_REQUERIDOS
from .models import Cobertura, Documento, Poliza, Reclamacion

ANALISTAS = ["María Restrepo", "Julián Gómez", "Carolina Ríos", "Andrés Peña"]

PRESTADORES = [
    "Clínica del Country",
    "Fundación Santa Fe",
    "Hospital San Vicente",
    "Clínica Las Américas",
    "Clínica Reina Sofía",
]


def _poliza(
    pid: str,
    tomador: str,
    renta: float,
    franquicia: int,
    tope_dias: int,
    suma: float,
    carencia: int,
    desde: date,
    hasta: date,
    estado_pago: str,
    exclusiones: list[str],
    dias_usados: int = 0,
) -> Poliza:
    return Poliza(
        id=pid,
        tomador=tomador,
        producto="Renta Diaria por Hospitalización",
        cobertura=Cobertura(
            renta_diaria=renta,
            franquicia_dias=franquicia,
            tope_dias_anio=tope_dias,
            suma_asegurada=suma,
            carencia_dias=carencia,
        ),
        vigencia_desde=desde,
        vigencia_hasta=hasta,
        estado_pago=estado_pago,
        exclusiones=exclusiones,
        dias_usados_anio=dias_usados,
    )


POLIZAS: list[Poliza] = [
    _poliza("POL-1001", "Grupo Empresarial Andino", 180000, 1, 180, 20_000_000, 30,
            date(2026, 1, 1), date(2026, 12, 31), "al_dia",
            ["preexistencias no declaradas", "lesiones autoinfligidas"]),
    _poliza("POL-1002", "Cooperativa Nacional", 120000, 2, 120, 12_000_000, 60,
            date(2026, 3, 1), date(2027, 2, 28), "al_dia",
            ["preexistencias no declaradas", "cirugía estética", "embarazo sin complicación"]),
    _poliza("POL-1003", "Textiles del Caribe", 150000, 1, 150, 15_000_000, 30,
            date(2025, 11, 1), date(2026, 10, 31), "al_dia",
            ["lesiones autoinfligidas", "práctica de deportes extremos"]),
    _poliza("POL-1004", "Transportes del Sur", 90000, 2, 90, 8_000_000, 90,
            date(2026, 9, 1), date(2027, 8, 31), "al_dia",
            ["preexistencias no declaradas"]),
    _poliza("POL-1005", "Alimentos Frescos SA", 200000, 1, 200, 25_000_000, 30,
            date(2026, 2, 1), date(2027, 1, 31), "en_mora",
            ["lesiones autoinfligidas"]),
    _poliza("POL-1006", "Constructora Litoral", 160000, 1, 160, 18_000_000, 30,
            date(2026, 1, 15), date(2026, 12, 31), "al_dia",
            ["preexistencias no declaradas", "lesiones autoinfligidas"], dias_usados=175),
]

POLIZAS_IDX = {p.id: p for p in POLIZAS}

# Catálogo de diagnósticos: (código CIE-10, descripción, causa, ¿coincide con alguna exclusión?)
DIAGNOSTICOS = [
    ("J18.9", "Neumonía, no especificada", "enfermedad", None),
    ("K35.80", "Apendicitis aguda", "enfermedad", None),
    ("S72.0", "Fractura de cuello de fémur", "accidente", None),
    ("A09", "Gastroenteritis infecciosa", "enfermedad", None),
    ("I21.9", "Infarto agudo de miocardio", "enfermedad", None),
    ("O80", "Parto único espontáneo", "enfermedad", "embarazo sin complicación"),
    ("T14.9", "Traumatismo múltiple por accidente", "accidente", None),
    ("N20.0", "Cálculo renal", "enfermedad", None),
    ("X60", "Lesión autoinfligida intencional", "accidente", "lesiones autoinfligidas"),
    ("Z41.1", "Cirugía estética", "enfermedad", "cirugía estética"),
    ("E11.9", "Diabetes mellitus tipo 2 (preexistente)", "enfermedad", "preexistencias no declaradas"),
    ("S82.6", "Fractura de tobillo en deporte extremo", "accidente", "práctica de deportes extremos"),
]


def _docs(presentes: list[str], ilegibles: list[str] | None = None) -> list[Documento]:
    ilegibles = ilegibles or []
    docs: list[Documento] = []
    for tipo in DOCUMENTOS_REQUERIDOS:
        docs.append(
            Documento(tipo=tipo, presente=tipo in presentes, legible=tipo not in ilegibles)
        )
    return docs


# (poliza, dias_desde_ingreso_a_hoy, dias_internado, idx_diagnostico, docs_presentes, ilegibles, complejidad)
_SPECS = [
    ("POL-1001", 3, 6, 0, DOCUMENTOS_REQUERIDOS, [], "baja"),
    ("POL-1001", 5, 12, 4, DOCUMENTOS_REQUERIDOS, [], "alta"),
    ("POL-1001", 9, 4, 1, ["formulario_reclamacion", "historia_clinica"], [], "media"),
    ("POL-1002", 2, 8, 3, DOCUMENTOS_REQUERIDOS, [], "baja"),
    ("POL-1002", 7, 3, 5, DOCUMENTOS_REQUERIDOS, [], "media"),
    ("POL-1002", 12, 15, 10, DOCUMENTOS_REQUERIDOS, [], "alta"),
    ("POL-1003", 4, 7, 2, DOCUMENTOS_REQUERIDOS, [], "media"),
    ("POL-1003", 6, 2, 7, DOCUMENTOS_REQUERIDOS, [], "baja"),
    ("POL-1003", 1, 9, 11, DOCUMENTOS_REQUERIDOS, [], "alta"),
    ("POL-1004", 2, 5, 0, DOCUMENTOS_REQUERIDOS, [], "media"),
    ("POL-1004", 8, 10, 6, ["formulario_reclamacion", "historia_clinica", "documento_identidad"], [], "alta"),
    ("POL-1005", 3, 6, 1, DOCUMENTOS_REQUERIDOS, [], "media"),
    ("POL-1006", 2, 8, 2, DOCUMENTOS_REQUERIDOS, [], "alta"),
    ("POL-1001", 10, 3, 3, DOCUMENTOS_REQUERIDOS, ["historia_clinica"], "media"),
    ("POL-1002", 4, 20, 4, DOCUMENTOS_REQUERIDOS, [], "alta"),
    ("POL-1003", 5, 1, 7, DOCUMENTOS_REQUERIDOS, [], "baja"),
    ("POL-1004", 6, 7, 8, DOCUMENTOS_REQUERIDOS, [], "alta"),
    ("POL-1001", 7, 5, 2, DOCUMENTOS_REQUERIDOS, [], "baja"),
    ("POL-1002", 3, 4, 1, ["formulario_reclamacion"], [], "media"),
    ("POL-1003", 9, 11, 0, DOCUMENTOS_REQUERIDOS, [], "alta"),
    ("POL-1004", 11, 6, 3, DOCUMENTOS_REQUERIDOS, [], "media"),
    ("POL-1001", 2, 14, 4, DOCUMENTOS_REQUERIDOS, [], "alta"),
    ("POL-1002", 5, 2, 7, DOCUMENTOS_REQUERIDOS, [], "baja"),
    ("POL-1003", 6, 8, 2, DOCUMENTOS_REQUERIDOS, [], "media"),
    ("POL-1005", 4, 9, 0, DOCUMENTOS_REQUERIDOS, [], "alta"),
    ("POL-1001", 8, 3, 1, DOCUMENTOS_REQUERIDOS, [], "baja"),
    ("POL-1002", 1, 7, 9, DOCUMENTOS_REQUERIDOS, [], "alta"),
    ("POL-1003", 3, 5, 3, ["formulario_reclamacion", "historia_clinica", "certificado_hospitalario"], [], "media"),
    ("POL-1004", 7, 4, 7, DOCUMENTOS_REQUERIDOS, [], "baja"),
    ("POL-1006", 5, 6, 1, DOCUMENTOS_REQUERIDOS, [], "alta"),
    ("POL-1001", 4, 10, 2, DOCUMENTOS_REQUERIDOS, [], "media"),
    ("POL-1002", 6, 3, 0, DOCUMENTOS_REQUERIDOS, [], "baja"),
    ("POL-1003", 2, 8, 11, DOCUMENTOS_REQUERIDOS, [], "alta"),
    ("POL-1004", 9, 5, 4, DOCUMENTOS_REQUERIDOS, [], "media"),
    ("POL-1001", 5, 7, 3, DOCUMENTOS_REQUERIDOS, [], "baja"),
]

NOMBRES = [
    "Luis Herrera", "Ana Martínez", "Jorge Salcedo", "Diana Castro", "Pedro Nieto",
    "Laura Vargas", "Camilo Ruiz", "Sofía León", "Miguel Ángel Díaz", "Paula Jiménez",
    "Ricardo Mora", "Valentina Osorio", "Fernando Cano", "Gabriela Suárez", "Tomás Beltrán",
    "Natalia Pardo", "Esteban Rojas", "Daniela Acosta", "Mauricio Vélez", "Carmen Lozano",
    "Felipe Navarro", "Isabela Mejía", "Óscar Guzmán", "Lucía Franco", "Sebastián Cárdenas",
    "Marta Quintero", "Álvaro Benítez", "Patricia Rincón", "Hernán Correa", "Juliana Pineda",
    "Rodrigo Álvarez", "Verónica Soto", "Iván Montoya", "Catalina Duque", "Nicolás Bravo",
]

from datetime import timedelta  # noqa: E402

from .config import HOY  # noqa: E402


def construir_reclamaciones() -> list[Reclamacion]:
    reclamaciones: list[Reclamacion] = []
    for i, (pid, dias_atras, internado, idx_dx, presentes, ilegibles, complejidad) in enumerate(_SPECS):
        cod, desc, causa, _exclusion = DIAGNOSTICOS[idx_dx]
        fecha_ingreso = HOY - timedelta(days=dias_atras + internado)
        fecha_egreso = fecha_ingreso + timedelta(days=internado)
        fecha_recepcion = fecha_egreso + timedelta(days=2)
        reclamaciones.append(
            Reclamacion(
                id=f"RH-{2601 + i}",
                asegurado=NOMBRES[i % len(NOMBRES)],
                documento_asegurado=f"{1000000000 + i * 777889}",
                poliza_id=pid,
                analista=ANALISTAS[i % len(ANALISTAS)],
                fecha_recepcion=fecha_recepcion,
                fecha_ingreso=fecha_ingreso,
                fecha_egreso=fecha_egreso,
                diagnostico_cie10=cod,
                diagnostico=desc,
                causa=causa,  # type: ignore[arg-type]
                prestador=PRESTADORES[i % len(PRESTADORES)],
                documentos=_docs(presentes, ilegibles),
                complejidad=complejidad,  # type: ignore[arg-type]
            )
        )
    return reclamaciones
