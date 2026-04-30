"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SegmentTabs from "@/components/ui/SegmentTabs";

type Tab = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [form, setForm] = useState({ email: "", password: "", username: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof typeof form>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (tab === "register" && form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const url = tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erreur d'authentification.");
        setLoading(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 20
      }}
    >
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "30%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "var(--gold)",
            opacity: 0.03,
            filter: "blur(80px)"
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            right: "25%",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "var(--purple)",
            opacity: 0.04,
            filter: "blur(60px)"
          }}
        />
      </div>

      <div style={{ width: "100%", maxWidth: 380, animation: "fadeIn 0.3s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontSize: 28,
              fontFamily: "Rajdhani",
              fontWeight: 700,
              letterSpacing: 4,
              color: "var(--gold-light)"
            }}
          >
            AZERO
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2, marginTop: 4 }}>
            ARMORY DASHBOARD
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 28
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <SegmentTabs<Tab>
              tabs={[
                { id: "login", label: "CONNEXION" },
                { id: "register", label: "INSCRIPTION" }
              ]}
              active={tab}
              onChange={(id) => {
                setTab(id);
                setError("");
              }}
            />
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tab === "register" && (
              <Input
                label="PSEUDO"
                placeholder="Votre pseudo"
                value={form.username}
                onChange={update("username")}
                required
              />
            )}
            <Input
              label="EMAIL"
              type="email"
              placeholder="votre@email.com"
              value={form.email}
              onChange={update("email")}
              required
            />
            <Input
              label="MOT DE PASSE"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={update("password")}
              required
            />
            {tab === "register" && (
              <Input
                label="CONFIRMER"
                type="password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={update("confirm")}
                required
              />
            )}

            {error && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--red)",
                  padding: "8px 10px",
                  background: "rgba(248,113,113,0.08)",
                  borderRadius: 4,
                  border: "1px solid rgba(248,113,113,0.2)"
                }}
              >
                {error}
              </div>
            )}

            <Button type="submit" loading={loading}>
              {tab === "login" ? "SE CONNECTER" : "CRÉER UN COMPTE"}
            </Button>
          </form>
        </div>

        {tab === "login" && (
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "var(--text-muted)" }}>
            Démo : créez un compte via l&apos;onglet Inscription
          </div>
        )}
      </div>
    </div>
  );
}
