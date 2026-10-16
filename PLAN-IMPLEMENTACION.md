# Plan de Implementación — Analista Virtual de Rentas Hospitalarias (Azure AI Foundry)

Este documento describe cómo llevar el prototipo local a una solución productiva sobre
**Azure AI Foundry**, conservando el pipeline de 3 agentes (Extracción → Análisis y
Validación → Decisión) y la trazabilidad exigida por un entorno asegurador regulado.

## 1. Mapeo prototipo → servicios Azure

| Etapa del prototipo | Rol | Servicio Azure destino |
| --- | --- | --- |
| Agente 1 — Extracción (`extraction.py`) | Leer historias clínicas, epicrisis, certificados, formularios | **Azure AI Document Intelligence** (modelos prebuilt + custom extraction) |
| Agente 2 — Validación RAG (`analysis.py`) | Recuperar cláusulas de póliza, normativa y casos resueltos | **Azure AI Search** (índice híbrido: vectorial + BM25 + semántico) |
| Agente 2 — Razonamiento | Interpretar documentación y contrastar reglas | **Azure OpenAI GPT-4o** (en Foundry) |
| Embeddings del índice | Vectorizar pólizas, normativa y casos | **text-embedding-3-large** |
| Agente 3 — Decisión (`decision.py`) | Orquestar agentes y emitir el concepto | **Foundry Agent Service** (connected agents + tools) |
| Store/KPIs (`store.py`) | Persistencia de expedientes y métricas | **Azure Cosmos DB** / **Azure SQL** + **Application Insights** |
| Documentos fuente | Repositorio de soportes | **Azure Blob Storage** |

## 2. Arquitectura destino

```
Portal / Teams (analista)
        │
        ▼
API (Azure Container Apps / App Service)  ── Entra ID (OBO) ──►  Foundry Agent Service
        │                                                             │
        │                                           ┌─────────────────┼─────────────────┐
        ▼                                           ▼                 ▼                 ▼
  Blob Storage                             Document Intelligence   AI Search        GPT-4o
 (soportes PDF)                              (extracción)        (RAG pólizas/      (análisis +
        │                                                         normativa/casos)   decisión)
        ▼
  Cosmos DB / Azure SQL  (expedientes, decisiones, auditoría)  ──►  Application Insights / Log Analytics
```

Orquestación: un **agente principal** en Foundry Agent Service coordina tres **connected
agents** (extracción, validación, decisión); cada uno expone herramientas (Document
Intelligence, AI Search, funciones de reglas). El razonamiento usa GPT-4o con *structured
outputs* para forzar el esquema de decisión (`preaprobado | preobjetado | solicitud_documentos`).

## 3. Datos y conocimiento (RAG)

1. **Ingesta**: condiciones generales/particulares de cada producto, circulares y normativa
   de la Superintendencia, histórico de casos resueltos.
2. **Chunking + embeddings** (`text-embedding-3-large`) → índice en **Azure AI Search** con
   campos de filtro (producto, cláusula, vigencia) y *semantic ranker*.
3. **Grounding**: cada check y cada decisión cita la cláusula/norma recuperada (ya modelado
   en el prototipo como `cita`), para trazabilidad y auditoría.

## 4. Seguridad, cumplimiento y trazabilidad

- **Identidad**: Entra ID + **Managed Identity**; sin claves embebidas. Acceso a AI Search,
  OpenAI y Storage vía RBAC data-plane.
- **Datos sensibles (PII/salud)**: cifrado en tránsito y reposo, redes privadas
  (**Private Endpoints** + VNet), `publicNetworkAccess=Disabled` donde la política lo exija.
- **Responsible AI**: **Azure AI Content Safety** y *prompt shields*; el agente **no decide en
  firme**: siempre recomienda y un humano confirma (human-in-the-loop, ya en el prototipo).
- **Auditoría**: cada ejecución (entradas, documentos, hallazgos, citas, decisión, confianza,
  analista) se registra en Cosmos DB/Azure SQL + Application Insights, con retención y
  exportación para el regulador.

> ⚠️ Nota de gobierno (subs MCAP): varias políticas fuerzan `publicNetworkAccess=Disabled` en
> Key Vault, Cosmos DB y Storage. Planificar **VNet + Private Endpoints** desde el día 1 y usar
> **secretos nativos de Container Apps** o Key Vault con endpoint privado.

## 5. Evaluación y calidad

- **Foundry Evaluations**: dataset de casos etiquetados por analistas; métricas de
  *groundedness*, *relevance* y exactitud de la decisión vs. ground truth.
- **Monitoreo continuo**: evaluación online sobre muestra de tráfico; alertas por caída de
  precisión o aumento de "revisión humana".
- **Umbral de confianza**: calibrar el umbral (prototipo: 70) con datos reales para equilibrar
  automatización vs. revisión.

## 6. Infraestructura y despliegue

- **IaC**: Bicep/Terraform para Foundry (AI Services + proyecto), AI Search, Document
  Intelligence, Storage, base de datos, Container Apps, red privada y RBAC.
- **azd** para provisión + despliegue del backend (remote build en ACR, sin Docker local).
- **CI/CD**: GitHub Actions con entornos dev/test/prod y *gates* de evaluación del agente.

## 7. Fases sugeridas

1. **Fundaciones** (2–3 sem): Foundry + modelos (GPT-4o, embeddings), red privada, RBAC,
   índice inicial de AI Search con un producto piloto.
2. **Agentes** (3–4 sem): Document Intelligence + extracción custom; validación RAG;
   motor de decisión con structured outputs; API + human-in-the-loop.
3. **Integración** (2–3 sem): persistencia, auditoría, Teams/portal, observabilidad.
4. **Evaluación y piloto** (2–3 sem): dataset etiquetado, calibración de umbral, piloto con un
   subconjunto de analistas.
5. **Escalado**: más productos/cláusulas, evaluación continua, optimización de prompts
   (Agent Optimizer).

## 8. KPIs de éxito

Reducción del tiempo de análisis (hoy 40–60 % del tiempo del analista), % de casos
auto-preaprobados sin ajuste humano, exactitud vs. ground truth, cumplimiento de SLA y
consistencia entre analistas.
