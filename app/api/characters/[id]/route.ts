import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { charactersDb } from "@/lib/db";
import { CLASS_COLORS, CLASS_ID_TO_NAME } from "@/lib/constants";
import type { BnetCharacter, Character } from "@/lib/types";

function bnetToCharacter(c: BnetCharacter): Character {
  const wowClass = CLASS_ID_TO_NAME[c.classId] ?? "Guerrier";
  const color = CLASS_COLORS[wowClass] ?? "var(--text)";
  const id = `${c.name.toLowerCase()}-${c.realmSlug}`;
  return {
    id,
    name: c.name,
    title: c.title ?? "",
    race: c.raceName,
    class: wowClass,
    spec: c.spec ?? "",
    ilvl: c.ilvl ?? 0,
    realm: c.realm,
    guild: c.guildName ?? "",
    faction: c.faction,
    score: 0,
    gold: c.gold ?? 0,
    color,
    avatarUrl: c.avatarUrl,
    slotsLeft: c.slotsLeft ?? [],
    slotsRight: c.slotsRight ?? [],
    slotsWeapon: c.slotsWeapon ?? [],
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const dashIdx = id.indexOf("-");
  if (dashIdx === -1) return NextResponse.json({ error: "Personnage introuvable" }, { status: 404 });

  const nameLower = id.slice(0, dashIdx);
  const realmSlug = id.slice(dashIdx + 1);

  const bnetChar = await charactersDb.findOneAsync<BnetCharacter>({
    userId: session.userId,
    realmSlug,
    $where: function (this: BnetCharacter) {
      return this.name.toLowerCase() === nameLower;
    },
  });

  if (!bnetChar) return NextResponse.json({ error: "Personnage introuvable" }, { status: 404 });

  return NextResponse.json({ character: bnetToCharacter(bnetChar) });
}
