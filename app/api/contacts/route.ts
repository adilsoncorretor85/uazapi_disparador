import { NextResponse } from "next/server"
import { listContacts } from "@/lib/data/contacts"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = await listContacts({
    search: searchParams.get("search") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    opted_in: searchParams.get("opted_in") ?? undefined,
    is_valid: searchParams.get("is_valid") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    instance_id: searchParams.get("instance_id") ?? undefined
  })

  return NextResponse.json(data)
}

