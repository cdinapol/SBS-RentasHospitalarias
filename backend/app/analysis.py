"""Agente 2 — Análisis y validación (simula Azure AI Search RAG + GPT-4o).

Corre las reglas de cobertura contra la póliza y "recupera" cláusulas, normativa y
casos similares. En producción, la recuperación vendría de un índice híbrido en Azure
AI Search y el razonamiento de GPT-4o; aquí se resuelve con reglas deterministas.
"""

from __future__ import annotations

from .config import DOCUMENTOS_REQUERIDOS, ETIQUETAS_DOCUMENTO
from .models import (
    CasoSimilar,
    CheckValidacion,
    Poliza,
    Reclamacion,
    ResultadoValidacion,
)

NORMATIVA = [
    "Circular 007 SFC — Trámite y pago de siniestros de personas.",
    "Condiciones Generales Renta Diaria Hospitalaria, cláusula 4 (coberturas).",
    "Condiciones Particulares de la póliza (sumas, franquicia y carencia).",
]


def _dias_internado(reclamacion: Reclamacion) -> int:
    return (reclamacion.fecha_egreso - reclamacion.fecha_ingreso).days


def _documentos_faltantes(reclamacion: Reclamacion) -> list[str]:
    presentes = {d.tipo for d in reclamacion.documentos if d.presente and d.legible}
    return [t for t in DOCUMENTOS_REQUERIDOS if t not in presentes]


def validar(reclamacion: Reclamacion, poliza: Poliza) -> ResultadoValidacion:
    checks: list[CheckValidacion] = []
    cob = poliza.cobertura

    # 1. Documentación completa y legible.
    faltantes = _documentos_faltantes(reclamacion)
    checks.append(
        CheckValidacion(
            nombre="Documentación completa",
            estado="ok" if not faltantes else "falla",
            detalle=(
                "Todos los soportes requeridos están presentes y legibles."
                if not faltantes
                else "Faltan o son ilegibles: "
                + ", ".join(ETIQUETAS_DOCUMENTO.get(t, t) for t in faltantes)
            ),
            cita="Condiciones Generales, cláusula 7 (documentos para el pago).",
        )
    )

    # 2. Vigencia de la póliza.
    vigente = poliza.vigencia_desde <= reclamacion.fecha_ingreso <= poliza.vigencia_hasta
    checks.append(
        CheckValidacion(
            nombre="Vigencia de la póliza",
            estado="ok" if vigente else "falla",
            detalle=(
                f"Siniestro dentro de vigencia ({poliza.vigencia_desde} a {poliza.vigencia_hasta})."
                if vigente
                else "La fecha de ingreso está fuera del período de vigencia."
            ),
            cita="Condiciones Particulares (período de vigencia).",
        )
    )

    # 3. Estado de pago (mora).
    al_dia = poliza.estado_pago == "al_dia"
    checks.append(
        CheckValidacion(
            nombre="Estado de pago de la póliza",
            estado="ok" if al_dia else "falla",
            detalle="Póliza al día." if al_dia else "La póliza se encuentra en mora.",
            cita="Art. 1068 C. de Comercio (mora en el pago de la prima).",
        )
    )

    # 4. Período de carencia.
    dias_desde_emision = (reclamacion.fecha_ingreso - poliza.vigencia_desde).days
    carencia_ok = dias_desde_emision >= cob.carencia_dias
    checks.append(
        CheckValidacion(
            nombre="Período de carencia",
            estado="ok" if carencia_ok else "falla",
            detalle=(
                f"Carencia de {cob.carencia_dias} días cumplida ({dias_desde_emision} días desde emisión)."
                if carencia_ok
                else f"No se cumple la carencia de {cob.carencia_dias} días "
                f"({dias_desde_emision} días desde emisión)."
            ),
            cita="Condiciones Particulares (período de carencia).",
        )
    )

    # 5. Exclusiones / diagnóstico cubierto.
    excluido = next(
        (e for e in poliza.exclusiones if e.lower() in reclamacion.diagnostico.lower()
         or reclamacion.diagnostico.lower() in e.lower()),
        None,
    )
    # Coincidencia también por palabras clave del diagnóstico.
    if not excluido:
        for e in poliza.exclusiones:
            clave = e.split()[0].lower()
            if clave in reclamacion.diagnostico.lower():
                excluido = e
                break
    checks.append(
        CheckValidacion(
            nombre="Diagnóstico cubierto",
            estado="ok" if not excluido else "falla",
            detalle=(
                "El diagnóstico no corresponde a una exclusión de la póliza."
                if not excluido
                else f"El diagnóstico coincide con la exclusión: «{excluido}»."
            ),
            cita="Condiciones Generales, cláusula 5 (exclusiones).",
        )
    )

    # 6. Consistencia de fechas.
    dias = _dias_internado(reclamacion)
    fechas_ok = reclamacion.fecha_ingreso <= reclamacion.fecha_egreso and dias >= 1
    checks.append(
        CheckValidacion(
            nombre="Consistencia de fechas",
            estado="ok" if fechas_ok else "falla",
            detalle=(
                f"{dias} día(s) de hospitalización; fechas coherentes."
                if fechas_ok
                else "Las fechas de ingreso/egreso son inconsistentes."
            ),
            cita="Validación interna de datos del siniestro.",
        )
    )

    # 7. Días indemnizables tras franquicia.
    dias_indemnizables = max(0, dias - cob.franquicia_dias)
    franquicia_ok = dias_indemnizables > 0
    checks.append(
        CheckValidacion(
            nombre="Días indemnizables (franquicia)",
            estado="ok" if franquicia_ok else "alerta",
            detalle=(
                f"{dias_indemnizables} día(s) indemnizable(s) tras franquicia de {cob.franquicia_dias}."
                if franquicia_ok
                else f"No hay días indemnizables: la internación ({dias}) no supera la "
                f"franquicia de {cob.franquicia_dias} día(s)."
            ),
            cita="Condiciones Particulares (franquicia en días).",
        )
    )

    # 8. Tope anual de días.
    disponibles = cob.tope_dias_anio - poliza.dias_usados_anio
    tope_ok = disponibles >= 1
    checks.append(
        CheckValidacion(
            nombre="Tope anual de días",
            estado="ok" if tope_ok else "alerta",
            detalle=(
                f"{poliza.dias_usados_anio}/{cob.tope_dias_anio} días usados en el año; "
                f"{max(0, disponibles)} disponibles."
            ),
            cita="Condiciones Particulares (tope anual de días).",
        )
    )

    casos = _casos_similares(reclamacion, excluido is not None, bool(faltantes))
    confianza = _confianza(checks)
    return ResultadoValidacion(
        checks=checks, casos_similares=casos, normativa=NORMATIVA, confianza=confianza
    )


def _confianza(checks: list[CheckValidacion]) -> int:
    fallas = sum(1 for c in checks if c.estado == "falla")
    alertas = sum(1 for c in checks if c.estado == "alerta")
    return max(40, 100 - fallas * 18 - alertas * 6)


def _casos_similares(reclamacion: Reclamacion, excluido: bool, faltan_docs: bool) -> list[CasoSimilar]:
    if faltan_docs:
        return [
            CasoSimilar(
                id="RH-2487",
                diagnostico=reclamacion.diagnostico,
                decision="solicitud_documentos",
                resumen="Caso análogo resuelto solicitando historia clínica faltante antes de liquidar.",
            )
        ]
    if excluido:
        return [
            CasoSimilar(
                id="RH-2390",
                diagnostico=reclamacion.diagnostico,
                decision="preobjetado",
                resumen="Diagnóstico excluido en condiciones generales; objetado con sustento.",
            )
        ]
    return [
        CasoSimilar(
            id="RH-2355",
            diagnostico=reclamacion.diagnostico,
            decision="preaprobado",
            resumen="Hospitalización por causa cubierta liquidada a renta diaria pactada.",
        ),
        CasoSimilar(
            id="RH-2298",
            diagnostico=reclamacion.diagnostico,
            decision="preaprobado",
            resumen="Caso similar con documentación completa; preaprobado sin observaciones.",
        ),
    ]
