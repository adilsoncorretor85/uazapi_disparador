export const MAX_VIDEO_BYTES = 64 * 1024 * 1024

export function getAcceptTypes(mediaType?: string | null) {
  switch (mediaType) {
    case "image":
      return "image/*"
    case "video":
      return "video/*"
    case "audio":
      return "audio/*"
    case "document":
      return "*/*"
    default:
      return ""
  }
}
