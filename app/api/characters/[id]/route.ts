import { NextResponse } from "next/server";
import { CHARACTERS } from "@/lib/mock-data";
import { readSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const id = Number(params.id);
  const character = CHARACTERS.find((c) => c.id === id);
  if (!character) return NextResponse.json({ error: "Personnage introuvable" }, { status: 404 });
  return NextResponse.json({ character });
}
