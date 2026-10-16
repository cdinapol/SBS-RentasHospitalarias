"""Esquemas de dominio del prototipo de Rentas Hospitalarias."""

from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel

Decision = Literal["preaprobado", "preobjetado", "solicitud_documentos", "sin_analizar"]
EstadoReclamacion = Literal["nuevo", "analizado", "decidido"]
EstadoCheck = Literal["ok", "alerta", "falla"]
Causa = Literal["enfermedad", "accidente"]


class Cobertura(BaseModel):
    renta_diaria: float
    franquicia_dias: int
    tope_dias_anio: int
    suma_asegurada: float
    carencia_dias: int


class Poliza(BaseModel):
    id: str
    tomador: str
    producto: str
    cobertura: Cobertura
    vigencia_desde: date
    vigencia_hasta: date
    estado_pago: Literal["al_dia", "en_mora"]
    exclusiones: list[str]
    dias_usados_anio: int = 0


class Documento(BaseModel):
    tipo: str
    presente: bool
    legible: bool = True


class Reclamacion(BaseModel):
    id: str
    asegurado: str
    documento_asegurado: str
    poliza_id: str
    analista: str
    fecha_recepcion: date
    fecha_ingreso: date
    fecha_egreso: date
    diagnostico_cie10: str
    diagnostico: str
    causa: Causa
    prestador: str
    documentos: list[Documento]
    complejidad: Literal["baja", "media", "alta"]
    estado: EstadoReclamacion = "nuevo"
    decision: Decision = "sin_analizar"
    resultado: Optional["ResultadoPipeline"] = None
    decision_humana: Optional["DecisionHumana"] = None


class HallazgoExtraccion(BaseModel):
    campo: str
    valor: str
    confianza: int
    fuente: str


class CheckValidacion(BaseModel):
    nombre: str
    estado: EstadoCheck
    detalle: str
    cita: str


class CasoSimilar(BaseModel):
    id: str
    diagnostico: str
    decision: Decision
    resumen: str


class ResultadoExtraccion(BaseModel):
    hallazgos: list[HallazgoExtraccion]
    confianza: int


class ResultadoValidacion(BaseModel):
    checks: list[CheckValidacion]
    casos_similares: list[CasoSimilar]
    normativa: list[str]
    confianza: int


class ResultadoDecision(BaseModel):
    decision: Decision
    causal: str
    citas: list[str]
    dias_indemnizables: int
    monto_estimado: float
    confianza: int
    requiere_revision_humana: bool
    documentos_faltantes: list[str]


class ResultadoPipeline(BaseModel):
    extraccion: ResultadoExtraccion
    validacion: ResultadoValidacion
    decision: ResultadoDecision
    confianza_global: int


class DecisionHumana(BaseModel):
    decision: Decision
    comentario: str
    analista: str
    coincide_con_ia: bool


class KPIs(BaseModel):
    total: int
    nuevos: int
    analizados: int
    decididos: int
    preaprobados: int
    preobjetados: int
    solicitud_documentos: int
    requieren_revision: int
    sla_en_riesgo: int
    monto_preaprobado: float
    tiempo_medio_analisis_min: float
    por_complejidad: dict[str, int]


class DecisionHumanaInput(BaseModel):
    decision: Decision
    comentario: str = ""
