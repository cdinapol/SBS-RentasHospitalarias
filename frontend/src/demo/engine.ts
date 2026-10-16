import type {
  CasoSimilar,
  CheckValidacion,
  Poliza,
  Reclamacion,
  ResultadoDecision,
  ResultadoPipeline,
  ResultadoValidacion,
} from "../types";
import { DOCUMENTOS_REQUERIDOS, ETIQUETAS_DOCUMENTO, UMBRAL_CONFIANZA } from "./seed";

const NORMATIVA = [
  "Circular 007 SFC — Trámite y pago de siniestros de personas.",
  "Condiciones Generales Renta Diaria Hospitalaria, cláusula 4 (coberturas).",
  "Condiciones Particulares de la póliza (sumas, franquicia y carencia).",
];

const CHECKS_OBJETABLES = new Set([
  "Vigencia de la póliza",
  "Estado de pago de la póliza",
  "Período de carencia",
  "Diagnóstico cubierto",
  "Consistencia de fechas",
]);

function dias(r: Reclamacion): number {
  return Math.round(
    (new Date(r.fecha_egreso).getTime() - new Date(r.fecha_ingreso).getTime()) / 86400000
  );
}

function diasDesde(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}

function docsPresentes(r: Reclamacion): Set<string> {
  return new Set(r.documentos.filter((d) => d.presente && d.legible).map((d) => d.tipo));
}

function faltantes(r: Reclamacion): string[] {
  const p = docsPresentes(r);
  return DOCUMENTOS_REQUERIDOS.filter((t) => !p.has(t));
}

// Agente 1 — Extracción
function extraer(r: Reclamacion, poliza: Poliza) {
  const presentes = new Set(r.documentos.filter((d) => d.presente).map((d) => d.tipo));
  const ilegibles = new Set(
    r.documentos.filter((d) => d.presente && !d.legible).map((d) => d.tipo)
  );
  const clinica = presentes.has("historia_clinica") && !ilegibles.has("historia_clinica");
  const cert = presentes.has("certificado_hospitalario");

  const hallazgos = [
    { campo: "Asegurado", valor: r.asegurado, confianza: presentes.has("documento_identidad") ? 98 : 70, fuente: ETIQUETAS_DOCUMENTO["documento_identidad"] },
    { campo: "Diagnóstico (CIE-10)", valor: `${r.diagnostico_cie10} — ${r.diagnostico}`, confianza: clinica ? 95 : 55, fuente: ETIQUETAS_DOCUMENTO["historia_clinica"] },
    { campo: "Fecha de ingreso", valor: r.fecha_ingreso, confianza: cert ? 96 : 60, fuente: ETIQUETAS_DOCUMENTO["certificado_hospitalario"] },
    { campo: "Fecha de egreso", valor: r.fecha_egreso, confianza: cert ? 96 : 60, fuente: ETIQUETAS_DOCUMENTO["certificado_hospitalario"] },
    { campo: "Días de hospitalización", valor: String(dias(r)), confianza: cert ? 94 : 58, fuente: ETIQUETAS_DOCUMENTO["certificado_hospitalario"] },
    { campo: "Prestador", valor: r.prestador, confianza: cert ? 90 : 65, fuente: ETIQUETAS_DOCUMENTO["certificado_hospitalario"] },
    { campo: "Póliza referenciada", valor: `${poliza.id} — ${poliza.producto}`, confianza: presentes.has("formulario_reclamacion") ? 97 : 72, fuente: ETIQUETAS_DOCUMENTO["formulario_reclamacion"] },
  ];
  const confianza = Math.round(
    hallazgos.reduce((s, h) => s + h.confianza, 0) / hallazgos.length
  );
  return { hallazgos, confianza };
}

function exclusionAplicable(r: Reclamacion, poliza: Poliza): string | null {
  const diag = r.diagnostico.toLowerCase();
  for (const e of poliza.exclusiones) {
    const el = e.toLowerCase();
    if (diag.includes(el) || el.includes(diag)) return e;
  }
  for (const e of poliza.exclusiones) {
    const clave = e.split(/\s+/)[0].toLowerCase();
    if (diag.includes(clave)) return e;
  }
  return null;
}

function casosSimilares(r: Reclamacion, excluido: boolean, faltanDocs: boolean): CasoSimilar[] {
  if (faltanDocs)
    return [{ id: "RH-2487", diagnostico: r.diagnostico, decision: "solicitud_documentos", resumen: "Caso análogo resuelto solicitando historia clínica faltante antes de liquidar." }];
  if (excluido)
    return [{ id: "RH-2390", diagnostico: r.diagnostico, decision: "preobjetado", resumen: "Diagnóstico excluido en condiciones generales; objetado con sustento." }];
  return [
    { id: "RH-2355", diagnostico: r.diagnostico, decision: "preaprobado", resumen: "Hospitalización por causa cubierta liquidada a renta diaria pactada." },
    { id: "RH-2298", diagnostico: r.diagnostico, decision: "preaprobado", resumen: "Caso similar con documentación completa; preaprobado sin observaciones." },
  ];
}

// Agente 2 — Análisis y validación
function validar(r: Reclamacion, poliza: Poliza): ResultadoValidacion {
  const cob = poliza.cobertura;
  const checks: CheckValidacion[] = [];
  const falt = faltantes(r);

  checks.push({
    nombre: "Documentación completa",
    estado: falt.length === 0 ? "ok" : "falla",
    detalle: falt.length === 0
      ? "Todos los soportes requeridos están presentes y legibles."
      : "Faltan o son ilegibles: " + falt.map((t) => ETIQUETAS_DOCUMENTO[t] ?? t).join(", "),
    cita: "Condiciones Generales, cláusula 7 (documentos para el pago).",
  });

  const vigente = poliza.vigencia_desde <= r.fecha_ingreso && r.fecha_ingreso <= poliza.vigencia_hasta;
  checks.push({
    nombre: "Vigencia de la póliza",
    estado: vigente ? "ok" : "falla",
    detalle: vigente
      ? `Siniestro dentro de vigencia (${poliza.vigencia_desde} a ${poliza.vigencia_hasta}).`
      : "La fecha de ingreso está fuera del período de vigencia.",
    cita: "Condiciones Particulares (período de vigencia).",
  });

  const alDia = poliza.estado_pago === "al_dia";
  checks.push({
    nombre: "Estado de pago de la póliza",
    estado: alDia ? "ok" : "falla",
    detalle: alDia ? "Póliza al día." : "La póliza se encuentra en mora.",
    cita: "Art. 1068 C. de Comercio (mora en el pago de la prima).",
  });

  const dde = diasDesde(r.fecha_ingreso, poliza.vigencia_desde);
  const carenciaOk = dde >= cob.carencia_dias;
  checks.push({
    nombre: "Período de carencia",
    estado: carenciaOk ? "ok" : "falla",
    detalle: carenciaOk
      ? `Carencia de ${cob.carencia_dias} días cumplida (${dde} días desde emisión).`
      : `No se cumple la carencia de ${cob.carencia_dias} días (${dde} días desde emisión).`,
    cita: "Condiciones Particulares (período de carencia).",
  });

  const excluido = exclusionAplicable(r, poliza);
  checks.push({
    nombre: "Diagnóstico cubierto",
    estado: !excluido ? "ok" : "falla",
    detalle: !excluido
      ? "El diagnóstico no corresponde a una exclusión de la póliza."
      : `El diagnóstico coincide con la exclusión: «${excluido}».`,
    cita: "Condiciones Generales, cláusula 5 (exclusiones).",
  });

  const d = dias(r);
  const fechasOk = r.fecha_ingreso <= r.fecha_egreso && d >= 1;
  checks.push({
    nombre: "Consistencia de fechas",
    estado: fechasOk ? "ok" : "falla",
    detalle: fechasOk ? `${d} día(s) de hospitalización; fechas coherentes.` : "Las fechas de ingreso/egreso son inconsistentes.",
    cita: "Validación interna de datos del siniestro.",
  });

  const diasIndem = Math.max(0, d - cob.franquicia_dias);
  checks.push({
    nombre: "Días indemnizables (franquicia)",
    estado: diasIndem > 0 ? "ok" : "alerta",
    detalle: diasIndem > 0
      ? `${diasIndem} día(s) indemnizable(s) tras franquicia de ${cob.franquicia_dias}.`
      : `No hay días indemnizables: la internación (${d}) no supera la franquicia de ${cob.franquicia_dias} día(s).`,
    cita: "Condiciones Particulares (franquicia en días).",
  });

  const disponibles = cob.tope_dias_anio - poliza.dias_usados_anio;
  checks.push({
    nombre: "Tope anual de días",
    estado: disponibles >= 1 ? "ok" : "alerta",
    detalle: `${poliza.dias_usados_anio}/${cob.tope_dias_anio} días usados en el año; ${Math.max(0, disponibles)} disponibles.`,
    cita: "Condiciones Particulares (tope anual de días).",
  });

  const fallas = checks.filter((c) => c.estado === "falla").length;
  const alertas = checks.filter((c) => c.estado === "alerta").length;
  const confianza = Math.max(40, 100 - fallas * 18 - alertas * 6);
  return {
    checks,
    casos_similares: casosSimilares(r, excluido !== null, falt.length > 0),
    normativa: NORMATIVA,
    confianza,
  };
}

// Agente 3 — Motor de decisiones
function decidir(
  r: Reclamacion,
  poliza: Poliza,
  extConf: number,
  validacion: ResultadoValidacion
): ResultadoDecision {
  const cob = poliza.cobertura;
  const checkDocs = validacion.checks.find((c) => c.nombre === "Documentación completa")!;
  const fallasDuras = validacion.checks.filter(
    (c) => c.estado === "falla" && CHECKS_OBJETABLES.has(c.nombre)
  );
  const falt = faltantes(r);
  const d = dias(r);
  const diasIndem = Math.max(0, d - cob.franquicia_dias);
  const disponibles = Math.max(0, cob.tope_dias_anio - poliza.dias_usados_anio);
  const diasPagar = Math.min(diasIndem, disponibles);
  const monto = Math.min(diasPagar * cob.renta_diaria, cob.suma_asegurada);
  const confianza = Math.round(0.4 * extConf + 0.6 * validacion.confianza);

  if (checkDocs.estado === "falla") {
    return {
      decision: "solicitud_documentos",
      causal: "Documentación incompleta para liquidar la reclamación.",
      citas: [checkDocs.cita],
      dias_indemnizables: diasIndem,
      monto_estimado: 0,
      confianza,
      requiere_revision_humana: confianza < UMBRAL_CONFIANZA,
      documentos_faltantes: falt.map((t) => ETIQUETAS_DOCUMENTO[t] ?? t),
    };
  }

  if (fallasDuras.length > 0) {
    return {
      decision: "preobjetado",
      causal: fallasDuras.map((c) => c.detalle).join("; "),
      citas: fallasDuras.map((c) => c.cita),
      dias_indemnizables: diasIndem,
      monto_estimado: 0,
      confianza,
      requiere_revision_humana: confianza < UMBRAL_CONFIANZA,
      documentos_faltantes: [],
    };
  }

  const citas = ["Condiciones Particulares (renta diaria y franquicia)."];
  if (diasPagar < diasIndem) citas.push("Condiciones Particulares (tope anual de días alcanzado).");
  const fmt = (n: number) => n.toLocaleString("es-CO");
  const causal = `${diasPagar} día(s) a renta diaria de $${fmt(cob.renta_diaria)} = $${fmt(monto)} (franquicia ${cob.franquicia_dias}, tope suma asegurada $${fmt(cob.suma_asegurada)}).`;
  return {
    decision: "preaprobado",
    causal,
    citas,
    dias_indemnizables: diasIndem,
    monto_estimado: monto,
    confianza,
    requiere_revision_humana: confianza < UMBRAL_CONFIANZA,
    documentos_faltantes: [],
  };
}

export function ejecutarPipeline(r: Reclamacion, poliza: Poliza): ResultadoPipeline {
  const extraccion = extraer(r, poliza);
  const validacion = validar(r, poliza);
  const decision = decidir(r, poliza, extraccion.confianza, validacion);
  const confianza_global = Math.round(
    0.3 * extraccion.confianza + 0.3 * validacion.confianza + 0.4 * decision.confianza
  );
  return { extraccion, validacion, decision, confianza_global };
}
