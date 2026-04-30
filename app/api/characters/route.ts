import { NextResponse } from "next/server";
import { CHARACTERS } from "@/lib/mock-data";
import { readSession } from "@/lib/auth";

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  return NextResponse.json({ characters: CHARACTERS });
}
