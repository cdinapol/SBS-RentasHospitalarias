import type { Documento, Poliza, Reclamacion } from "../types";

export const HOY = new Date(2026, 9, 16);
export const UMBRAL_CONFIANZA = 70;
export const SLA_RIESGO_DIAS = 6;

export const DOCUMENTOS_REQUERIDOS = [
  "formulario_reclamacion",
  "historia_clinica",
  "certificado_hospitalario",
  "documento_identidad",
];

export const ETIQUETAS_DOCUMENTO: Record<string, string> = {
  formulario_reclamacion: "Formulario de reclamación",
  historia_clinica: "Historia clínica / epicrisis",
  certificado_hospitalario: "Certificado hospitalario",
  documento_identidad: "Documento de identidad",
};

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ANALISTAS = ["María Restrepo", "Julián Gómez", "Carolina Ríos", "Andrés Peña"];
const PRESTADORES = [
  "Clínica del Country",
  "Fundación Santa Fe",
  "Hospital San Vicente",
  "Clínica Las Américas",
  "Clínica Reina Sofía",
];

function poliza(
  id: string,
  tomador: string,
  renta: number,
  franquicia: number,
  tope: number,
  suma: number,
  carencia: number,
  desde: string,
  hasta: string,
  estado_pago: "al_dia" | "en_mora",
  exclusiones: string[],
  dias_usados = 0
): Poliza {
  return {
    id,
    tomador,
    producto: "Renta Diaria por Hospitalización",
    cobertura: {
      renta_diaria: renta,
      franquicia_dias: franquicia,
      tope_dias_anio: tope,
      suma_asegurada: suma,
      carencia_dias: carencia,
    },
    vigencia_desde: desde,
    vigencia_hasta: hasta,
    estado_pago,
    exclusiones,
    dias_usados_anio: dias_usados,
  };
}

export const POLIZAS: Poliza[] = [
  poliza("POL-1001", "Grupo Empresarial Andino", 180000, 1, 180, 20_000_000, 30,
    "2026-01-01", "2026-12-31", "al_dia",
    ["preexistencias no declaradas", "lesiones autoinfligidas"]),
  poliza("POL-1002", "Cooperativa Nacional", 120000, 2, 120, 12_000_000, 60,
    "2026-03-01", "2027-02-28", "al_dia",
    ["preexistencias no declaradas", "cirugía estética", "embarazo sin complicación"]),
  poliza("POL-1003", "Textiles del Caribe", 150000, 1, 150, 15_000_000, 30,
    "2025-11-01", "2026-10-31", "al_dia",
    ["lesiones autoinfligidas", "práctica de deportes extremos"]),
  poliza("POL-1004", "Transportes del Sur", 90000, 2, 90, 8_000_000, 90,
    "2026-09-01", "2027-08-31", "al_dia",
    ["preexistencias no declaradas"]),
  poliza("POL-1005", "Alimentos Frescos SA", 200000, 1, 200, 25_000_000, 30,
    "2026-02-01", "2027-01-31", "en_mora",
    ["lesiones autoinfligidas"]),
  poliza("POL-1006", "Constructora Litoral", 160000, 1, 160, 18_000_000, 30,
    "2026-01-15", "2026-12-31", "al_dia",
    ["preexistencias no declaradas", "lesiones autoinfligidas"], 175),
];

// [cie10, descripción, causa]
const DIAGNOSTICOS: [string, string, "enfermedad" | "accidente"][] = [
  ["J18.9", "Neumonía, no especificada", "enfermedad"],
  ["K35.80", "Apendicitis aguda", "enfermedad"],
  ["S72.0", "Fractura de cuello de fémur", "accidente"],
  ["A09", "Gastroenteritis infecciosa", "enfermedad"],
  ["I21.9", "Infarto agudo de miocardio", "enfermedad"],
  ["O80", "Parto único espontáneo", "enfermedad"],
  ["T14.9", "Traumatismo múltiple por accidente", "accidente"],
  ["N20.0", "Cálculo renal", "enfermedad"],
  ["X60", "Lesión autoinfligida intencional", "accidente"],
  ["Z41.1", "Cirugía estética", "enfermedad"],
  ["E11.9", "Diabetes mellitus tipo 2 (preexistente)", "enfermedad"],
  ["S82.6", "Fractura de tobillo en deporte extremo", "accidente"],
];

function docs(presentes: string[], ilegibles: string[] = []): Documento[] {
  return DOCUMENTOS_REQUERIDOS.map((tipo) => ({
    tipo,
    presente: presentes.includes(tipo),
    legible: !ilegibles.includes(tipo),
  }));
}

const R = DOCUMENTOS_REQUERIDOS;
// [poliza, dias_atras, internado, idx_dx, presentes, ilegibles, complejidad]
const SPECS: [string, number, number, number, string[], string[], "baja" | "media" | "alta"][] = [
  ["POL-1001", 3, 6, 0, R, [], "baja"],
  ["POL-1001", 5, 12, 4, R, [], "alta"],
  ["POL-1001", 9, 4, 1, ["formulario_reclamacion", "historia_clinica"], [], "media"],
  ["POL-1002", 2, 8, 3, R, [], "baja"],
  ["POL-1002", 7, 3, 5, R, [], "media"],
  ["POL-1002", 12, 15, 10, R, [], "alta"],
  ["POL-1003", 4, 7, 2, R, [], "media"],
  ["POL-1003", 6, 2, 7, R, [], "baja"],
  ["POL-1003", 1, 9, 11, R, [], "alta"],
  ["POL-1004", 2, 5, 0, R, [], "media"],
  ["POL-1004", 8, 10, 6, ["formulario_reclamacion", "historia_clinica", "documento_identidad"], [], "alta"],
  ["POL-1005", 3, 6, 1, R, [], "media"],
  ["POL-1006", 2, 8, 2, R, [], "alta"],
  ["POL-1001", 10, 3, 3, R, ["historia_clinica"], "media"],
  ["POL-1002", 4, 20, 4, R, [], "alta"],
  ["POL-1003", 5, 1, 7, R, [], "baja"],
  ["POL-1004", 6, 7, 8, R, [], "alta"],
  ["POL-1001", 7, 5, 2, R, [], "baja"],
  ["POL-1002", 3, 4, 1, ["formulario_reclamacion"], [], "media"],
  ["POL-1003", 9, 11, 0, R, [], "alta"],
  ["POL-1004", 11, 6, 3, R, [], "media"],
  ["POL-1001", 2, 14, 4, R, [], "alta"],
  ["POL-1002", 5, 2, 7, R, [], "baja"],
  ["POL-1003", 6, 8, 2, R, [], "media"],
  ["POL-1005", 4, 9, 0, R, [], "alta"],
  ["POL-1001", 8, 3, 1, R, [], "baja"],
  ["POL-1002", 1, 7, 9, R, [], "alta"],
  ["POL-1003", 3, 5, 3, ["formulario_reclamacion", "historia_clinica", "certificado_hospitalario"], [], "media"],
  ["POL-1004", 7, 4, 7, R, [], "baja"],
  ["POL-1006", 5, 6, 1, R, [], "alta"],
  ["POL-1001", 4, 10, 2, R, [], "media"],
  ["POL-1002", 6, 3, 0, R, [], "baja"],
  ["POL-1003", 2, 8, 11, R, [], "alta"],
  ["POL-1004", 9, 5, 4, R, [], "media"],
  ["POL-1001", 5, 7, 3, R, [], "baja"],
];

const NOMBRES = [
  "Luis Herrera", "Ana Martínez", "Jorge Salcedo", "Diana Castro", "Pedro Nieto",
  "Laura Vargas", "Camilo Ruiz", "Sofía León", "Miguel Ángel Díaz", "Paula Jiménez",
  "Ricardo Mora", "Valentina Osorio", "Fernando Cano", "Gabriela Suárez", "Tomás Beltrán",
  "Natalia Pardo", "Esteban Rojas", "Daniela Acosta", "Mauricio Vélez", "Carmen Lozano",
  "Felipe Navarro", "Isabela Mejía", "Óscar Guzmán", "Lucía Franco", "Sebastián Cárdenas",
  "Marta Quintero", "Álvaro Benítez", "Patricia Rincón", "Hernán Correa", "Juliana Pineda",
  "Rodrigo Álvarez", "Verónica Soto", "Iván Montoya", "Catalina Duque", "Nicolás Bravo",
];

export function construirReclamaciones(): Reclamacion[] {
  return SPECS.map((spec, i) => {
    const [pid, diasAtras, internado, idxDx, presentes, ilegibles, complejidad] = spec;
    const [cod, desc, causa] = DIAGNOSTICOS[idxDx];
    const fechaIngreso = addDays(HOY, -(diasAtras + internado));
    const fechaEgreso = addDays(fechaIngreso, internado);
    const fechaRecepcion = addDays(fechaEgreso, 2);
    return {
      id: `RH-${2601 + i}`,
      asegurado: NOMBRES[i % NOMBRES.length],
      documento_asegurado: String(1000000000 + i * 777889),
      poliza_id: pid,
      analista: ANALISTAS[i % ANALISTAS.length],
      fecha_recepcion: iso(fechaRecepcion),
      fecha_ingreso: iso(fechaIngreso),
      fecha_egreso: iso(fechaEgreso),
      diagnostico_cie10: cod,
      diagnostico: desc,
      causa,
      prestador: PRESTADORES[i % PRESTADORES.length],
      documentos: docs(presentes, ilegibles),
      complejidad,
      estado: "nuevo",
      decision: "sin_analizar",
      resultado: null,
      decision_humana: null,
    };
  });
}
