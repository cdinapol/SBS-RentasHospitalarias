"""Agente 1 — Extracción de información (simula Azure Document Intelligence).

En producción, un agente de Foundry con Document Intelligence leería los PDF/imágenes
del expediente. Aquí derivamos los campos de los datos sintéticos y asignamos una
confianza según la legibilidad y presencia de los documentos soporte.
"""

from __future__ import annotations

from .config import ETIQUETAS_DOCUMENTO
from .models import HallazgoExtraccion, Poliza, Reclamacion, ResultadoExtraccion


def _dias(reclamacion: Reclamacion) -> int:
    return (reclamacion.fecha_egreso - reclamacion.fecha_ingreso).days


def extraer(reclamacion: Reclamacion, poliza: Poliza) -> ResultadoExtraccion:
    presentes = {d.tipo for d in reclamacion.documentos if d.presente}
    ilegibles = {d.tipo for d in reclamacion.documentos if d.presente and not d.legible}

    tiene_clinica = "historia_clinica" in presentes and "historia_clinica" not in ilegibles
    tiene_certificado = "certificado_hospitalario" in presentes

    hallazgos = [
        HallazgoExtraccion(
            campo="Asegurado",
            valor=reclamacion.asegurado,
            confianza=98 if "documento_identidad" in presentes else 70,
            fuente=ETIQUETAS_DOCUMENTO["documento_identidad"],
        ),
        HallazgoExtraccion(
            campo="Diagnóstico (CIE-10)",
            valor=f"{reclamacion.diagnostico_cie10} — {reclamacion.diagnostico}",
            confianza=95 if tiene_clinica else 55,
            fuente=ETIQUETAS_DOCUMENTO["historia_clinica"],
        ),
        HallazgoExtraccion(
            campo="Fecha de ingreso",
            valor=reclamacion.fecha_ingreso.isoformat(),
            confianza=96 if tiene_certificado else 60,
            fuente=ETIQUETAS_DOCUMENTO["certificado_hospitalario"],
        ),
        HallazgoExtraccion(
            campo="Fecha de egreso",
            valor=reclamacion.fecha_egreso.isoformat(),
            confianza=96 if tiene_certificado else 60,
            fuente=ETIQUETAS_DOCUMENTO["certificado_hospitalario"],
        ),
        HallazgoExtraccion(
            campo="Días de hospitalización",
            valor=str(_dias(reclamacion)),
            confianza=94 if tiene_certificado else 58,
            fuente=ETIQUETAS_DOCUMENTO["certificado_hospitalario"],
        ),
        HallazgoExtraccion(
            campo="Prestador",
            valor=reclamacion.prestador,
            confianza=90 if tiene_certificado else 65,
            fuente=ETIQUETAS_DOCUMENTO["certificado_hospitalario"],
        ),
        HallazgoExtraccion(
            campo="Póliza referenciada",
            valor=f"{poliza.id} — {poliza.producto}",
            confianza=97 if "formulario_reclamacion" in presentes else 72,
            fuente=ETIQUETAS_DOCUMENTO["formulario_reclamacion"],
        ),
    ]

    confianza = round(sum(h.confianza for h in hallazgos) / len(hallazgos))
    return ResultadoExtraccion(hallazgos=hallazgos, confianza=confianza)
