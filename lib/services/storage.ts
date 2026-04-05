export interface UploadResult {
  bucket: string
  path: string
  url: string
}

export async function uploadMedia(file: File, folder?: string) {
  const formData = new FormData()
  formData.append("file", file)
  if (folder) {
    formData.append("folder", folder)
  }

  const res = await fetch("/api/storage/upload", {
    method: "POST",
    body: formData
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || "Erro ao enviar mídia")
  }

  return (await res.json()) as UploadResult
}
