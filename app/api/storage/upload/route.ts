import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { createAdminClient } from "@/lib/supabase/admin"
import { env } from "@/lib/env"

const DEFAULT_BUCKET = "campaign-media"

function getExtension(name: string) {
  const parts = name.split(".")
  if (parts.length < 2) return "bin"
  const ext = parts.pop()
  return ext ? ext.toLowerCase() : "bin"
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "")
}

function getStorageProvider() {
  return env.STORAGE_PROVIDER ?? "supabase"
}

function buildR2Endpoint() {
  if (env.R2_ENDPOINT) return env.R2_ENDPOINT
  if (!env.R2_ACCOUNT_ID) return null
  return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
}

function getR2Config() {
  const endpoint = buildR2Endpoint()
  if (!endpoint) return null
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) return null
  if (!env.R2_BUCKET || !env.R2_PUBLIC_BASE_URL) return null

  return {
    endpoint,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL
  }
}

async function uploadToR2(file: File, folder: string, filename: string) {
  const config = getR2Config()
  if (!config) {
    throw new Error(
      "R2 nao configurado. Defina R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL e R2_ACCOUNT_ID (ou R2_ENDPOINT)."
    )
  }

  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  })

  const path = `${trimSlashes(folder)}/${filename}`
  const body = Buffer.from(await file.arrayBuffer())

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: path,
      Body: body,
      ContentType: file.type || "application/octet-stream",
      CacheControl: "public, max-age=31536000"
    })
  )

  const baseUrl = trimSlashes(config.publicBaseUrl)
  return {
    bucket: config.bucket,
    path,
    url: `${baseUrl}/${path}`
  }
}

async function uploadToSupabase(file: File, folder: string, filename: string) {
  const bucket = env.SUPABASE_STORAGE_BUCKET ?? DEFAULT_BUCKET
  const path = `${trimSlashes(folder)}/${filename}`
  const supabase = createAdminClient()

  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
  if (bucketsError) {
    throw new Error(bucketsError.message)
  }

  const exists = buckets?.some((item) => item.name === bucket)
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: true
    })
    if (createError) {
      throw new Error(createError.message)
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return {
    bucket,
    path,
    url: data.publicUrl
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo obrigatorio." }, { status: 400 })
    }

    const folder = (formData.get("folder") as string | null) ?? "uploads"
    const ext = getExtension(file.name)
    const filename = `${randomUUID()}.${ext}`
    const provider = getStorageProvider()

    const uploaded =
      provider === "r2"
        ? await uploadToR2(file, folder, filename)
        : await uploadToSupabase(file, folder, filename)

    return NextResponse.json({ data: uploaded })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao enviar midia."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
