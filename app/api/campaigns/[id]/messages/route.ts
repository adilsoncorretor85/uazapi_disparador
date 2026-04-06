import { NextResponse } from "next/server"
import { listCampaignMessages } from "@/lib/data/messages"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url)
  const data = await listCampaignMessages(params.id, {
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    delivered: searchParams.get("delivered") ?? undefined,
    read: searchParams.get("read") ?? undefined,
    failed: searchParams.get("failed") ?? undefined,
    processed: searchParams.get("processed") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    pageSize: searchParams.get("pageSize")
      ? Number(searchParams.get("pageSize"))
      : 20
  })

  return NextResponse.json(data)
}

