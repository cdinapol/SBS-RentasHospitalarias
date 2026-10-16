import type {
  DetalleReclamacion,
  Decision,
  KPIs,
  Reclamacion,
} from "./types";

const BASE = "/api";

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

export interface Filtros {
  estado?: string;
  decision?: string;
  analista?: string;
  q?: string;
}

export const api = {
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
