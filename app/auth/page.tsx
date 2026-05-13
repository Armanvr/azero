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
    <div className="min-h-screen flex items-center justify-center bg-bg p-5">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] rounded-full bg-gold opacity-[0.03] blur-[80px]" />
        <div className="absolute bottom-[20%] right-[25%] w-[300px] h-[300px] rounded-full bg-purple opacity-[0.04] blur-[60px]" />
      </div>

      <div className="w-full max-w-[380px]" style={{ animation: "fadeIn 0.3s ease" }}>
        <div className="text-center mb-8">
          <div className="text-[28px] font-rajdhani font-bold tracking-[4px] text-gold-light">
            AZERO
          </div>
          <div className="text-[11px] text-text-muted tracking-[2px] mt-1">
            ARMORY DASHBOARD
          </div>
        </div>

        <div className="bg-surface border border-border rounded-[8px] p-7">
          <div className="mb-6">
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

          <form onSubmit={submit} className="flex flex-col gap-3">
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
              <div className="text-[11px] text-red px-[10px] py-2 bg-[rgba(248,113,113,0.08)] rounded border border-[rgba(248,113,113,0.2)]">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading}>
              {tab === "login" ? "SE CONNECTER" : "CRÉER UN COMPTE"}
            </Button>
          </form>
        </div>

        {tab === "login" && (
          <div className="text-center mt-4 text-[11px] text-text-muted">
            Démo : créez un compte via l&apos;onglet Inscription
          </div>
        )}
      </div>
    </div>
  );
}
