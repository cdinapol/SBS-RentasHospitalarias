import { AGENTES } from "./constants";

interface Etapa {
  n: number;
  titulo: string;
  servicio: string;
  simulado: string;
  detalle: string;
  salida: string;
}

const ETAPAS: Etapa[] = [
  {
    n: 1,
    titulo: "Extracción de información",
    servicio: "Azure AI Document Intelligence",
    simulado: "extraction.py",
    detalle:
      "Lee los documentos del expediente (historia clínica, epicrisis, certificado hospitalario, formulario) y extrae campos estructurados con un nivel de confianza por campo.",
    salida: "Asegurado, diagnóstico CIE-10, fechas, días, prestador y póliza.",
  },
  {
    n: 2,
    titulo: "Análisis y validación",
    servicio: "Azure AI Search (RAG) + Azure OpenAI GPT-4o",
    simulado: "analysis.py",
    detalle:
      "Corre 8 validaciones de cobertura contra la póliza y recupera cláusulas, normativa y casos similares (RAG híbrido vectorial + semántico). Cada check queda citado para trazabilidad.",
    salida: "Checklist de validación con estado (ok/alerta/falla) + evidencia.",
  },
  {
    n: 3,
    titulo: "Motor de decisiones",
    servicio: "Foundry Agent Service (orquestación)",
    simulado: "decision.py",
    detalle:
      "Combina extracción y validación y emite el concepto con structured outputs. Calcula el monto de la renta y marca revisión humana si la confianza es baja.",
    salida: "Preaprobado · Preobjetado · Solicitud de documentos.",
  },
];

const SERVICIOS = [
  {
    servicio: "Azure AI Document Intelligence",
    rol: "Extracción de datos de historias clínicas, epicrisis y certificados.",
    etapa: "Agente 1",
  },
  {
    servicio: "Azure AI Search",
    rol: "Índice híbrido (vectorial + BM25 + semántico) de pólizas, normativa y casos resueltos para RAG.",
    etapa: "Agente 2",
  },
  {
    servicio: "Azure OpenAI — GPT-4o",
    rol: "Razonamiento sobre documentación y reglas; structured outputs para la decisión.",
    etapa: "Agentes 2 y 3",
  },
  {
    servicio: "text-embedding-3-large",
    rol: "Vectorización de pólizas, normativa y casos para el índice de búsqueda.",
    etapa: "Indexación",
  },
  {
    servicio: "Foundry Agent Service",
    rol: "Orquesta los 3 agentes conectados (connected agents + tools) y el human-in-the-loop.",
    etapa: "Orquestación",
  },
  {
    servicio: "Azure Blob Storage",
    rol: "Repositorio de soportes documentales del expediente.",
    etapa: "Datos",
  },
  {
    servicio: "Cosmos DB / Azure SQL + App Insights",
    rol: "Expedientes, decisiones y auditoría/trazabilidad regulatoria.",
    etapa: "Persistencia",
  },
  {
    servicio: "Azure AI Content Safety",
    rol: "Prompt shields y moderación; refuerza el Responsible AI.",
    etapa: "Transversal",
  },
];

export default function ArquitecturaTab() {
  return (
    <div>
      <div className="panel">
        <h2>Lógica de la solución — pipeline agéntico</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Un “analista virtual” procesa cada reclamación de renta hospitalaria en tres
          etapas secuenciales. En este prototipo las tres etapas son reglas deterministas
          locales; en producción cada una se resuelve con un servicio de Azure AI Foundry.
        </p>

        <div className="flow">
          <div className="flow-start">📄 Documentos recibidos</div>
          <div className="flow-arrow">▼</div>
          {ETAPAS.map((e) => (
            <div key={e.n} style={{ width: "100%" }}>
              <div className="flow-node">
                <div className="agente-num">{e.n}</div>
                <div style={{ flex: 1 }}>
                  <strong>{e.titulo}</strong>
                  <div className="muted">{e.detalle}</div>
                  <div className="flow-salida">↳ {e.salida}</div>
                </div>
                <span className="svc">{e.servicio}</span>
              </div>
              {e.n < 3 && <div className="flow-arrow">▼</div>}
            </div>
          ))}
          <div className="flow-arrow">▼</div>
          <div className="flow-salidas">
            <span className="pill" style={{ background: "var(--teal)" }}>
              Preaprobado
            </span>
            <span className="pill" style={{ background: "var(--red)" }}>
              Preobjetado
            </span>
            <span className="pill" style={{ background: "var(--amber)" }}>
              Solicitud de documentos
            </span>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Arquitectura destino (Azure AI Foundry)</h2>
        <pre className="arch">{`Portal / Teams (analista)
      │
      ▼
API (Container Apps)  ── Entra ID / Managed Identity ──►  Foundry Agent Service
      │                                                        │
      │                                 ┌──────────────────────┼──────────────────────┐
      ▼                                 ▼                      ▼                      ▼
 Blob Storage                  Document Intelligence      AI Search               GPT-4o
 (soportes)                      (extracción)         (RAG pólizas/normativa)  (análisis+decisión)
      │
      ▼
 Cosmos DB / Azure SQL  (expedientes, decisiones, auditoría)  ──►  Application Insights`}</pre>
        <p className="muted">
          El agente principal coordina tres <b>connected agents</b> (extracción, validación,
          decisión); cada uno expone herramientas. El agente <b>recomienda</b> y un humano
          confirma (human-in-the-loop), con cada decisión citada y auditada.
        </p>
      </div>

      <div className="panel">
        <h2>Servicios de Foundry utilizados</h2>
        <table>
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Rol en la solución</th>
              <th>Etapa</th>
            </tr>
          </thead>
          <tbody>
            {SERVICIOS.map((s) => (
              <tr key={s.servicio} style={{ cursor: "default" }}>
                <td>
                  <b>{s.servicio}</b>
                </td>
                <td>{s.rol}</td>
                <td>
                  <span className="tag">{s.etapa}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: 10 }}>
          En el prototipo local, los agentes {AGENTES.map((a) => a.n).join(", ")} están
          implementados como reglas deterministas (archivos{" "}
          <code>extraction.py</code>, <code>analysis.py</code>, <code>decision.py</code>) que
          emulan estos servicios sin consumir Azure.
        </p>
      </div>
    </div>
  );
}
