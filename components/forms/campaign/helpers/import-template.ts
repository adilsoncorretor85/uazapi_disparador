import * as XLSX from "xlsx"

const TEMPLATE_HEADERS = [
  "nome",
  "telefone",
  "email",
  "data_nascimento",
  "genero",
  "tags",
  "bairro",
  "cep",
  "rua",
  "cidade",
  "estado",
  "numero_residencia",
  "complemento",
  "ponto_referencia"
]

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
}

const TEMPLATE_HEADERS_NORMALIZED = TEMPLATE_HEADERS.map(normalizeHeader)

function validateTemplateHeaders(headerRow: unknown[]) {
  const normalized = headerRow
    .map((value) => normalizeHeader(String(value ?? "")))
    .filter(Boolean)
  if (normalized.length !== TEMPLATE_HEADERS_NORMALIZED.length) return false
  return normalized.every((value, index) => value === TEMPLATE_HEADERS_NORMALIZED[index])
}

function normalizeRowKeys(row: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {}
  Object.entries(row).forEach(([key, value]) => {
    normalized[normalizeHeader(key)] = value
  })
  return normalized
}

function parseTags(value?: string) {
  if (!value) return undefined
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export interface ImportedContactRow {
  whatsapp: string
  first_name?: string
  full_name?: string
  email?: string
  city?: string
  state?: string
  bairro?: string
  cep?: string
  rua?: string
  numero_residencia?: string
  complemento?: string
  ponto_referencia?: string
  genero?: string
  data_nascimento?: string
  tags?: string[]
  custom_fields?: Record<string, unknown>
}

function mapImportRows(rows: Record<string, unknown>[]) {
  return rows
    .map((row) => normalizeRowKeys(row))
    .map((row) => {
      const whatsapp = String(row.telefone ?? "").trim()
      if (!whatsapp) return null

      const full_name = String(row.nome ?? "").trim()
      const first_name = full_name ? full_name.split(" ")[0] : undefined
      const email = String(row.email ?? "").trim() || undefined
      const city = String(row.cidade ?? "").trim() || undefined
      const state = String(row.estado ?? "").trim() || undefined
      const tags = parseTags(String(row.tags ?? "").trim())
      const bairro = String(row.bairro ?? "").trim() || undefined
      const cep = String(row.cep ?? "").trim() || undefined
      const rua = String(row.rua ?? "").trim() || undefined
      const numero_residencia = String(row.numero_residencia ?? "").trim() || undefined
      const complemento = String(row.complemento ?? "").trim() || undefined
      const ponto_referencia = String(row.ponto_referencia ?? "").trim() || undefined
      const genero = String(row.genero ?? "").trim() || undefined
      const data_nascimento = String(row.data_nascimento ?? "").trim() || undefined

      const custom_fields: Record<string, unknown> = {}
      const customKeys = [
        "data_nascimento",
        "genero",
        "bairro",
        "cep",
        "rua",
        "numero_residencia",
        "complemento",
        "ponto_referencia"
      ]

      customKeys.forEach((key) => {
        const value = row[key]
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          custom_fields[key] = value
        }
      })

      return {
        whatsapp,
        first_name,
        full_name,
        email,
        city,
        state,
        bairro,
        cep,
        rua,
        numero_residencia,
        complemento,
        ponto_referencia,
        genero,
        data_nascimento,
        tags,
        custom_fields: Object.keys(custom_fields).length ? custom_fields : undefined
      } satisfies ImportedContactRow
    })
    .filter(Boolean) as ImportedContactRow[]
}

export async function parseContactsTemplate(file: File) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const headerRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: 0 })
  const headerRow = headerRows[0] as unknown[] | undefined
  if (!headerRow || !validateTemplateHeaders(headerRow)) {
    throw new Error("Arquivo inválido. Use exatamente o template padrão disponibilizado.")
  }
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: ""
  })
  const mappedRows = mapImportRows(rawRows)
  return {
    totalRows: rawRows.length,
    rows: mappedRows
  }
}

export const TEMPLATE_FILE_URL = "/templates/cidadaos_import_template.xlsx"
