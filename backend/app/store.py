"""Almacén en memoria de pólizas y reclamaciones del prototipo."""

from __future__ import annotations

from .config import HOY, SLA_RIESGO_DIAS
from .models import (
    DecisionHumana,
    KPIs,
    Poliza,
    Reclamacion,
    ResultadoPipeline,
)
from .pipeline import ejecutar_pipeline
from .seed import POLIZAS, construir_reclamaciones

# Minutos simulados de análisis manual ahorrados, por complejidad (para el KPI de tiempo).
_TIEMPO_ANALISIS = {"baja": 12.0, "media": 20.0, "alta": 35.0}


class Store:
    def __init__(self) -> None:
        self.polizas: dict[str, Poliza] = {}
        self.reclamaciones: dict[str, Reclamacion] = {}
        self.reset()

    def reset(self) -> None:
        self.polizas = {p.id: p for p in POLIZAS}
        self.reclamaciones = {r.id: r for r in construir_reclamaciones()}

    def poliza(self, poliza_id: str) -> Poliza | None:
        return self.polizas.get(poliza_id)

    def listar(
        self,
        estado: str | None = None,
        decision: str | None = None,
        analista: str | None = None,
        q: str | None = None,
    ) -> list[Reclamacion]:
        items = list(self.reclamaciones.values())
        if estado:
            items = [r for r in items if r.estado == estado]
        if decision:
            items = [r for r in items if r.decision == decision]
        if analista:
            items = [r for r in items if r.analista == analista]
        if q:
            ql = q.lower()
            items = [
                r
                for r in items
                if ql in r.asegurado.lower()
                or ql in r.id.lower()
                or ql in r.diagnostico.lower()
                or ql in r.poliza_id.lower()
            ]
        return sorted(items, key=lambda r: r.fecha_recepcion)

    def obtener(self, reclamacion_id: str) -> Reclamacion | None:
        return self.reclamaciones.get(reclamacion_id)

    def analizar(self, reclamacion_id: str) -> Reclamacion | None:
        reclamacion = self.reclamaciones.get(reclamacion_id)
        if not reclamacion:
            return None
        poliza = self.polizas[reclamacion.poliza_id]
        resultado: ResultadoPipeline = ejecutar_pipeline(reclamacion, poliza)
        reclamacion.resultado = resultado
        reclamacion.decision = resultado.decision.decision
        reclamacion.estado = "analizado"
        return reclamacion

    def registrar_decision(
        self, reclamacion_id: str, decision: str, comentario: str
    ) -> Reclamacion | None:
        reclamacion = self.reclamaciones.get(reclamacion_id)
        if not reclamacion or not reclamacion.resultado:
            return None
        reclamacion.decision_humana = DecisionHumana(
            decision=decision,  # type: ignore[arg-type]
            comentario=comentario,
            analista=reclamacion.analista,
            coincide_con_ia=decision == reclamacion.resultado.decision.decision,
        )
        reclamacion.decision = decision  # type: ignore[assignment]
        reclamacion.estado = "decidido"
        return reclamacion

    def _sla_en_riesgo(self, r: Reclamacion) -> bool:
        if r.estado == "decidido":
            return False
        return (HOY - r.fecha_recepcion).days >= SLA_RIESGO_DIAS

    def kpis(self) -> KPIs:
        items = list(self.reclamaciones.values())
        analizados = [r for r in items if r.estado in ("analizado", "decidido")]
        por_complejidad: dict[str, int] = {"baja": 0, "media": 0, "alta": 0}
        for r in items:
            por_complejidad[r.complejidad] += 1

        monto = sum(
            r.resultado.decision.monto_estimado
            for r in analizados
            if r.resultado and r.decision == "preaprobado"
        )
        tiempos = [_TIEMPO_ANALISIS[r.complejidad] for r in analizados]
        tiempo_medio = round(sum(tiempos) / len(tiempos), 1) if tiempos else 0.0

        return KPIs(
            total=len(items),
            nuevos=sum(1 for r in items if r.estado == "nuevo"),
            analizados=sum(1 for r in items if r.estado == "analizado"),
            decididos=sum(1 for r in items if r.estado == "decidido"),
            preaprobados=sum(1 for r in items if r.decision == "preaprobado"),
            preobjetados=sum(1 for r in items if r.decision == "preobjetado"),
            solicitud_documentos=sum(1 for r in items if r.decision == "solicitud_documentos"),
            requieren_revision=sum(
                1
                for r in analizados
                if r.resultado and r.resultado.decision.requiere_revision_humana
            ),
            sla_en_riesgo=sum(1 for r in items if self._sla_en_riesgo(r)),
            monto_preaprobado=monto,
            tiempo_medio_analisis_min=tiempo_medio,
            por_complejidad=por_complejidad,
        )


store = Store()
