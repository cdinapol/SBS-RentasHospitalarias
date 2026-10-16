import { useCallback, useEffect, useState } from "react";
import { api, type Filtros } from "./api";
import { DECISION_COLOR, DECISION_LABEL, money } from "./constants";
import ReclamacionDetail from "./ReclamacionDetail";
import ArquitecturaTab from "./ArquitecturaTab";
import type { Decision, KPIs, Reclamacion } from "./types";

const DECISIONES: Decision[] = [
  "preaprobado",
  "preobjetado",
  "solicitud_documentos",
];

export default function App() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [items, setItems] = useState<Reclamacion[]>([]);
  const [filtros, setFiltros] = useState<Filtros>({});
  const [sel, setSel] = useState<string | null>(null);
  const [cargandoLote, setCargandoLote] = useState(false);
  const [tab, setTab] = useState<"operacion" | "arquitectura">("operacion");

  const refrescar = useCallback(async () => {
    const [k, l] = await Promise.all([api.kpis(), api.listar(filtros)]);
    setKpis(k);
    setItems(l);
  }, [filtros]);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  async function analizarTodo() {
    setCargandoLote(true);
    const sinAnalizar = (await api.listar()).filter((r) => r.estado === "nuevo");
    for (const r of sinAnalizar) {
      await api.analizar(r.id);
    }
    await refrescar();
    setCargandoLote(false);
  }

  async function reset() {
    await api.reset();
    await refrescar();
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Analista Virtual — Rentas Hospitalarias</h1>
          <div className="sub">
            Indemnizaciones AP y Vida · Pipeline agéntico: Extracción → Análisis →
            Decisión
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge-modo">Prototipo local</span>
          <button className="btn" onClick={reset}>
            Reiniciar datos
          </button>
          <button
            className="btn btn-primary"
            onClick={analizarTodo}
            disabled={cargandoLote}
          >
            {cargandoLote ? "Analizando…" : "Analizar todos"}
          </button>
        </div>
      </header>

      <div className="tabs">
        <button
          className={`tab${tab === "operacion" ? " active" : ""}`}
          onClick={() => setTab("operacion")}
        >
          Operación
        </button>
        <button
          className={`tab${tab === "arquitectura" ? " active" : ""}`}
          onClick={() => setTab("arquitectura")}
        >
          Arquitectura y Foundry
        </button>
      </div>

      {tab === "arquitectura" && <ArquitecturaTab />}

      {tab === "operacion" && (
        <>
      {kpis && (
        <>
          <div className="kpi-grid">
            <Kpi label="Reclamaciones" value={kpis.total} />
            <Kpi label="Preaprobadas" value={kpis.preaprobados} color="var(--teal)" />
            <Kpi label="Preobjetadas" value={kpis.preobjetados} color="var(--red)" />
            <Kpi
              label="Piden documentos"
              value={kpis.solicitud_documentos}
              color="var(--amber)"
            />
            <Kpi
              label="Revisión humana"
              value={kpis.requieren_revision}
              color="var(--purple)"
            />
            <Kpi label="SLA en riesgo" value={kpis.sla_en_riesgo} color="var(--red)" />
            <Kpi
              label="Monto preaprobado"
              value={money(kpis.monto_preaprobado)}
              small
              color="var(--teal)"
            />
            <Kpi
              label="Tiempo medio análisis"
              value={`${kpis.tiempo_medio_analisis_min} min`}
              small
            />
          </div>

          <div className="panel">
            <h2>Distribución de decisiones</h2>
            <div className="bars">
              {DECISIONES.map((d) => {
                const val =
                  d === "preaprobado"
                    ? kpis.preaprobados
                    : d === "preobjetado"
                    ? kpis.preobjetados
                    : kpis.solicitud_documentos;
                const max = Math.max(
                  1,
                  kpis.preaprobados,
                  kpis.preobjetados,
                  kpis.solicitud_documentos
                );
                return (
                  <div className="bar-row" key={d}>
                    <span>{DECISION_LABEL[d]}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${(val / max) * 100}%`,
                          background: DECISION_COLOR[d],
                        }}
                      />
                    </div>
                    <span>{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="filtros">
        <input
          placeholder="Buscar asegurado, id, diagnóstico…"
          value={filtros.q ?? ""}
          onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))}
        />
        <select
          value={filtros.decision ?? ""}
          onChange={(e) =>
            setFiltros((f) => ({ ...f, decision: e.target.value || undefined }))
          }
        >
          <option value="">Toda decisión</option>
          {DECISIONES.map((d) => (
            <option key={d} value={d}>
              {DECISION_LABEL[d]}
            </option>
          ))}
        </select>
        <select
          value={filtros.estado ?? ""}
          onChange={(e) =>
            setFiltros((f) => ({ ...f, estado: e.target.value || undefined }))
          }
        >
          <option value="">Todo estado</option>
          <option value="nuevo">Nuevo</option>
          <option value="analizado">Analizado</option>
          <option value="decidido">Decidido</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Asegurado</th>
            <th>Diagnóstico</th>
            <th>Póliza</th>
            <th>Complejidad</th>
            <th>Estado</th>
            <th>Decisión</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} onClick={() => setSel(r.id)}>
              <td>{r.id}</td>
              <td>{r.asegurado}</td>
              <td>
                {r.diagnostico_cie10} · {r.diagnostico}
              </td>
              <td>{r.poliza_id}</td>
              <td>
                <span className="tag">{r.complejidad}</span>
              </td>
              <td>{r.estado}</td>
              <td>
                {r.decision === "sin_analizar" ? (
                  <span className="muted">—</span>
                ) : (
                  <span
                    className="pill"
                    style={{ background: DECISION_COLOR[r.decision] }}
                  >
                    {DECISION_LABEL[r.decision]}
                  </span>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={7} className="muted" style={{ textAlign: "center" }}>
                Sin resultados para los filtros aplicados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
        </>
      )}

      {sel && (
        <ReclamacionDetail
          id={sel}
          onClose={() => setSel(null)}
          onChange={refrescar}
        />
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  color,
  small,
}: {
  label: string;
  value: number | string;
  color?: string;
  small?: boolean;
}) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className={`value${small ? " small" : ""}`} style={{ color }}>
        {value}
      </div>
    </div>
  );
}
