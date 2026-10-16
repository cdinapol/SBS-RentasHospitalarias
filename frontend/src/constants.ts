import type { Decision, EstadoCheck } from "./types";

export const DECISION_LABEL: Record<Decision, string> = {
  preaprobado: "Preaprobado",
  preobjetado: "Preobjetado",
  solicitud_documentos: "Solicitud de documentos",
  sin_analizar: "Sin analizar",
};

export const DECISION_COLOR: Record<Decision, string> = {
  preaprobado: "#1f9d77",
  preobjetado: "#c0392b",
  solicitud_documentos: "#c08a1e",
  sin_analizar: "#6b6b6b",
};

export const CHECK_COLOR: Record<EstadoCheck, string> = {
  ok: "#1f9d77",
  alerta: "#c08a1e",
  falla: "#c0392b",
};

export const CHECK_ICON: Record<EstadoCheck, string> = {
  ok: "✓",
  alerta: "!",
  falla: "✕",
};

export const DOCUMENTO_LABEL: Record<string, string> = {
  formulario_reclamacion: "Formulario de reclamación",
  historia_clinica: "Historia clínica / epicrisis",
  certificado_hospitalario: "Certificado hospitalario",
  documento_identidad: "Documento de identidad",
};

export const AGENTES = [
  { n: 1, titulo: "Extracción de información", servicio: "Azure Document Intelligence" },
  { n: 2, titulo: "Análisis y validación", servicio: "Azure AI Search (RAG) + GPT-4o" },
  { n: 3, titulo: "Motor de decisiones", servicio: "Foundry Agent Service" },
];

export function money(n: number): string {
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}
