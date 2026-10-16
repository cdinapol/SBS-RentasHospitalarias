"""Parámetros del motor de reglas del prototipo (simulan políticas de indemnización)."""

from datetime import date

# Fecha de referencia del prototipo (todos los cálculos de SLA/vigencia parten de aquí).
HOY = date(2026, 10, 16)

# Umbral de confianza (0-100) por debajo del cual la decisión exige revisión humana.
UMBRAL_CONFIANZA = 70

# SLA objetivo en días hábiles para resolver una reclamación de renta hospitalaria.
SLA_DIAS = 8

# Días desde la recepción a partir de los cuales el expediente se marca "SLA en riesgo".
SLA_RIESGO_DIAS = 6

# Documentos obligatorios para liquidar una reclamación de renta hospitalaria.
DOCUMENTOS_REQUERIDOS = [
    "formulario_reclamacion",
    "historia_clinica",
    "certificado_hospitalario",
    "documento_identidad",
]

ETIQUETAS_DOCUMENTO = {
    "formulario_reclamacion": "Formulario de reclamación",
    "historia_clinica": "Historia clínica / epicrisis",
    "certificado_hospitalario": "Certificado hospitalario",
    "documento_identidad": "Documento de identidad",
    "incapacidad": "Certificado de incapacidad",
    "factura": "Factura de la institución",
}
