import { NextResponse } from "next/server";
import { OBTAINABLE_CATEGORIES } from "@/lib/mock-data";
import { readSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { slot: string } }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const cat = OBTAINABLE_CATEGORIES.find((c) => c.id === params.slot);
  if (!cat) return NextResponse.json({ items: [] });
  return NextResponse.json({ items: cat.items });
}
