# Analista Virtual — Rentas Hospitalarias (prototipo local)

Prototipo del caso de uso **Rentas Hospitalarias** (Área de Indemnizaciones, Gerencia de
AP y Vida): un "analista virtual" que automatiza la **gestión y liquidación de reclamaciones**
mediante un pipeline agéntico de 3 etapas — **Extracción → Análisis y Validación → Motor de
Decisiones** — con tres salidas posibles: **Preaprobado**, **Preobjetado** y **Solicitud de
documentos adicionales**.

El prototipo es **100% local**: los "agentes" son reglas deterministas que simulan los
servicios de Azure AI Foundry. El mapeo a la arquitectura destino está en
[PLAN-IMPLEMENTACION.md](PLAN-IMPLEMENTACION.md) y el diseño en
[ARQUITECTURA.md](ARQUITECTURA.md).

## Demo en vivo (GitHub Pages)

**https://cdinapol.github.io/SBS-RentasHospitalarias/**

El frontend corre de forma autónoma: en GitHub Pages usa un **modo demo in-browser** que
ejecuta el mismo pipeline de 3 agentes portado a TypeScript (sin backend). El badge del
encabezado indica el modo activo:

- **Demo in-browser**: datos y pipeline en el navegador (GitHub Pages, o `?demo=1` en local).
- **Local (API)**: consume el backend FastAPI (por defecto en `localhost`; forzar con `?live`).

## Estructura

```
backend/   FastAPI + Pydantic, datos en memoria (pipeline de 3 agentes)
frontend/  React + TypeScript + Vite (dashboard + detalle del expediente)
```

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

Endpoints principales:

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET  | `/api/health` | Estado y parámetros del motor |
| GET  | `/api/kpis` | Indicadores del tablero |
| GET  | `/api/reclamaciones` | Lista (filtros: `estado`, `decision`, `analista`, `q`) |
| GET  | `/api/reclamaciones/{id}` | Expediente + póliza |
| POST | `/api/reclamaciones/{id}/analizar` | Ejecuta el pipeline agéntico |
| POST | `/api/reclamaciones/{id}/decision` | Registra la decisión humana |
| POST | `/api/reset` | Recarga los datos sintéticos |

## Frontend

```powershell
cd frontend
npm install
npm run dev   # http://localhost:5173 (proxy /api -> http://127.0.0.1:8000)
```

## Flujo

1. El tablero muestra KPIs (decisiones, revisión humana, SLA en riesgo, monto preaprobado,
   tiempo medio de análisis) y la cola de reclamaciones con filtros.
2. Al abrir un expediente se ejecuta el pipeline y se muestran los resultados **separados por
   agente**: campos extraídos (con confianza), checklist de validación (con citas a
   cláusulas/normativa y casos similares) y la decisión con el **monto estimado** de la renta.
3. El analista confirma o ajusta la decisión (decisión humana), conservando la trazabilidad.
