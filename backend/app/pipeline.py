"""Orquestación del pipeline agéntico: extracción -> validación -> decisión."""

from __future__ import annotations

from .analysis import validar
from .decision import decidir
from .extraction import extraer
from .models import Poliza, Reclamacion, ResultadoPipeline


def ejecutar_pipeline(reclamacion: Reclamacion, poliza: Poliza) -> ResultadoPipeline:
    extraccion = extraer(reclamacion, poliza)
    validacion = validar(reclamacion, poliza)
    decision = decidir(reclamacion, poliza, extraccion, validacion)
    confianza_global = round(
        0.3 * extraccion.confianza + 0.3 * validacion.confianza + 0.4 * decision.confianza
    )
    return ResultadoPipeline(
        extraccion=extraccion,
        validacion=validacion,
        decision=decision,
        confianza_global=confianza_global,
    )
