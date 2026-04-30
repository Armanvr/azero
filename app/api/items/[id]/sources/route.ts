import { NextResponse } from "next/server";
import { ITEM_SOURCES } from "@/lib/mock-data";
import { readSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const name = decodeURIComponent(params.id);
  const data = ITEM_SOURCES[name];
  if (!data) return NextResponse.json({ error: "Item introuvable" }, { status: 404 });
  return NextResponse.json({ name, ...data });
}
