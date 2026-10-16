export type Decision =
  | "preaprobado"
  | "preobjetado"
  | "solicitud_documentos"
  | "sin_analizar";

export type EstadoReclamacion = "nuevo" | "analizado" | "decidido";
export type EstadoCheck = "ok" | "alerta" | "falla";
export type Complejidad = "baja" | "media" | "alta";

export interface Documento {
  tipo: string;
  presente: boolean;
  legible: boolean;
}

export interface HallazgoExtraccion {
  campo: string;
  valor: string;
  confianza: number;
  fuente: string;
}

export interface CheckValidacion {
  nombre: string;
  estado: EstadoCheck;
  detalle: string;
  cita: string;
}

export interface CasoSimilar {
  id: string;
  diagnostico: string;
  decision: Decision;
  resumen: string;
}

export interface ResultadoDecision {
  decision: Decision;
  causal: string;
  citas: string[];
  dias_indemnizables: number;
  monto_estimado: number;
  confianza: number;
  requiere_revision_humana: boolean;
  documentos_faltantes: string[];
}

export interface ResultadoExtraccion {
  hallazgos: HallazgoExtraccion[];
  confianza: number;
}

export interface ResultadoValidacion {
  checks: CheckValidacion[];
  casos_similares: CasoSimilar[];
  normativa: string[];
  confianza: number;
}

export interface ResultadoPipeline {
  extraccion: ResultadoExtraccion;
  validacion: ResultadoValidacion;
  decision: ResultadoDecision;
  confianza_global: number;
}

export interface DecisionHumana {
  decision: Decision;
  comentario: string;
  analista: string;
  coincide_con_ia: boolean;
}

export interface Reclamacion {
  id: string;
  asegurado: string;
  documento_asegurado: string;
  poliza_id: string;
  analista: string;
  fecha_recepcion: string;
  fecha_ingreso: string;
  fecha_egreso: string;
  diagnostico_cie10: string;
  diagnostico: string;
  causa: "enfermedad" | "accidente";
  prestador: string;
  documentos: Documento[];
  complejidad: Complejidad;
  estado: EstadoReclamacion;
  decision: Decision;
  resultado: ResultadoPipeline | null;
  decision_humana: DecisionHumana | null;
}

export interface Cobertura {
  renta_diaria: number;
  franquicia_dias: number;
  tope_dias_anio: number;
  suma_asegurada: number;
  carencia_dias: number;
}

export interface Poliza {
  id: string;
  tomador: string;
  producto: string;
  cobertura: Cobertura;
  vigencia_desde: string;
  vigencia_hasta: string;
  estado_pago: "al_dia" | "en_mora";
  exclusiones: string[];
  dias_usados_anio: number;
}

export interface KPIs {
  total: number;
  nuevos: number;
  analizados: number;
  decididos: number;
  preaprobados: number;
  preobjetados: number;
  solicitud_documentos: number;
  requieren_revision: number;
  sla_en_riesgo: number;
  monto_preaprobado: number;
  tiempo_medio_analisis_min: number;
  por_complejidad: Record<string, number>;
}

export interface DetalleReclamacion {
  reclamacion: Reclamacion;
  poliza: Poliza;
}
