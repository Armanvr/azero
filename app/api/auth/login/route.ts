import { NextResponse } from "next/server";
import { authenticateUser, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
    }
    const user = await authenticateUser(email, password);
    const token = await createSessionToken(user);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, username: user.username } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur serveur.";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
