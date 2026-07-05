import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Brand palette (see tailwind.config.ts)
const DEEP = "#164A40";
const TEAL = "#206A5D";
const LIME = "#A5D44A";
const CREAM = "#F5F7EE";

function fmtUsd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

// Mirror of the calculator's compounding math (components/Calculator.tsx): future
// value of the starting lump sum plus the future value of the monthly annuity.
function projectedTotal(sa: number, mc: number, ty: number, ir: number): number {
  const r = ir / 100 / 12;
  const months = Math.round(ty * 12);
  const fvInitial = sa * Math.pow(1 + r, months);
  const fvAnnuity = Math.abs(r) < 1e-9 ? mc * months : mc * ((Math.pow(1 + r, months) - 1) / r);
  const total = Math.max(0, fvInitial + fvAnnuity);
  return isFinite(total) ? total : sa;
}

function niceYears(ty: number): string {
  const rounded = Math.round(ty * 100) / 100;
  const label = Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
  return `${label} ${rounded === 1 ? "year" : "years"}`;
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const num = (k: string, d: number) => {
    const v = parseFloat(p.get(k) ?? "");
    return isFinite(v) ? v : d;
  };
  const hasScenario = ["sa", "mc", "ty", "ir"].some((k) => p.has(k));
  const sa = num("sa", 0);
  const mc = num("mc", 500);
  const ty = num("ty", 20);
  const ir = num("ir", 7);
  const total = projectedTotal(sa, mc, ty, ir);
  const isWithdrawal = mc < 0;

  // The contribution/rate/timeframe line, e.g. "$1,500/mo · 9% · 20 years".
  const parts: string[] = [];
  if (mc !== 0) parts.push(`${fmtUsd(Math.abs(mc))}/mo${isWithdrawal ? " out" : ""}`);
  if (sa > 0) parts.push(`from ${fmtUsd(sa)}`);
  parts.push(`${ir}%`);
  parts.push(niceYears(ty));
  const scenarioLine = parts.join("  ·  ");

  // Try to embed the sprout logo; fall back to a text-only mark if it can't load.
  let logoSrc: string | null = null;
  try {
    const res = await fetch(new URL("/logo.png", req.nextUrl.origin));
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer()).toString("base64");
      logoSrc = `data:image/png;base64,${buf}`;
    }
  } catch {
    /* fall back to text mark */
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: `linear-gradient(135deg, ${DEEP} 0%, ${TEAL} 100%)`,
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} width={72} height={72} alt="" style={{ marginRight: "18px" }} />
          ) : null}
          <div style={{ display: "flex", fontSize: "44px", fontWeight: 700, color: LIME }}>
            simplesavings.app
          </div>
        </div>

        {/* The number */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "34px", color: CREAM, opacity: 0.85, marginBottom: "8px" }}>
            {scenarioLine}
          </div>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <div style={{ display: "flex", fontSize: "48px", color: CREAM, opacity: 0.7, marginRight: "20px" }}>
              {hasScenario ? "grows to" : "See your number"}
            </div>
            {hasScenario ? (
              <div style={{ display: "flex", fontSize: "132px", fontWeight: 800, color: LIME, lineHeight: 1 }}>
                {fmtUsd(total)}
              </div>
            ) : null}
          </div>
        </div>

        {/* Tagline */}
        <div style={{ display: "flex", fontSize: "36px", color: CREAM, opacity: 0.9 }}>
          See your money&apos;s future — then plan how to reach it, faster.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
