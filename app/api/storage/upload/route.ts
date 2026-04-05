import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { env } from "@/lib/env"

const DEFAULT_BUCKET = "campaign-media"

function getExtension(name: string) {
  const parts = name.split(".")
  if (parts.length < 2) return "bin"
  const ext = parts.pop()
  return ext ? ext.toLowerCase() : "bin"
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 })
  }

  const bucket = env.SUPABASE_STORAGE_BUCKET ?? DEFAULT_BUCKET
  const folder = (formData.get("folder") as string | null) ?? "uploads"
  const ext = getExtension(file.name)
  const filename = `${randomUUID()}.${ext}`
  const path = `${folder}/${filename}`

  const supabase = createAdminClient()

  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
  if (bucketsError) {
    return NextResponse.json({ error: bucketsError.message }, { status: 500 })
  }

  const exists = buckets?.some((item) => item.name === bucket)
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: true
    })
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)

  return NextResponse.json({
    bucket,
    path,
    url: data.publicUrl
  })
}
