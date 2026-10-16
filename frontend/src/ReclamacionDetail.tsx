import { useEffect, useState } from "react";
import { api } from "./api";
import {
  AGENTES,
  CHECK_COLOR,
  CHECK_ICON,
  DECISION_COLOR,
  DECISION_LABEL,
  money,
} from "./constants";
import type { Decision, DetalleReclamacion, Reclamacion } from "./types";

interface Props {
  id: string;
  onClose: () => void;
  onChange: () => void;
}

export default function ReclamacionDetail({ id, onClose, onChange }: Props) {
  const [data, setData] = useState<DetalleReclamacion | null>(null);
  const [comentario, setComentario] = useState("");
  const [busy, setBusy] = useState(false);

  async function cargar() {
    setData(await api.detalle(id));
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function analizar() {
    setBusy(true);
    await api.analizar(id);
    await cargar();
    onChange();
    setBusy(false);
  }

  async function decidir(decision: Decision) {
    setBusy(true);
    await api.decidir(id, decision, comentario);
    await cargar();
    onChange();
    setBusy(false);
  }

  if (!data) return null;
  const r: Reclamacion = data.reclamacion;
  const p = data.poliza;
  const res = r.resultado;
  const dias =
    (new Date(r.fecha_egreso).getTime() - new Date(r.fecha_ingreso).getTime()) /
    86400000;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>
              {r.id} — {r.asegurado}
            </h2>
            <div className="muted">
              {r.diagnostico_cie10} · {r.diagnostico} · {r.prestador}
            </div>
          </div>
          <button className="close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="grid-2">
          <div className="panel" style={{ margin: 0 }}>
            <h2>Expediente</h2>
            <div className="dato">
              <b>Póliza:</b> {p.id} — {p.tomador}
            </div>
            <div className="dato">
              <b>Producto:</b> {p.producto}
            </div>
            <div className="dato">
              <b>Hospitalización:</b> {r.fecha_ingreso} → {r.fecha_egreso} ({dias}{" "}
              días)
            </div>
            <div className="dato">
              <b>Causa:</b> {r.causa} · <b>Complejidad:</b> {r.complejidad}
            </div>
            <div className="dato">
              <b>Analista:</b> {r.analista} · <b>Recepción:</b> {r.fecha_recepcion}
            </div>
          </div>
          <div className="panel" style={{ margin: 0 }}>
            <h2>Cobertura</h2>
            <div className="dato">
              <b>Renta diaria:</b> {money(p.cobertura.renta_diaria)}
            </div>
            <div className="dato">
              <b>Franquicia:</b> {p.cobertura.franquicia_dias} día(s) ·{" "}
              <b>Carencia:</b> {p.cobertura.carencia_dias} días
            </div>
            <div className="dato">
              <b>Tope anual:</b> {p.cobertura.tope_dias_anio} días (
              {p.dias_usados_anio} usados)
            </div>
            <div className="dato">
              <b>Suma asegurada:</b> {money(p.cobertura.suma_asegurada)}
            </div>
            <div className="dato">
              <b>Estado de pago:</b>{" "}
              {p.estado_pago === "al_dia" ? "Al día" : "En mora"}
            </div>
          </div>
        </div>

        {!res && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <button className="btn btn-primary" onClick={analizar} disabled={busy}>
              {busy ? "Analizando…" : "▶ Ejecutar análisis del analista virtual"}
            </button>
          </div>
        )}

        {res && (
          <>
            {/* Agente 1 */}
            <div className="agente">
              <div className="agente-head">
                <div className="agente-num">{AGENTES[0].n}</div>
                <strong>{AGENTES[0].titulo}</strong>
                <span className="svc">{AGENTES[0].servicio}</span>
              </div>
              {res.extraccion.hallazgos.map((h) => (
                <div className="hallazgo" key={h.campo}>
                  <span className="muted">{h.campo}</span>
                  <span>{h.valor}</span>
                  <span
                    className="conf"
                    style={{
                      color: h.confianza >= 80 ? "var(--teal)" : "var(--amber)",
                    }}
                  >
                    {h.confianza}%
                  </span>
                </div>
              ))}
              <div className="muted" style={{ marginTop: 8 }}>
                Confianza de extracción: <b>{res.extraccion.confianza}%</b>
              </div>
            </div>

            {/* Agente 2 */}
            <div className="agente">
              <div className="agente-head">
                <div className="agente-num">{AGENTES[1].n}</div>
                <strong>{AGENTES[1].titulo}</strong>
                <span className="svc">{AGENTES[1].servicio}</span>
              </div>
              {res.validacion.checks.map((c) => (
                <div className="check" key={c.nombre}>
                  <div
                    className="check-icon"
                    style={{ background: CHECK_COLOR[c.estado] }}
                  >
                    {CHECK_ICON[c.estado]}
                  </div>
                  <div>
                    <div>
                      <b>{c.nombre}:</b> {c.detalle}
                    </div>
                    <div className="cita">{c.cita}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <div className="muted">Casos similares recuperados:</div>
                <ul className="casos">
                  {res.validacion.casos_similares.map((cs) => (
                    <li key={cs.id}>
                      <b>{cs.id}</b> ({DECISION_LABEL[cs.decision]}): {cs.resumen}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Agente 3 */}
            <div className="agente">
              <div className="agente-head">
                <div className="agente-num">{AGENTES[2].n}</div>
                <strong>{AGENTES[2].titulo}</strong>
                <span className="svc">{AGENTES[2].servicio}</span>
              </div>
              <div
                className="decision-box"
                style={{ background: DECISION_COLOR[res.decision.decision] }}
              >
                <h3>{DECISION_LABEL[res.decision.decision]}</h3>
                {res.decision.decision === "preaprobado" && (
                  <div className="monto">{money(res.decision.monto_estimado)}</div>
                )}
                <div style={{ marginTop: 6 }}>{res.decision.causal}</div>
                {res.decision.documentos_faltantes.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {res.decision.documentos_faltantes.map((d) => (
                      <span className="doc-faltante" key={d}>
                        {d}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
                  Sustento: {res.decision.citas.join(" · ")}
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                Confianza global del análisis: <b>{res.confianza_global}%</b>
                {res.decision.requiere_revision_humana && (
                  <div className="revision-flag">
                    ⚠ Confianza baja — requiere revisión humana obligatoria
                  </div>
                )}
              </div>
            </div>

            {/* Decisión humana */}
            {r.decision_humana ? (
              <div className="resuelto">
                Decisión registrada por {r.decision_humana.analista}:{" "}
                {DECISION_LABEL[r.decision_humana.decision]}
                {r.decision_humana.coincide_con_ia
                  ? " (coincide con la recomendación IA)"
                  : " (ajuste sobre la recomendación IA)"}
                {r.decision_humana.comentario && (
                  <div className="muted" style={{ marginTop: 4 }}>
                    “{r.decision_humana.comentario}”
                  </div>
                )}
              </div>
            ) : (
              <div className="humana">
                <strong>Decisión del analista</strong>
                <div className="muted">
                  Confirmá la recomendación o ajustá la decisión final.
                </div>
                <textarea
                  rows={2}
                  placeholder="Comentario (opcional)…"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />
                <div className="humana-actions">
                  <button
                    className="btn btn-teal"
                    disabled={busy}
                    onClick={() => decidir("preaprobado")}
                  >
                    Preaprobar
                  </button>
                  <button
                    className="btn btn-red"
                    disabled={busy}
                    onClick={() => decidir("preobjetado")}
                  >
                    Preobjetar
                  </button>
                  <button
                    className="btn btn-amber"
                    disabled={busy}
                    onClick={() => decidir("solicitud_documentos")}
                  >
                    Solicitar documentos
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
