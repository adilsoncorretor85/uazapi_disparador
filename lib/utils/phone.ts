const DDD_WITH_NINTH_DIGIT = new Set([
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "21",
  "22",
  "24",
  "27",
  "28",
  "31",
  "32",
  "33",
  "34",
  "35",
  "37",
  "38",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "69",
  "71",
  "73",
  "74",
  "75",
  "77",
  "79",
  "81",
  "82",
  "83",
  "84",
  "85",
  "86",
  "87",
  "88",
  "89",
  "91",
  "92",
  "93",
  "94",
  "95",
  "96",
  "97",
  "98",
  "99"
])

export interface NormalizedPhone {
  digits: string
  e164: string
  ddd: string
  number: string
}

export function normalizeWhatsappNumber(
  input: string,
  defaultDdd = "47"
): NormalizedPhone | null {
  if (!input) return null
  let digits = String(input).replace(/\D/g, "")
  if (!digits) return null

  if (digits.startsWith("55")) {
    digits = digits.slice(2)
  }

  let ddd = ""
  let number = ""

  if (digits.length === 8 || digits.length === 9) {
    ddd = defaultDdd
    number = digits
  } else if (digits.length >= 10) {
    ddd = digits.slice(0, 2)
    number = digits.slice(2)
  } else {
    return null
  }

  if (DDD_WITH_NINTH_DIGIT.has(ddd) && number.length === 8) {
    number = `9${number}`
  } else if (!DDD_WITH_NINTH_DIGIT.has(ddd) && number.length === 9) {
    number = number.slice(1)
  }

  if (number.length < 8 || number.length > 9) {
    return null
  }

  const digitsOut = `${ddd}${number}`
  return {
    digits: digitsOut,
    e164: `+55${digitsOut}`,
    ddd,
    number
  }
}
