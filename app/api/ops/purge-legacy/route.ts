import { NextResponse } from "next/server"
export async function POST() {
  return NextResponse.json({ error: "Deprecated — fonts are now stored in git" }, { status: 410 })
}
