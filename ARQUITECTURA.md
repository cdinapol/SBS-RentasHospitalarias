# Arquitectura del prototipo — Analista Virtual de Rentas Hospitalarias

## 1. Contexto

Los analistas de indemnizaciones de **AP y Vida** resuelven un alto volumen de reclamaciones
de **renta hospitalaria** (renta diaria por día de hospitalización). Hoy dedican entre el
40 % y 60 % de su tiempo a buscar, consolidar y validar información dispersa en pólizas,
historias clínicas, soportes y normativa antes de emitir un concepto. El prototipo simula un
**analista virtual** que acelera y "agentiza" ese proceso.

## 2. Pipeline agéntico (3 etapas)

```
Documentos recibidos
        │
        ▼
┌─────────────────────┐   Agente 1 — Extracción
│  Extracción de       │   (simula Azure Document Intelligence)
│  información          │   Campos: asegurado, diagnóstico CIE-10, fechas,
└──────────┬──────────┘   días, prestador, póliza + confianza por campo
           ▼
┌─────────────────────┐   Agente 2 — Análisis y Validación
│  Análisis y          │   (simula Azure AI Search RAG + GPT-4o)
│  validación          │   Checks de cobertura + recuperación de cláusulas,
└──────────┬──────────┘   normativa y casos similares
           ▼
┌─────────────────────┐   Agente 3 — Motor de Decisiones
│  Motor de            │   (reglas + score de confianza)
│  decisiones          │
└───┬────────┬────────┘
    │        │
    │        └──────────►  Solicitud de documentos adicionales
    ├───────────────────►  Preaprobado (con monto calculado)
    └───────────────────►  Preobjetado (con causal citada)
```

## 3. Componentes del prototipo

### Backend (`backend/app/`)
- **`models.py`** — esquemas Pydantic del dominio (Reclamación, Póliza, Cobertura, Documento,
  resultados de cada agente, KPIs).
- **`seed.py`** — 6 pólizas y ~35 reclamaciones sintéticas que cubren todos los escenarios
  (limpias, documentación faltante, exclusión, carencia incumplida, póliza en mora, tope anual
  alcanzado, fechas inconsistentes). Fecha de referencia: `HOY = 2026-10-16`.
- **`extraction.py`** — Agente 1: deriva campos y asigna confianza según presencia/legibilidad
  de soportes.
- **`analysis.py`** — Agente 2: 8 validaciones de cobertura + casos similares + normativa.
- **`decision.py`** — Agente 3: prioridad `solicitud_documentos` → `preobjetado` →
  `preaprobado`, cálculo de monto y señal de revisión humana.
- **`pipeline.py`** — orquesta los 3 agentes y calcula la confianza global.
- **`store.py`** — almacén en memoria, filtros y KPIs.
- **`config.py`** — parámetros del motor (umbral de confianza, SLA, documentos requeridos).
- **`main.py`** — API FastAPI.

### Frontend (`frontend/src/`)
- **`App.tsx`** — tablero: KPIs, distribución de decisiones, filtros y cola de reclamaciones.
- **`ReclamacionDetail.tsx`** — expediente con resultados separados por agente y panel de
  decisión humana.
- **`api.ts`, `types.ts`, `constants.ts`** — cliente HTTP, tipos y catálogos.

## 4. Reglas de negocio modeladas

**Validaciones (Agente 2):** documentación completa y legible · vigencia de la póliza ·
estado de pago (mora) · período de carencia · diagnóstico no excluido · consistencia de
fechas · días indemnizables tras franquicia · tope anual de días.

**Decisión (Agente 3):**
- Falta documentación esencial → **Solicitud de documentos** (lista los faltantes).
- Falla dura no subsanable (fuera de vigencia, en mora, carencia incumplida, diagnóstico
  excluido, fechas inconsistentes) → **Preobjetado** (causal + cita).
- Todo cubierto → **Preaprobado**, con
  `monto = min(días_indemnizables × renta_diaria, suma_asegurada)`, donde
  `días_indemnizables = max(0, días_hospitalización − franquicia)` acotado por el tope anual.
- Confianza global por debajo del umbral (70) → marca **revisión humana obligatoria**.

## 5. Límites del prototipo

Sin nube, sin OCR real, sin autenticación ni persistencia (datos en memoria, se reinician con
`/api/reset`). La arquitectura destino en Azure AI Foundry está en
[PLAN-IMPLEMENTACION.md](PLAN-IMPLEMENTACION.md).
