import type {
  DetalleReclamacion,
  Decision,
  KPIs,
  Reclamacion,
} from "./types";
import { demoStore } from "./demo/store";

const BASE = "/api";

export interface Filtros {
  estado?: string;
  decision?: string;
  analista?: string;
  q?: string;
}

// Modo demo (sin backend): activo en GitHub Pages o con ?demo=1. En localhost usa el backend.
const params = new URLSearchParams(location.search);
const isLocalhost = ["localhost", "127.0.0.1"].includes(location.hostname);
export const DEMO = params.has("demo") || (!isLocalhost && !params.has("live"));
export const MODE_LABEL = DEMO ? "Demo in-browser" : "Local (API)";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

const liveApi = {
  kpis: () => get<KPIs>("/kpis"),
  listar: (f: Filtros = {}) => {
    const qs = new URLSearchParams(
      Object.entries(f).filter(([, v]) => v) as [string, string][]
    ).toString();
    return get<Reclamacion[]>(`/reclamaciones${qs ? `?${qs}` : ""}`);
  },
  detalle: (id: string) => get<DetalleReclamacion>(`/reclamaciones/${id}`),
  analizar: (id: string) => post<Reclamacion>(`/reclamaciones/${id}/analizar`),
  decidir: (id: string, decision: Decision, comentario: string) =>
    post<Reclamacion>(`/reclamaciones/${id}/decision`, { decision, comentario }),
  reset: () => post<{ total: number }>("/reset"),
};

export const api = DEMO ? demoStore : liveApi;
