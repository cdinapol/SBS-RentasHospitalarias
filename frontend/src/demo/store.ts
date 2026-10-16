import type { Decision, DetalleReclamacion, KPIs, Reclamacion } from "../types";
import type { Filtros } from "../api";
import { ejecutarPipeline } from "./engine";
import {
  HOY,
  POLIZAS,
  SLA_RIESGO_DIAS,
  construirReclamaciones,
} from "./seed";

const TIEMPO_ANALISIS: Record<string, number> = { baja: 12, media: 20, alta: 35 };

let polizas = new Map(POLIZAS.map((p) => [p.id, p]));
let reclamaciones = new Map<string, Reclamacion>(
  construirReclamaciones().map((r) => [r.id, r])
);

function resetData() {
  polizas = new Map(POLIZAS.map((p) => [p.id, p]));
  reclamaciones = new Map(construirReclamaciones().map((r) => [r.id, r]));
}

function listar(f: Filtros = {}): Reclamacion[] {
  let items = [...reclamaciones.values()];
  if (f.estado) items = items.filter((r) => r.estado === f.estado);
  if (f.decision) items = items.filter((r) => r.decision === f.decision);
  if (f.analista) items = items.filter((r) => r.analista === f.analista);
  if (f.q) {
    const q = f.q.toLowerCase();
    items = items.filter(
      (r) =>
        r.asegurado.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.diagnostico.toLowerCase().includes(q) ||
        r.poliza_id.toLowerCase().includes(q)
    );
  }
  return items.sort((a, b) => a.fecha_recepcion.localeCompare(b.fecha_recepcion));
}

function detalle(id: string): DetalleReclamacion {
  const reclamacion = reclamaciones.get(id)!;
  return { reclamacion, poliza: polizas.get(reclamacion.poliza_id)! };
}

function analizar(id: string): Reclamacion {
  const r = reclamaciones.get(id)!;
  const resultado = ejecutarPipeline(r, polizas.get(r.poliza_id)!);
  r.resultado = resultado;
  r.decision = resultado.decision.decision;
  r.estado = "analizado";
  return r;
}

function decidir(id: string, decision: Decision, comentario: string): Reclamacion {
  const r = reclamaciones.get(id)!;
  r.decision_humana = {
    decision,
    comentario,
    analista: r.analista,
    coincide_con_ia: !!r.resultado && decision === r.resultado.decision.decision,
  };
  r.decision = decision;
  r.estado = "decidido";
  return r;
}

function slaEnRiesgo(r: Reclamacion): boolean {
  if (r.estado === "decidido") return false;
  const dias = Math.round((HOY.getTime() - new Date(r.fecha_recepcion).getTime()) / 86400000);
  return dias >= SLA_RIESGO_DIAS;
}

function kpis(): KPIs {
  const items = [...reclamaciones.values()];
  const analizados = items.filter((r) => r.estado === "analizado" || r.estado === "decidido");
  const porComplejidad: Record<string, number> = { baja: 0, media: 0, alta: 0 };
  items.forEach((r) => (porComplejidad[r.complejidad] += 1));
  const monto = analizados
    .filter((r) => r.resultado && r.decision === "preaprobado")
    .reduce((s, r) => s + r.resultado!.decision.monto_estimado, 0);
  const tiempos = analizados.map((r) => TIEMPO_ANALISIS[r.complejidad]);
  const tiempoMedio = tiempos.length
    ? Math.round((tiempos.reduce((s, t) => s + t, 0) / tiempos.length) * 10) / 10
    : 0;
  return {
    total: items.length,
    nuevos: items.filter((r) => r.estado === "nuevo").length,
    analizados: items.filter((r) => r.estado === "analizado").length,
    decididos: items.filter((r) => r.estado === "decidido").length,
    preaprobados: items.filter((r) => r.decision === "preaprobado").length,
    preobjetados: items.filter((r) => r.decision === "preobjetado").length,
    solicitud_documentos: items.filter((r) => r.decision === "solicitud_documentos").length,
    requieren_revision: analizados.filter(
      (r) => r.resultado && r.resultado.decision.requiere_revision_humana
    ).length,
    sla_en_riesgo: items.filter((r) => slaEnRiesgo(r)).length,
    monto_preaprobado: monto,
    tiempo_medio_analisis_min: tiempoMedio,
    por_complejidad: porComplejidad,
  };
}

export const demoStore = {
  kpis: () => Promise.resolve(kpis()),
  listar: (f: Filtros = {}) => Promise.resolve(listar(f)),
  detalle: (id: string) => Promise.resolve(detalle(id)),
  analizar: (id: string) => Promise.resolve(analizar(id)),
  decidir: (id: string, decision: Decision, comentario: string) =>
    Promise.resolve(decidir(id, decision, comentario)),
  reset: () => {
    resetData();
    return Promise.resolve({ total: reclamaciones.size });
  },
};
