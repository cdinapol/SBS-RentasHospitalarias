"""API FastAPI del prototipo Analista Virtual de Rentas Hospitalarias."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import HOY, SLA_DIAS, UMBRAL_CONFIANZA
from .models import DecisionHumanaInput
from .store import store

app = FastAPI(title="Analista Virtual — Rentas Hospitalarias", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "hoy": HOY.isoformat(),
        "sla_dias": SLA_DIAS,
        "umbral_confianza": UMBRAL_CONFIANZA,
        "modo": "prototipo-local",
    }


@app.get("/api/kpis")
def kpis():
    return store.kpis()


@app.get("/api/reclamaciones")
def listar(
    estado: str | None = None,
    decision: str | None = None,
    analista: str | None = None,
    q: str | None = None,
):
    return store.listar(estado=estado, decision=decision, analista=analista, q=q)


@app.get("/api/reclamaciones/{reclamacion_id}")
def obtener(reclamacion_id: str):
    reclamacion = store.obtener(reclamacion_id)
    if not reclamacion:
        raise HTTPException(status_code=404, detail="Reclamación no encontrada")
    poliza = store.poliza(reclamacion.poliza_id)
    return {"reclamacion": reclamacion, "poliza": poliza}


@app.post("/api/reclamaciones/{reclamacion_id}/analizar")
def analizar(reclamacion_id: str):
    reclamacion = store.analizar(reclamacion_id)
    if not reclamacion:
        raise HTTPException(status_code=404, detail="Reclamación no encontrada")
    return reclamacion


@app.post("/api/reclamaciones/{reclamacion_id}/decision")
def decidir(reclamacion_id: str, entrada: DecisionHumanaInput):
    reclamacion = store.registrar_decision(
        reclamacion_id, entrada.decision, entrada.comentario
    )
    if not reclamacion:
        raise HTTPException(
            status_code=400,
            detail="Reclamación no encontrada o aún no analizada por el pipeline.",
        )
    return reclamacion


@app.post("/api/reset")
def reset():
    store.reset()
    return {"status": "ok", "total": len(store.reclamaciones)}
