import { useEffect, useMemo, useRef, useState } from "react"
import { extractFirstLink, fetchLinkPreview, type LinkPreviewData } from "../helpers/link-preview"

interface UseLinkPreviewOptions {
  text: string
  enabled: boolean
}

export function useLinkPreview({ text, enabled }: UseLinkPreviewOptions) {
  const [data, setData] = useState<LinkPreviewData | null>(null)
  const lastPreviewRef = useRef<string | null>(null)

  const linkUrl = useMemo(() => {
    if (!enabled) return null
    return extractFirstLink(text ?? "")
  }, [enabled, text])

  useEffect(() => {
    if (!linkUrl) {
      setData(null)
      lastPreviewRef.current = null
      return
    }

    if (lastPreviewRef.current === linkUrl) {
      return
    }

    lastPreviewRef.current = linkUrl

    const controller = new AbortController()
    const timeout = setTimeout(() => {
      fetchLinkPreview(linkUrl, controller.signal)
        .then((preview) => {
          setData({ url: linkUrl, ...preview })
        })
        .catch(() => {
          setData({ url: linkUrl })
        })
    }, 200)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [linkUrl])

  return {
    data,
    linkUrl
  }
}
