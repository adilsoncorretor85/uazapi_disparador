import { NextResponse } from "next/server"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "URL obrigatoria." }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: "URL invalida." }, { status: 400 })
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "URL invalida." }, { status: 400 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(parsed.toString(), {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html"
      },
      signal: controller.signal
    })

    const html = await response.text()
    const meta = extractMeta(html)

    return NextResponse.json({
      data: {
        url: parsed.toString(),
        title: meta.title,
        description: meta.description,
        image: meta.image,
        siteName: meta.siteName
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao buscar preview."
    return NextResponse.json(
      {
        data: { url: parsed.toString() },
        error: message
      },
      { status: 200 }
    )
  } finally {
    clearTimeout(timeout)
  }
}

function extractMeta(html: string) {
  const ogTitle =
    getMeta(html, "property", "og:title") ||
    getMeta(html, "name", "twitter:title")
  const ogDescription =
    getMeta(html, "property", "og:description") ||
    getMeta(html, "name", "twitter:description")
  const ogImage =
    getMeta(html, "property", "og:image") ||
    getMeta(html, "property", "og:image:secure_url") ||
    getMeta(html, "name", "twitter:image")
  const ogSiteName = getMeta(html, "property", "og:site_name")
  const titleTag = getTitle(html)

  return {
    title: decodeHtml(ogTitle || titleTag || ""),
    description: decodeHtml(ogDescription || ""),
    image: ogImage || "",
    siteName: decodeHtml(ogSiteName || "")
  }
}

function getMeta(html: string, attr: "property" | "name", value: string) {
  const pattern = new RegExp(
    `<meta[^>]+${attr}=["']${escapeRegex(value)}["'][^>]*>`,
    "i"
  )
  const tag = html.match(pattern)?.[0]
  if (!tag) return ""
  const contentMatch = tag.match(/content=["']([^"']+)["']/i)
  return contentMatch?.[1] ?? ""
}

function getTitle(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match?.[1] ?? ""
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
