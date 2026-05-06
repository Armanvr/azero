"use client";
import { useRouter } from "next/navigation";

type Page = "home" | "metiers" | "collections" | "profil";

interface NavItem {
  label: string;
  page: Page;
  href: string;
}

const NAV: NavItem[] = [
  { label: "ACCUEIL", page: "home", href: "/" },
  { label: "MÉTIERS", page: "metiers", href: "/metiers" },
  { label: "COLLECTIONS", page: "collections", href: "/metiers" },
  { label: "PROFIL", page: "profil", href: "/profil" }
];

export default function Header({ active }: { active: Page }) {
  const router = useRouter();

  return (
    <header
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 20px",
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        zIndex: 10
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            fontSize: 18,
            fontFamily: "Rajdhani",
            fontWeight: 700,
            letterSpacing: 3,
            color: "var(--gold-light)"
          }}
        >
          AZERO
        </span>
        <span style={{ width: 1, height: 20, background: "var(--border2)" }} />
        <nav style={{ display: "flex", gap: 2 }}>
          {NAV.map((n) => {
            const isActive = n.page === active;
            return (
              <button
                key={n.label}
                onClick={() => router.push(n.href)}
                style={{
                  padding: "5px 10px",
                  background: isActive ? "var(--gold-dim)" : "transparent",
                  border: isActive ? "1px solid rgba(201,150,12,0.4)" : "1px solid transparent",
                  borderRadius: 4,
                  color: isActive ? "var(--gold-light)" : "var(--text-dim)",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                  cursor: "pointer",
                  fontFamily: "'Exo 2', sans-serif",
                  transition: "all 0.15s"
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--text)";
                    e.currentTarget.style.borderColor = "var(--border2)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--text-dim)";
                    e.currentTarget.style.borderColor = "transparent";
                  }
                }}
              >
                {n.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => router.push("/profil")}
          title="Profil"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--surface3)",
            border: "1px solid var(--border2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer"
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>👤</span>
        </button>
      </div>
    </header>
  );
}
