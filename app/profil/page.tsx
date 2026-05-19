"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import CharacterCard from "@/components/profile/CharacterCard";
import Button from "@/components/ui/Button";
import type { BnetCharacter } from "@/lib/types";

interface ProfileUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  bnetConnected: boolean;
}

interface ProfileData {
  user: ProfileUser;
  characters: BnetCharacter[];
}

export default function ProfilPage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => {
        if (r.status === 401) {
          router.replace("/auth");
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((j) => j && setData(j as ProfileData))
      .finally(() => setLoading(false));
  }, [router]);

  async function disconnect() {
    setDisconnecting(true);
    await fetch("/api/auth/bnet/disconnect", { method: "POST" });
    const res = await fetch("/api/profile");
    if (res.ok) setData((await res.json()) as ProfileData);
    setDisconnecting(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header active="profil" />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
          }}
        >
          Chargement…
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, characters } = data;
  const memberDate = new Date(user.createdAt).toLocaleDateString("fr-FR");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Header active="profil" />
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px 24px",
          maxWidth: 720,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* User info */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--surface3)",
              border: "1px solid var(--border2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            👤
          </div>
          <div>
            <div
              style={{
                fontSize: 16,
                fontFamily: "Rajdhani",
                fontWeight: 700,
                color: "var(--gold-light)",
                letterSpacing: 1,
              }}
            >
              {user.username}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{user.email}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Membre depuis {memberDate}
            </div>
          </div>
        </div>

        {/* Battle.net section */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "20px 24px",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2, marginBottom: 12 }}>
            BATTLE.NET
          </div>
          {user.bnetConnected ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#22c55e", fontSize: 14 }}>●</span>
                <span style={{ fontSize: 13, color: "var(--text)" }}>Compte connecté</span>
              </div>
              <Button loading={disconnecting} onClick={disconnect}>
                DÉCONNECTER
              </Button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                Connectez votre compte pour importer vos personnages.
              </span>
              <Button onClick={() => router.push("/api/auth/bnet")}>
                CONNECTER BATTLE.NET
              </Button>
            </div>
          )}
        </div>

        {/* Characters */}
        {user.bnetConnected && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2, marginBottom: 12 }}>
              VOS PERSONNAGES ({characters.length})
            </div>
            {characters.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Aucun personnage trouvé.</div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 8,
                }}
              >
                {characters.map((char) => (
                  <CharacterCard
                    key={`${char.name}-${char.realmSlug}`}
                    char={char}
                    onRefreshed={(updated) =>
                      setData((prev) =>
                        prev
                          ? {
                              ...prev,
                              characters: prev.characters.map((c) =>
                                c.name === updated.name && c.realmSlug === updated.realmSlug ? updated : c
                              ),
                            }
                          : prev
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
