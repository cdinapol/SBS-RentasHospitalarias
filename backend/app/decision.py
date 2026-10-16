"""Agente 3 — Motor de decisiones.

Combina extracción y validación para emitir una de las tres salidas del caso:
preaprobado, preobjetado o solicitud de documentos adicionales, con el monto estimado
de la renta y la señal de revisión humana cuando la confianza es baja.
"""

from __future__ import annotations

from .config import ETIQUETAS_DOCUMENTO, UMBRAL_CONFIANZA
from .models import (
    Poliza,
    Reclamacion,
    ResultadoDecision,
    ResultadoExtraccion,
    ResultadoValidacion,
)

# Checks cuya falla objeta la reclamación (no es subsanable con más documentos).
CHECKS_OBJETABLES = {
    "Vigencia de la póliza",
    "Estado de pago de la póliza",
    "Período de carencia",
    "Diagnóstico cubierto",
    "Consistencia de fechas",
}


def decidir(
    reclamacion: Reclamacion,
    poliza: Poliza,
    extraccion: ResultadoExtraccion,
    validacion: ResultadoValidacion,
) -> ResultadoDecision:
    cob = poliza.cobertura
    check_docs = next(c for c in validacion.checks if c.nombre == "Documentación completa")
    fallas_duras = [
        c for c in validacion.checks if c.estado == "falla" and c.nombre in CHECKS_OBJETABLES
    ]

    presentes = {d.tipo for d in reclamacion.documentos if d.presente and d.legible}
    from .config import DOCUMENTOS_REQUERIDOS

    faltantes = [t for t in DOCUMENTOS_REQUERIDOS if t not in presentes]

    dias = (reclamacion.fecha_egreso - reclamacion.fecha_ingreso).days
    dias_indemnizables = max(0, dias - cob.franquicia_dias)
    disponibles = max(0, cob.tope_dias_anio - poliza.dias_usados_anio)
    dias_a_pagar = min(dias_indemnizables, disponibles)
    monto = min(dias_a_pagar * cob.renta_diaria, cob.suma_asegurada)

    confianza = round(0.4 * extraccion.confianza + 0.6 * validacion.confianza)

    # Prioridad 1: falta documentación esencial -> solicitar documentos.
    if check_docs.estado == "falla":
        return ResultadoDecision(
            decision="solicitud_documentos",
            causal="Documentación incompleta para liquidar la reclamación.",
            citas=[check_docs.cita],
            dias_indemnizables=dias_indemnizables,
            monto_estimado=0.0,
            confianza=confianza,
            requiere_revision_humana=confianza < UMBRAL_CONFIANZA,
            documentos_faltantes=[ETIQUETAS_DOCUMENTO.get(t, t) for t in faltantes],
        )

    # Prioridad 2: falla dura -> preobjetar.
    if fallas_duras:
        return ResultadoDecision(
            decision="preobjetado",
            causal="; ".join(c.detalle for c in fallas_duras),
            citas=[c.cita for c in fallas_duras],
            dias_indemnizables=dias_indemnizables,
            monto_estimado=0.0,
            confianza=confianza,
            requiere_revision_humana=confianza < UMBRAL_CONFIANZA,
            documentos_faltantes=[],
        )

    # Prioridad 3: todo cubierto -> preaprobar con monto calculado.
    citas = ["Condiciones Particulares (renta diaria y franquicia)."]
    if dias_a_pagar < dias_indemnizables:
        citas.append("Condiciones Particulares (tope anual de días alcanzado).")
    causal = (
        f"{dias_a_pagar} día(s) a renta diaria de ${cob.renta_diaria:,.0f} "
        f"= ${monto:,.0f} (franquicia {cob.franquicia_dias}, tope suma asegurada ${cob.suma_asegurada:,.0f})."
    )
    return ResultadoDecision(
        decision="preaprobado",
        causal=causal,
        citas=citas,
        dias_indemnizables=dias_indemnizables,
        monto_estimado=monto,
        confianza=confianza,
        requiere_revision_humana=confianza < UMBRAL_CONFIANZA,
        documentos_faltantes=[],
    )
