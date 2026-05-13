"use client";

import { useState, useCallback } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SegmentTabs from "@/components/ui/SegmentTabs";
import Tag from "@/components/ui/Tag";

// ─── Data ────────────────────────────────────────────────────────────────────

const COLOR_TOKENS = [
  { name: "--bg", hex: "#0c0c10", label: "Background" },
  { name: "--surface", hex: "#13131a", label: "Surface" },
  { name: "--surface2", hex: "#1a1a24", label: "Surface 2" },
  { name: "--surface3", hex: "#22222f", label: "Surface 3" },
  { name: "--border", hex: "#2a2a3a", label: "Border" },
  { name: "--border2", hex: "#363650", label: "Border 2" },
  { name: "--gold", hex: "#c9960c", label: "Gold" },
  { name: "--gold-light", hex: "#f0b429", label: "Gold Light" },
  { name: "--gold-dim", hex: "rgba(201,150,12,.15)", label: "Gold Dim" },
  { name: "--purple", hex: "#a855f7", label: "Purple" },
  { name: "--purple-dim", hex: "rgba(168,85,247,.15)", label: "Purple Dim" },
  { name: "--blue", hex: "#38bdf8", label: "Blue" },
  { name: "--green", hex: "#4ade80", label: "Green" },
  { name: "--red", hex: "#f87171", label: "Red" },
  { name: "--text", hex: "#e2e2f0", label: "Text" },
  { name: "--text-dim", hex: "#8888aa", label: "Text Dim" },
  { name: "--text-muted", hex: "#55556a", label: "Text Muted" }
] as const;

const RAJDHANI_WEIGHTS = [400, 500, 600, 700] as const;
const EXO_WEIGHTS = [300, 400, 500, 600, 700] as const;

const TEXT_SIZES = [
  { px: 11, label: "xs — labels, meta" },
  { px: 12, label: "sm — captions" },
  { px: 13, label: "base — body" },
  { px: 14, label: "md — subheadings" },
  { px: 16, label: "lg — headings" },
  { px: 20, label: "xl — section titles" },
  { px: 24, label: "2xl — page titles" }
];

const SPACING_SCALE = [4, 8, 12, 16, 24, 32, 48];

const ANIMATIONS = [
  {
    name: "fadeIn",
    description: "Apparition avec glissement vertical (↑ 6px)",
    css: "fadeIn 0.4s ease forwards"
  },
  {
    name: "slideInR",
    description: "Glissement depuis la droite (→ 24px)",
    css: "slideInR 0.4s ease forwards"
  },
  {
    name: "spin",
    description: "Rotation continue — pour les loaders",
    css: "spin 1s linear infinite"
  }
] as const;

const NAV_ITEMS = [
  { id: "palette", label: "Palette" },
  { id: "typography", label: "Typographie" },
  { id: "animations", label: "Animations" },
  { id: "components", label: "Composants" },
  { id: "tags", label: "Tags" },
  { id: "spacing", label: "Espacement" }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      style={{
        fontFamily: "Rajdhani",
        fontSize: 20,
        fontWeight: 700,
        color: "var(--text)",
        letterSpacing: 1,
        marginBottom: 24,
        paddingBottom: 10,
        borderBottom: "1px solid var(--border)"
      }}
    >
      {children}
    </h2>
  );
}

function SectionBlock({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 28,
        marginBottom: 40
      }}
    >
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.6px",
        color: "var(--text-muted)",
        fontFamily: "'Exo 2', sans-serif",
        textTransform: "uppercase"
      }}
    >
      {children}
    </span>
  );
}

function DemoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{title}</Label>
      <div
        style={{
          marginTop: 10,
          padding: 20,
          background: "var(--surface2)",
          borderRadius: 6,
          border: "1px solid var(--border)"
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function PaletteSection() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback((token: string) => {
    navigator.clipboard.writeText(`var(${token})`).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    });
  }, []);

  return (
    <SectionBlock>
      <SectionTitle id="palette">Palette de couleurs</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12
        }}
      >
        {COLOR_TOKENS.map((token) => {
          const isCopied = copied === token.name;
          return (
            <button
              key={token.name}
              type="button"
              onClick={() => copy(token.name)}
              style={{
                background: "var(--surface2)",
                border: `1px solid ${isCopied ? "var(--gold)" : "var(--border)"}`,
                borderRadius: 6,
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                overflow: "hidden",
                transition: "border-color 0.15s"
              }}
            >
              <div
                style={{
                  height: 52,
                  background: `var(${token.name})`,
                  borderBottom: "1px solid var(--border)"
                }}
              />
              <div style={{ padding: "8px 10px" }}>
                <div
                  style={{
                    fontFamily: "Rajdhani",
                    fontSize: 12,
                    fontWeight: 600,
                    color: isCopied ? "var(--gold)" : "var(--text)",
                    marginBottom: 2
                  }}
                >
                  {isCopied ? "Copié !" : token.label}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
                  {token.name}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", marginTop: 1 }}>
                  {token.hex}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </SectionBlock>
  );
}

function TypographySection() {
  return (
    <SectionBlock>
      <SectionTitle id="typography">Typographie</SectionTitle>

      <div style={{ marginBottom: 32 }}>
        <Label>Rajdhani — titres, labels, boutons</Label>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {RAJDHANI_WEIGHTS.map((w) => (
            <div key={w} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span
                style={{
                  fontFamily: "Rajdhani",
                  fontWeight: w,
                  fontSize: 22,
                  color: "var(--text)",
                  minWidth: 280
                }}
              >
                Azero Dashboard — {w}
              </span>
              <Label>weight {w}</Label>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <Label>Exo 2 — corps de texte, inputs, données</Label>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {EXO_WEIGHTS.map((w) => (
            <div key={w} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontWeight: w,
                  fontSize: 15,
                  color: "var(--text)",
                  minWidth: 280
                }}
              >
                The quick brown fox jumps — {w}
              </span>
              <Label>weight {w}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Échelle de tailles</Label>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {TEXT_SIZES.map(({ px, label }) => (
            <div key={px} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: px,
                  color: "var(--text)",
                  minWidth: 200,
                  lineHeight: 1.4
                }}
              >
                Texte exemple
              </span>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)" }}>
                {px}px — {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SectionBlock>
  );
}

function AnimationsSection() {
  const [keys, setKeys] = useState<Record<string, number>>({ fadeIn: 0, slideInR: 0, spin: 0 });

  const replay = (name: string) => {
    setKeys((prev) => ({ ...prev, [name]: (prev[name] ?? 0) + 1 }));
  };

  return (
    <SectionBlock>
      <SectionTitle id="animations">Animations</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16
        }}
      >
        {ANIMATIONS.map((anim) => (
          <div
            key={anim.name}
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: 20
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16
              }}
            >
              <span
                style={{
                  fontFamily: "Rajdhani",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--gold)",
                  letterSpacing: 0.5
                }}
              >
                {anim.name}
              </span>
              <button
                type="button"
                onClick={() => replay(anim.name)}
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  background: "var(--surface3)",
                  border: "1px solid var(--border2)",
                  borderRadius: 4,
                  color: "var(--text-dim)",
                  fontFamily: "'Exo 2', sans-serif",
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.4px"
                }}
              >
                Rejouer
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 64,
                marginBottom: 12
              }}
            >
              <div
                key={`${anim.name}-${keys[anim.name]}`}
                style={{
                  width: anim.name === "spin" ? 28 : 80,
                  height: anim.name === "spin" ? 28 : 28,
                  background:
                    anim.name === "spin"
                      ? "transparent"
                      : "var(--gold-dim)",
                  border:
                    anim.name === "spin"
                      ? "3px solid var(--gold)"
                      : "1px solid var(--gold)",
                  borderTopColor: anim.name === "spin" ? "transparent" : "var(--gold)",
                  borderRadius: anim.name === "spin" ? "50%" : 4,
                  animation: anim.css
                }}
              />
            </div>

            <p
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "'Exo 2', sans-serif",
                lineHeight: 1.5,
                margin: 0
              }}
            >
              {anim.description}
            </p>
            <code
              style={{
                display: "block",
                marginTop: 8,
                fontSize: 10,
                color: "var(--text-dim)",
                fontFamily: "monospace",
                background: "var(--surface3)",
                padding: "4px 7px",
                borderRadius: 3
              }}
            >
              animation: {anim.css}
            </code>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}

function ComponentsSection() {
  const [btnLoading, setBtnLoading] = useState(false);
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [tabActive, setTabActive] = useState<"one" | "two" | "three">("one");

  const TABS = [
    { id: "one" as const, label: "Onglet 1" },
    { id: "two" as const, label: "Onglet 2" },
    { id: "three" as const, label: "Onglet 3" }
  ];

  const simulateLoad = () => {
    setBtnLoading(true);
    setTimeout(() => setBtnLoading(false), 2000);
  };

  return (
    <SectionBlock>
      <SectionTitle id="components">Composants UI</SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Button */}
        <DemoBox title="Button">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Button style={{ width: "100%" }}>Action principale</Button>
            <Button loading={btnLoading} onClick={simulateLoad} style={{ width: "100%" }}>
              {btnLoading ? "" : "Simuler chargement"}
            </Button>
            <Button disabled style={{ width: "100%" }}>
              Désactivé
            </Button>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setBtnDisabled((v) => !v)}
                style={{
                  fontSize: 10,
                  padding: "4px 10px",
                  background: btnDisabled ? "var(--gold-dim)" : "var(--surface3)",
                  border: `1px solid ${btnDisabled ? "var(--gold)" : "var(--border2)"}`,
                  borderRadius: 4,
                  color: btnDisabled ? "var(--gold)" : "var(--text-muted)",
                  fontFamily: "'Exo 2', sans-serif",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Toggle disabled
              </button>
            </div>
            {btnDisabled && (
              <Button disabled style={{ width: "100%" }}>
                État disabled togglé
              </Button>
            )}
          </div>
        </DemoBox>

        {/* Input */}
        <DemoBox title="Input">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input placeholder="Sans label" />
            <Input label="Avec label" placeholder="Placeholder…" />
            <Input
              label="Avec valeur"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Tapez quelque chose…"
            />
          </div>
        </DemoBox>

        {/* SegmentTabs */}
        <DemoBox title="SegmentTabs">
          <SegmentTabs tabs={TABS} active={tabActive} onChange={setTabActive} />
          <p
            style={{
              marginTop: 12,
              fontSize: 11,
              color: "var(--text-muted)",
              fontFamily: "'Exo 2', sans-serif"
            }}
          >
            Onglet actif : <span style={{ color: "var(--text-dim)" }}>{tabActive}</span>
          </p>
        </DemoBox>

        {/* Usage notes */}
        <DemoBox title="Notes d'utilisation">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Button", "Accepte toutes les props HTML button + loading?: boolean"],
              ["Input", "ForwardRef, label?: string, toutes les props HTML input"],
              ["SegmentTabs", "Générique sur T extends string, props: tabs, active, onChange"]
            ].map(([name, note]) => (
              <div key={name}>
                <span
                  style={{
                    fontFamily: "Rajdhani",
                    fontWeight: 700,
                    fontSize: 12,
                    color: "var(--gold)",
                    display: "block",
                    marginBottom: 2
                  }}
                >
                  {name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontFamily: "'Exo 2', sans-serif",
                    lineHeight: 1.5
                  }}
                >
                  {note}
                </span>
              </div>
            ))}
          </div>
        </DemoBox>
      </div>
    </SectionBlock>
  );
}

function TagsSection() {
  return (
    <SectionBlock>
      <SectionTitle id="tags">Tags / Badges</SectionTitle>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <Label>Variantes (size md)</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {(["gold", "purple", "blue", "green", "red", "default"] as const).map((v) => (
              <Tag key={v} variant={v}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Tag>
            ))}
          </div>
        </div>

        <div>
          <Label>Avec dot</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {(["gold", "purple", "blue", "green", "red", "default"] as const).map((v) => (
              <Tag key={v} variant={v} dot>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Tag>
            ))}
          </div>
        </div>

        <div>
          <Label>Tailles</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <Tag variant="gold" size="sm" dot>
              Small
            </Tag>
            <Tag variant="gold" size="md" dot>
              Medium
            </Tag>
          </div>
        </div>

        <div>
          <Label>Cas d'usage typiques</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <Tag variant="gold" dot>Légendaire</Tag>
            <Tag variant="purple" dot>Épique</Tag>
            <Tag variant="blue" dot>Rare</Tag>
            <Tag variant="green" dot>Peu commun</Tag>
            <Tag variant="default">Commun</Tag>
            <Tag variant="red" dot>Désactivé</Tag>
          </div>
        </div>

        <div
          style={{
            background: "var(--surface2)",
            borderRadius: 6,
            padding: "14px 16px",
            border: "1px solid var(--border)"
          }}
        >
          <Label>API — Tag</Label>
          <pre
            style={{
              margin: "10px 0 0",
              fontSize: 11,
              color: "var(--text-dim)",
              fontFamily: "monospace",
              lineHeight: 1.7
            }}
          >
            {`variant?: "gold" | "purple" | "blue" | "green" | "red" | "default"
size?:    "sm" | "md"
dot?:     boolean
children: ReactNode`}
          </pre>
        </div>
      </div>
    </SectionBlock>
  );
}

function SpacingSection() {
  return (
    <SectionBlock>
      <SectionTitle id="spacing">Espacement & Bordures</SectionTitle>

      <div style={{ marginBottom: 32 }}>
        <Label>Échelle d'espacement</Label>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {SPACING_SCALE.map((px) => (
            <div key={px} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: px * 2,
                  height: 20,
                  background: "var(--gold-dim)",
                  border: "1px solid var(--gold)",
                  borderRadius: 2,
                  flexShrink: 0,
                  minWidth: 8
                }}
              />
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)", minWidth: 30 }}>
                {px}px
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'Exo 2', sans-serif" }}>
                {px === 4 && "— micro, gaps icônes"}
                {px === 8 && "— xs, padding compact"}
                {px === 12 && "— sm, gaps internes"}
                {px === 16 && "— md, padding standard"}
                {px === 24 && "— lg, sections"}
                {px === 32 && "— xl, blocs"}
                {px === 48 && "— 2xl, séparateurs majeurs"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <Label>Tokens de bordure</Label>
        <div style={{ marginTop: 14, display: "flex", gap: 16 }}>
          {(["--border", "--border2"] as const).map((token) => (
            <div
              key={token}
              style={{
                flex: 1,
                padding: "16px 20px",
                background: "var(--surface2)",
                border: `1px solid var(${token})`,
                borderRadius: 6
              }}
            >
              <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>
                var({token})
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'Exo 2', sans-serif" }}>
                {token === "--border" ? "#2a2a3a — séparateurs discrets" : "#363650 — bordures interactives"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Border-radius</Label>
        <div style={{ marginTop: 14, display: "flex", gap: 16 }}>
          {[
            { r: 4, label: "4px — boutons, inputs, tags, swatches" },
            { r: 6, label: "6px — cards, panels, tabs" },
            { r: 8, label: "8px — sections, modals" },
            { r: 9999, label: "9999px — pills" }
          ].map(({ r, label }) => (
            <div key={r} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  background: "var(--surface3)",
                  border: "1px solid var(--border2)",
                  borderRadius: r === 9999 ? "9999px" : r
                }}
              />
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", textAlign: "center" }}>
                {r === 9999 ? "pill" : `${r}px`}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  fontFamily: "'Exo 2', sans-serif",
                  textAlign: "center",
                  maxWidth: 80,
                  lineHeight: 1.4
                }}
              >
                {label.split(" — ")[1]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SectionBlock>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  const [activeNav, setActiveNav] = useState("palette");

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveNav(id);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg)"
      }}
    >
      {/* Sidebar nav */}
      <aside
        style={{
          width: 200,
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--border)",
          padding: "32px 0"
        }}
      >
        <div style={{ padding: "0 20px 24px" }}>
          <div
            style={{
              fontFamily: "Rajdhani",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--gold)",
              letterSpacing: 1,
              marginBottom: 2
            }}
          >
            AZERO
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              fontFamily: "'Exo 2', sans-serif",
              letterSpacing: "0.5px",
              textTransform: "uppercase"
            }}
          >
            Design System
          </div>
        </div>

        <div style={{ height: 1, background: "var(--border)", marginBottom: 12 }} />

        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 8px" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(item.id)}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: 4,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--gold)" : "var(--text-dim)",
                  background: isActive ? "var(--gold-dim)" : "transparent",
                  transition: "all 0.15s"
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", padding: "0 20px 0" }}>
          <div style={{ height: 1, background: "var(--border)", marginBottom: 16 }} />
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", lineHeight: 1.6 }}>
            Next.js 16 · React 19
            <br />
            Tailwind CSS v4
            <br />
            Rajdhani · Exo 2
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: "40px 48px", maxWidth: 1100, overflowY: "auto" }}>
        <div style={{ marginBottom: 40 }}>
          <h1
            style={{
              fontFamily: "Rajdhani",
              fontSize: 32,
              fontWeight: 700,
              color: "var(--text)",
              letterSpacing: 1.5,
              marginBottom: 8
            }}
          >
            Design System
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-dim)",
              fontFamily: "'Exo 2', sans-serif",
              lineHeight: 1.6,
              maxWidth: 600
            }}
          >
            Référence visuelle des tokens, composants et animations du projet. Cliquez sur une couleur pour copier son
            token CSS.
          </p>
        </div>

        <PaletteSection />
        <TypographySection />
        <AnimationsSection />
        <ComponentsSection />
        <TagsSection />
        <SpacingSection />
      </main>
    </div>
  );
}
