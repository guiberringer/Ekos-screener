import React, { useState, useMemo } from "react";

/* ---------------------------------------------------------------------
   Design tokens
--------------------------------------------------------------------- */
const T = {
  bg: "#F1F4EE",
  surface: "#FFFFFF",
  ink: "#1F2A22",
  inkSoft: "#5B695F",
  forest: "#1B3A2B",
  forestLight: "#2E5741",
  gold: "#B8863B",
  line: "#DCE2D6",
  high: "#A6472E",
  medium: "#B8863B",
  low: "#5C7A63",
};

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');";

/* ---------------------------------------------------------------------
   Content: pillars, questions
--------------------------------------------------------------------- */
const PILLARS = [
  {
    id: "climate",
    label: "Climate",
    tagline: "Energy costs, weather exposure, and the shift to a low-carbon economy",
    questions: [
      { id: "energy", text: "How reliant is this business on fossil fuels — vehicles, machinery, heating, generators?", type: "level" },
      { id: "weather", text: "Has severe weather disrupted its operations, supply chain, or premises in the last five years?", type: "yesno" },
      { id: "priceVolatility", text: "Is energy or fuel price volatility likely to be a real concern for its margins?", type: "yesno" },
      { id: "emissionsManagement", text: "Does the business currently measure or actively work to reduce its carbon emissions?", type: "yesno_inverted" },
      { id: "customerExposure", text: "Could a changing climate affect the demand, stability, or spending of this business's key customers?", type: "yesnounsure" },
    ],
  },
  {
    id: "environment",
    label: "Environment",
    tagline: "Waste, water, and the everyday cost of how you operate",
    questions: [
      { id: "waste", text: "Does this business generate significant waste — packaging, offcuts, food waste, materials?", type: "yesno" },
      { id: "water", text: "Is water use likely to be a meaningful operational cost or constraint?", type: "yesno" },
      { id: "compliance", text: "Is it likely subject to environmental compliance — resource consents, discharge or emissions permits?", type: "yesno" },
    ],
  },
  {
    id: "nature",
    label: "Nature",
    tagline: "What your business depends on and affects in the natural world",
    questions: [
      { id: "dependency", text: "Do its products or services — directly, or through what they're made from and where those materials originate — depend on natural resources like land, water, fisheries, or forestry?", type: "yesno" },
      { id: "sensitiveAreas", text: "Might any sites or suppliers operate in or near ecologically sensitive areas?", type: "yesnounsure" },
    ],
  },
  {
    id: "social",
    label: "Social",
    tagline: "Labour practices, in your business and across your supply chain",
    questions: [
      { id: "supplyChain", text: "Does its supply chain include overseas manufacturing or labour-intensive sourcing?", type: "yesno" },
      { id: "visibility", text: "Does it likely have real visibility into labour practices at its key suppliers?", type: "yesnounsure_inverted" },
      { id: "incidents", text: "Any known workplace health & safety incidents or labour disputes in the last two years?", type: "yesno" },
    ],
  },
  {
    id: "governance",
    label: "Governance",
    tagline: "Whether sustainability has a real seat at the table",
    questions: [
      { id: "policy", text: "Does this business have a documented sustainability or environmental policy?", type: "yesno_inverted" },
      { id: "reporting", text: "Is sustainability performance likely reported to its board or leadership team?", type: "yesno_inverted" },
      { id: "asked", text: "Do its customers or investors likely ask it sustainability questions — RFPs, tenders, ESG surveys?", type: "yesno" },
    ],
  },
];

const PROFILE_FIELDS = [
  { key: "sector", label: "Sector", question: "Which sector best fits this business?", kind: "select", options: ["Retail trade", "Accommodation & food services", "Manufacturing", "Construction", "Professional & financial services", "Agriculture, forestry & fishing", "Transport & logistics", "Other"] },
  { key: "employees", label: "Employees", question: "Roughly how many employees does it have?", kind: "select", options: ["1–19", "20–49", "50–199", "200+"] },
  { key: "revenue", label: "Annual revenue", question: "Roughly what annual revenue band does it fall into?", kind: "select", options: ["Under $2m", "$2m–$10m", "$10m–$50m", "Over $50m"] },
  { key: "sites", label: "Number of physical sites", question: "How many physical sites or locations does it operate?", kind: "number" },
  { key: "offshoreSupply", label: "Offshore/overseas supply chain", question: "Does its supply chain include overseas manufacturing or offshore sourcing?", kind: "yesno" },
  { key: "natureInputs", label: "Depends on natural resources", question: "Are its key inputs — including raw materials embedded in what it sells or sources, like paper, timber, cotton, or packaging, not just obviously \"natural\" products — ultimately sourced from nature: agriculture, fisheries, forestry, land?", kind: "yesno" },
  { key: "weatherExposed", label: "Weather-exposed sites", question: "Do its physical sites face weather-related risk — flooding, storms, drought, heat?", kind: "yesno" },
];

/* ---------------------------------------------------------------------
   Scoring — deterministic, rules-based
--------------------------------------------------------------------- */
function scorePillar(pillarId, answers, profile) {
  const pillar = PILLARS.find((p) => p.id === pillarId);
  let score = 0;
  let max = 0;

  pillar.questions.forEach((q) => {
    const a = answers[q.id];
    max += 1;
    if (a === undefined) return;
    if (q.type === "level") {
      score += a === "high" ? 1 : a === "medium" ? 0.5 : 0;
    } else if (q.type === "yesno" || q.type === "yesno_inverted") {
      const positive = q.type === "yesno_inverted" ? a === "no" : a === "yes";
      score += positive ? 1 : 0;
    } else if (q.type === "yesnounsure" || q.type === "yesnounsure_inverted") {
      const inverted = q.type === "yesnounsure_inverted";
      if (a === "unsure") score += 0.5;
      else {
        const positive = inverted ? a === "no" : a === "yes";
        score += positive ? 1 : 0;
      }
    }
  });

  let modifier = 0;
  if (pillarId === "climate" && profile.weatherExposed === "yes") modifier += 1;
  if (pillarId === "nature" && profile.natureInputs === "yes") modifier += 1;
  if (pillarId === "social" && profile.offshoreSupply === "yes") modifier += 1;
  if (pillarId === "environment" && Number(profile.sites) > 1) modifier += 0.5;
  max += 1;
  score += modifier;

  const pct = score / max;
  let level = "Low";
  if (pct >= 0.6) level = "High";
  else if (pct >= 0.3) level = "Medium";

  return { score, max, pct, level };
}

/* ---------------------------------------------------------------------
   AI research — web search grounded pre-fill
--------------------------------------------------------------------- */
function allowedValuesFor(type) {
  if (type === "level") return '"low" | "medium" | "high" | "unknown"';
  if (type === "yesno" || type === "yesno_inverted") return '"yes" | "no" | "unknown"';
  return '"yes" | "no" | "unsure" | "unknown"';
}

function buildResearchPrompt(businessName, website) {
  const profileLines = PROFILE_FIELDS.map((f) => {
    const allowed =
      f.kind === "select" ? f.options.map((o) => `"${o}"`).join(" | ") + ' | "unknown"' :
      f.kind === "number" ? "a number as a string, or \"unknown\"" :
      '"yes" | "no" | "unknown"';
    return `- ${f.key}: ${f.question} Allowed values: ${allowed}.`;
  }).join("\n");

  const pillarLines = PILLARS.map((p) =>
    p.questions.map((q) => `- ${p.id}.${q.id}: ${q.text} Allowed values: ${allowedValuesFor(q.type)}.`).join("\n")
  ).join("\n");

  const shape = {
    profile: Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, { value: "unknown", confidence: "unknown", rationale: "one short sentence" }])),
    pillars: Object.fromEntries(
      PILLARS.map((p) => [p.id, Object.fromEntries(p.questions.map((q) => [q.id, { value: "unknown", rationale: "one short sentence" }]))])
    ),
  };

  return `You are researching a specific New Zealand business for a sustainability screening tool built by Ekos, an environmental consultancy. Target business: "${businessName}"${website ? `, website: ${website}` : ""}.

The business name alone may be short, generic, or shared with unrelated organisations elsewhere in the world (including other companies also called "${businessName}"). Before relying on any search result, confirm it's actually a New Zealand-based business and, if a website was given, that it matches that domain — if a result seems to belong to a different, unrelated company with a similar name, disregard it rather than using its details. If your first search is inconclusive, try at most ONE more variation (e.g. adding "New Zealand" or the website domain) — then stop searching and answer with what you have, marking anything genuinely unclear as "unknown" rather than continuing to search. A business with thin public information is a completely normal, expected outcome — don't keep searching to try to find more.

Use what you find to make your best-informed, honest estimate for each field below. Where you find no reliable direct information, use reasonable sector-based inference where it's genuinely sound (e.g. a small independent retailer is unlikely to have a formal sustainability governance structure; a manufacturer is more likely to be energy-intensive) and say so plainly in the rationale. If you have no reasonable basis at all, answer "unknown" — do not fabricate specifics like incident counts or named suppliers, and do not carry over details from an unrelated same-named company.

On nature-dependency questions specifically: don't limit "depends on nature" to businesses that obviously touch land or water directly. A distributor of paper products depends on forestry, a clothing retailer depends on cotton farming or livestock, a printer depends on timber and water — trace materials back to their origin rather than stopping at "these are manufactured goods."

Profile fields:
${profileLines}

Assessment questions:
${pillarLines}

At most 2 searches total for this whole task — do not exceed that even if results feel incomplete. Keep every rationale to one short sentence, under 20 words.

Do whatever searching you need first. Your final reply must contain nothing except the JSON object below, fully filled in — no preamble, no markdown fences, no explanation before or after it:
${JSON.stringify(shape, null, 2)}`;
}

function extractJson(rawText) {
  // Pull out the outermost {...} block even if the model added narration
  // before/after it (common when it's also using tools like web search).
  const start = rawText.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in response");
  let depth = 0;
  for (let i = start; i < rawText.length; i++) {
    if (rawText[i] === "{") depth++;
    if (rawText[i] === "}") {
      depth--;
      if (depth === 0) return JSON.parse(rawText.slice(start, i + 1));
    }
  }
  throw new Error("Unbalanced JSON object in response");
}

async function callClaudeRaw(body) {
  const response = await fetch("/.netlify/functions/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const rawBodyText = await response.text();
  const header = `HTTP status: ${response.status} ${response.statusText}\n`;

  let data;
  try {
    data = JSON.parse(rawBodyText);
  } catch (err) {
    // The response wasn't JSON at all — common if a serverless function timed
    // out or crashed and the platform returned an empty/HTML response instead.
    return {
      ok: false,
      raw: header + `Response body was not valid JSON (length ${rawBodyText.length} chars):\n\n${rawBodyText.slice(0, 1500)}`,
      parsed: null,
    };
  }

  if (data.error) {
    return { ok: false, raw: header + JSON.stringify(data.error, null, 2), parsed: null };
  }

  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("\n")
    .replace(/```json|```/g, "");
  const toolCalls = (data.content || []).filter((b) => b.type === "server_tool_use" || b.type === "web_search_tool_result");
  const debugSummary =
    header +
    `Top-level response keys: ${Object.keys(data).join(", ") || "(none)"}\n` +
    `Stop reason: ${data.stop_reason || "(none)"}\n` +
    `Content block types: ${(data.content || []).map((b) => b.type).join(", ") || "(none)"}\n` +
    `Search-related blocks: ${toolCalls.length}\n\n--- raw text ---\n${text}` +
    (text ? "" : `\n\n--- full response (for diagnosis) ---\n${JSON.stringify(data, null, 2).slice(0, 2000)}`);

  try {
    const parsed = extractJson(text);
    return { ok: true, raw: debugSummary, parsed };
  } catch (err) {
    return { ok: false, raw: debugSummary + `\n\n--- parse error ---\n${err.message}`, parsed: null };
  }
}

async function callClaude(body) {
  const result = await callClaudeRaw(body);
  if (!result.ok) throw new Error(result.raw);
  return result.parsed;
}

/* ---------------------------------------------------------------------
   Small UI primitives
--------------------------------------------------------------------- */
function Choice({ options, value, onChange }) {
  return (
    <div className="choice-row">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={"choice" + (value === opt.value ? " choice--active" : "")}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function YesNo({ value, onChange }) {
  return <Choice value={value} onChange={onChange} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />;
}
function YesNoUnsure({ value, onChange }) {
  return <Choice value={value} onChange={onChange} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unsure", label: "Not sure" }]} />;
}
function Level({ value, onChange }) {
  return <Choice value={value} onChange={onChange} options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]} />;
}

function AiBadge({ show }) {
  if (!show) return null;
  return <span className="ai-badge">AI suggested — check &amp; edit</span>;
}

function Question({ q, value, onChange, aiRationale, showBadge }) {
  return (
    <div className="question">
      <div className="question__head">
        <p className="question__text">{q.text}</p>
        <AiBadge show={showBadge} />
      </div>
      {aiRationale && <p className="question__rationale">{aiRationale}</p>}
      {q.type === "level" && <Level value={value} onChange={onChange} />}
      {(q.type === "yesno" || q.type === "yesno_inverted") && <YesNo value={value} onChange={onChange} />}
      {(q.type === "yesnounsure" || q.type === "yesnounsure_inverted") && <YesNoUnsure value={value} onChange={onChange} />}
    </div>
  );
}

/* ---------------------------------------------------------------------
   Main component
--------------------------------------------------------------------- */
const STEPS = ["intro", "start", "profile", ...PILLARS.map((p) => p.id), "results"];

export default function EkosScreener() {
  const [stepIndex, setStepIndex] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [researchStatus, setResearchStatus] = useState("idle"); // idle | loading | done | error | skipped
  const [debugInfo, setDebugInfo] = useState("");
  const [showDebug, setShowDebug] = useState(false);

  const [profile, setProfile] = useState(
    Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, ""]))
  );
  const [answers, setAnswers] = useState(Object.fromEntries(PILLARS.map((p) => [p.id, {}])));
  const [aiMeta, setAiMeta] = useState({ profile: {}, pillars: {} }); // rationale + whether still AI-sourced
  const [touched, setTouched] = useState(new Set());

  const [aiCopy, setAiCopy] = useState(null);
  const [aiState, setAiState] = useState("idle");
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | done | error

  const step = STEPS[stepIndex];
  const currentPillar = PILLARS.find((p) => p.id === step);

  const results = useMemo(() => {
    if (step !== "results") return null;
    const out = {};
    PILLARS.forEach((p) => { out[p.id] = scorePillar(p.id, answers[p.id], profile); });
    return out;
  }, [step, answers, profile]);

  function goNext() { setStepIndex((i) => Math.min(i + 1, STEPS.length - 1)); }
  function goBack() { setStepIndex((i) => Math.max(i - 1, 0)); }

  function markTouched(key) {
    setTouched((prev) => new Set(prev).add(key));
  }

  function setProfileField(key, val) {
    setProfile((p) => ({ ...p, [key]: val }));
    markTouched(`profile.${key}`);
  }
  function setAnswer(pillarId, qId, val) {
    setAnswers((prev) => ({ ...prev, [pillarId]: { ...prev[pillarId], [qId]: val } }));
    markTouched(`${pillarId}.${qId}`);
  }

  async function runResearch() {
    setResearchStatus("loading");
    setDebugInfo("");
    try {
      const prompt = buildResearchPrompt(businessName, website);
      const result = await callClaudeRaw({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      });
      setDebugInfo(result.raw);
      if (!result.ok) throw new Error(result.raw);
      const parsed = result.parsed;

      const nextProfile = { ...profile };
      const profileMeta = {};
      PROFILE_FIELDS.forEach((f) => {
        const r = parsed.profile && parsed.profile[f.key];
        if (r && r.value && r.value !== "unknown") {
          nextProfile[f.key] = r.value;
          profileMeta[f.key] = r.rationale || "";
        }
      });

      const nextAnswers = { ...answers };
      const pillarMeta = {};
      PILLARS.forEach((p) => {
        pillarMeta[p.id] = {};
        nextAnswers[p.id] = { ...nextAnswers[p.id] };
        p.questions.forEach((q) => {
          const r = parsed.pillars && parsed.pillars[p.id] && parsed.pillars[p.id][q.id];
          if (r && r.value && r.value !== "unknown") {
            nextAnswers[p.id][q.id] = r.value;
            pillarMeta[p.id][q.id] = r.rationale || "";
          }
        });
      });

      setProfile(nextProfile);
      setAnswers(nextAnswers);
      setAiMeta({ profile: profileMeta, pillars: pillarMeta });
      setResearchStatus("done");
    } catch (err) {
      console.error("Research failed:", err);
      setResearchStatus("error");
    }
  }

  function skipResearch() {
    setResearchStatus("skipped");
    goNext();
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  function startComplete() {
    return businessName.trim() && contactName.trim() && isValidEmail(contactEmail);
  }

  function profileComplete() {
    return PROFILE_FIELDS.every((f) => profile[f.key] !== "" && profile[f.key] !== undefined);
  }
  function pillarComplete(pillarId) {
    const pillar = PILLARS.find((p) => p.id === pillarId);
    return pillar.questions.every((q) => answers[pillarId][q.id] !== undefined);
  }

  async function generateAICopy() {
    setAiState("loading");
    const flagged = PILLARS.filter((p) => results[p.id].level === "Medium" || results[p.id].level === "High");
    if (flagged.length === 0) {
      setAiCopy({});
      setAiState("done");
      saveSubmission({});
      return;
    }

    const summaryLines = flagged.map((p) => `- ${p.label} (${results[p.id].level} priority)`).join("\n");
    const prompt = `You are writing short, plain-language explanations for a business sustainability screening tool used by Ekos, a New Zealand environmental consultancy. The tone is direct, practical, and grounded in near-term business risk and opportunity — not compliance jargon. Avoid the words "journey" and "holistic".

Business: ${businessName}
Sector: ${profile.sector}
Employees: ${profile.employees}
Revenue: ${profile.revenue}
Sites: ${profile.sites}
Offshore/overseas supply chain: ${profile.offshoreSupply}
Depends on natural resources as inputs: ${profile.natureInputs}
Physical sites exposed to weather risk: ${profile.weatherExposed}

Flagged priority areas:
${summaryLines}

For each flagged area write:
1. "why" — one or two sentences on why this specific business should pay attention here. Cover risk AND opportunity, not just risk — for climate specifically, where genuinely relevant, mention the competitive-advantage side too (cost savings from reduced energy/fuel use, brand and customer trust, easier compliance, opening new markets), not only exposure. Where it's genuinely relevant (most often climate, sometimes environment) you can also note that demonstrating mitigation action can support better terms with lenders and insurers — but only where it actually fits; don't force it into every pillar.
2. "quickWin" — one concrete, low-effort first action within a few months.

Return ONLY valid JSON, no markdown fences, in this exact shape:
{"climate": {"why": "...", "quickWin": "..."}, "environment": {...}}
Only include keys for the flagged areas, using ids exactly: climate, environment, nature, social, governance.`;

    try {
      const parsed = await callClaude({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] });
      setAiCopy(parsed);
      setAiState("done");
      saveSubmission(parsed);
    } catch (err) {
      console.error("AI copy generation failed:", err);
      setAiState("error");
    }
  }

  async function saveSubmission(finalAiCopy) {
    setSaveStatus("saving");
    try {
      const res = await fetch("/.netlify/functions/save-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, contactName, contactEmail, website, profile, answers, results, aiCopy: finalAiCopy }),
      });
      const data = await res.json();
      setSaveStatus(data.flow && data.flow.ok ? "done" : "error");
    } catch (err) {
      console.error("Save/email failed:", err);
      setSaveStatus("error");
    }
  }

  /* ---- render: intro ---- */
  function renderIntro() {
    return (
      <div className="panel panel--intro">
        <p className="eyebrow">Ekos · Sustainability screener</p>
        <h1>Find out what you might be overlooking — <em>before</em> it costs you.</h1>
        <p className="lede">
          Tell us who you are. We'll research your business and pre-fill our best guess
          at the answers — you check, edit, or override every single one before anything
          counts. About five minutes, no account needed. Businesses that can show they're
          actively managing these risks are also increasingly finding it easier to get
          favourable terms from banks and insurers — this is a first step toward that case.
        </p>
        <button className="btn btn--primary" onClick={goNext}>Start the screener</button>
      </div>
    );
  }

  /* ---- render: start (name + research) ---- */
  function renderStart() {
    return (
      <div className="panel">
        <p className="step-label">Let's start with who you are</p>
        <h2>Your business</h2>
        <p className="lede lede--tight">
          We'll look for public information about this business and use it to suggest
          answers throughout. Nothing is locked in — you review and confirm every field.
        </p>

        <label className="field">
          <span>Business name</span>
          <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Coastal Kitchen Ltd" />
        </label>
        <label className="field">
          <span>Website (optional, helps us find the right business)</span>
          <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="e.g. coastalkitchen.co.nz" />
        </label>
        <div className="field-grid">
          <label className="field">
            <span>Your name</span>
            <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Sam Taylor" />
          </label>
          <label className="field">
            <span>Your email</span>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@business.co.nz" />
          </label>
        </div>
        <p className="fine-print">
          We'll email you a copy of your results, and it's how an Ekos consultant would follow up if you want to go further.
        </p>

        {researchStatus === "loading" && <p className="ai-status">Researching {businessName || "your business"}…</p>}
        {researchStatus === "error" && (
          <p className="ai-status ai-status--error">Couldn't complete the research just now — you can retry, or fill everything in yourself.</p>
        )}
        {(researchStatus === "done" || researchStatus === "error") && debugInfo && (
          <div className="debug-block">
            <button type="button" className="debug-toggle" onClick={() => setShowDebug((s) => !s)}>
              {showDebug ? "Hide" : "Show"} what the AI actually found (debug)
            </button>
            {showDebug && <pre className="debug-pre">{debugInfo}</pre>}
          </div>
        )}

        <div className="nav-row">
          <button className="btn btn--ghost" onClick={goBack}>Back</button>
          <div style={{ display: "flex", gap: 10 }}>
            {researchStatus !== "done" && (
              <>
                <button className="btn btn--ghost" onClick={skipResearch} disabled={!startComplete()}>
                  I'll fill this in myself
                </button>
                <button className="btn btn--primary" onClick={runResearch} disabled={!startComplete() || researchStatus === "loading"}>
                  {researchStatus === "loading" ? "Researching…" : "Research my business"}
                </button>
              </>
            )}
            {researchStatus === "done" && (
              <>
                <button className="btn btn--ghost" onClick={runResearch}>Search again</button>
                <button className="btn btn--primary" onClick={goNext}>Continue</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---- render: profile ---- */
  function renderProfile() {
    return (
      <div className="panel">
        <p className="step-label">About {businessName || "your business"}</p>
        <h2>Confirm the profile</h2>
        <p className="lede lede--tight">
          {researchStatus === "done"
            ? "We've pre-filled what we could find. Check each one — edit anything that's off."
            : "Fill these in — this shapes everything that follows."}
        </p>

        {PROFILE_FIELDS.map((f) => {
          const aiShown = !!aiMeta.profile[f.key] && !touched.has(`profile.${f.key}`);
          return (
            <div className="question" key={f.key}>
              <div className="question__head">
                <p className="question__text">{f.question}</p>
                <AiBadge show={aiShown} />
              </div>
              {aiShown && <p className="question__rationale">{aiMeta.profile[f.key]}</p>}
              {f.kind === "select" && (
                <select value={profile[f.key]} onChange={(e) => setProfileField(f.key, e.target.value)}>
                  <option value="">Select</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
              {f.kind === "number" && (
                <input type="number" min="0" value={profile[f.key]} onChange={(e) => setProfileField(f.key, e.target.value)} placeholder="e.g. 3" />
              )}
              {f.kind === "yesno" && <YesNo value={profile[f.key]} onChange={(v) => setProfileField(f.key, v)} />}
            </div>
          );
        })}

        <div className="nav-row">
          <button className="btn btn--ghost" onClick={goBack}>Back</button>
          <button className="btn btn--primary" onClick={goNext} disabled={!profileComplete()}>Continue</button>
        </div>
      </div>
    );
  }

  /* ---- render: pillar ---- */
  function renderPillar(pillar) {
    return (
      <div className="panel">
        <p className="step-label">{pillar.label}</p>
        <h2>{pillar.tagline}</h2>
        {pillar.questions.map((q) => {
          const key = `${pillar.id}.${q.id}`;
          const aiShown = !!(aiMeta.pillars[pillar.id] && aiMeta.pillars[pillar.id][q.id]) && !touched.has(key);
          return (
            <Question
              key={q.id}
              q={q}
              value={answers[pillar.id][q.id]}
              onChange={(v) => setAnswer(pillar.id, q.id, v)}
              aiRationale={aiShown ? aiMeta.pillars[pillar.id][q.id] : null}
              showBadge={aiShown}
            />
          );
        })}
        <div className="nav-row">
          <button className="btn btn--ghost" onClick={goBack}>Back</button>
          <button className="btn btn--primary" onClick={goNext} disabled={!pillarComplete(pillar.id)}>Continue</button>
        </div>
      </div>
    );
  }

  /* ---- render: results ---- */
  function renderResults() {
    const order = ["High", "Medium", "Low"];
    const sorted = [...PILLARS].sort((a, b) => order.indexOf(results[a.id].level) - order.indexOf(results[b.id].level));
    const flaggedCount = PILLARS.filter((p) => results[p.id].level !== "Low").length;

    return (
      <div className="panel panel--results">
        <p className="step-label">Your priority map</p>
        <h2>{businessName || "Your business"}</h2>
        <p className="lede lede--tight">
          {flaggedCount > 0 ? `${flaggedCount} of 5 areas show meaningful exposure. Here's where to focus first.` : "Nothing urgent flagged right now — worth a light check-in again as your business changes."}
        </p>

        {aiState === "done" && (
          <p className="ai-status">
            {saveStatus === "saving" && `Sending a copy to ${contactEmail}…`}
            {saveStatus === "done" && `Sent — check ${contactEmail} for your copy.`}
            {saveStatus === "error" && (
              <>
                Couldn't email your results just now.
                <button className="btn btn--ghost btn--small" onClick={() => saveSubmission(aiCopy)}>Retry</button>
              </>
            )}
          </p>
        )}

        <div className="financing-note">
          <p>
            <strong>Why this is worth acting on, not just knowing:</strong> lenders and
            insurers are increasingly factoring climate and sustainability exposure into
            their terms. Businesses that can demonstrate real mitigation action are better
            placed for more favourable financing and insurance conditions — this map is
            the starting point for that case.
          </p>
        </div>

        {aiState === "idle" && <button className="btn btn--primary" onClick={generateAICopy}>Generate my results</button>}
        {aiState === "loading" && <p className="ai-status">Putting your results together…</p>}
        {aiState === "error" && (
          <p className="ai-status ai-status--error">
            Couldn't generate the detailed explanations right now.
            <button className="btn btn--ghost btn--small" onClick={generateAICopy}>Retry</button>
          </p>
        )}

        {(aiState === "done" || aiState === "error") && (
          <div className="results-list">
            {sorted.map((p) => {
              const r = results[p.id];
              const copy = aiCopy && aiCopy[p.id];
              return (
                <div key={p.id} className="result-card" data-level={r.level}>
                  <div className="result-card__head">
                    <span className="result-card__level">{r.level} priority</span>
                    <span className="result-card__name">{p.label}</span>
                  </div>
                  {copy ? (
                    <>
                      <p className="result-card__why">{copy.why}</p>
                      <p className="result-card__win"><strong>Quick win: </strong>{copy.quickWin}</p>
                    </>
                  ) : (
                    <p className="result-card__why">
                      {r.level === "Low" ? "Lower priority right now — no immediate action needed." : "Worth a closer look — talk to us about what this means for you."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {aiState === "done" && (
          <div className="cta-block">
            <p>This is a first screen, not a full assessment. An Ekos consultant can work through your flagged areas with you and build an action plan.</p>
            <button className="btn btn--primary">Talk to Ekos about this</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        .app { font-family: 'Inter', sans-serif; background: ${T.bg}; color: ${T.ink}; min-height: 100%; padding: 32px 20px 64px; display: flex; flex-direction: column; align-items: center; }
        .rail { width: 100%; max-width: 640px; display: flex; gap: 6px; margin-bottom: 28px; }
        .rail__seg { flex: 1; height: 3px; background: ${T.line}; border-radius: 2px; overflow: hidden; }
        .rail__seg--fill { background: ${T.forest}; }
        .panel { width: 100%; max-width: 640px; background: ${T.surface}; border: 1px solid ${T.line}; border-radius: 4px; padding: 40px; }
        .panel--intro { text-align: left; padding: 48px 40px; }
        .eyebrow { font-size: 13px; letter-spacing: 0.02em; color: ${T.gold}; margin: 0 0 14px; font-weight: 500; }
        h1 { font-family: 'Fraunces', serif; font-weight: 500; font-size: 34px; line-height: 1.18; margin: 0 0 18px; color: ${T.forest}; max-width: 22ch; }
        h1 em { font-style: italic; color: ${T.gold}; }
        h2 { font-family: 'Fraunces', serif; font-weight: 500; font-size: 24px; line-height: 1.3; margin: 4px 0 10px; color: ${T.forest}; }
        .step-label { font-size: 13px; color: ${T.inkSoft}; margin: 0 0 4px; font-weight: 500; }
        .lede { font-size: 16px; line-height: 1.55; color: ${T.inkSoft}; max-width: 48ch; margin: 0 0 28px; }
        .lede--tight { margin-bottom: 22px; }
        .btn { font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 500; padding: 12px 22px; border-radius: 3px; border: 1px solid transparent; cursor: pointer; transition: opacity 0.15s ease, transform 0.1s ease; }
        .btn:active { transform: translateY(1px); }
        .btn--primary { background: ${T.forest}; color: #fff; }
        .btn--primary:hover { opacity: 0.9; }
        .btn--primary:disabled { background: #A9B3AC; cursor: not-allowed; }
        .btn--ghost { background: transparent; color: ${T.ink}; border-color: ${T.line}; }
        .btn--ghost:hover { border-color: ${T.forest}; }
        .btn--ghost:disabled { color: #AAB3AC; cursor: not-allowed; }
        .btn--small { padding: 6px 14px; font-size: 13px; margin-left: 12px; }
        .field { display: block; margin-bottom: 18px; }
        .field span { display: block; font-size: 13px; color: ${T.inkSoft}; margin-bottom: 6px; font-weight: 500; }
        .field input, .field select { width: 100%; font-family: 'Inter', sans-serif; font-size: 15px; padding: 11px 12px; border: 1px solid ${T.line}; border-radius: 3px; background: #fff; color: ${T.ink}; }
        .field input:focus, .field select:focus { outline: 2px solid ${T.forestLight}; outline-offset: 1px; }
        .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .fine-print { font-size: 12.5px; color: ${T.inkSoft}; margin: -8px 0 22px; }
        .financing-note { background: #F3EEE1; border: 1px solid ${T.line}; border-left: 3px solid ${T.gold}; border-radius: 3px; padding: 16px 18px; margin: 0 0 24px; }
        .financing-note p { font-size: 14px; line-height: 1.5; color: ${T.ink}; margin: 0; }
        .financing-note strong { color: ${T.forest}; }
        .debug-block { margin-top: 16px; }
        .debug-toggle { background: none; border: none; color: ${T.inkSoft}; font-size: 12.5px; text-decoration: underline; cursor: pointer; padding: 0; }
        .debug-pre { margin-top: 10px; background: #EFEEE8; border: 1px solid ${T.line}; border-radius: 3px; padding: 12px 14px; font-size: 11.5px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; max-height: 320px; overflow-y: auto; color: ${T.ink}; }
        .question { margin: 22px 0; }
        .question__head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .question__text { font-size: 15.5px; line-height: 1.5; margin: 0 0 6px; color: ${T.ink}; }
        .question__rationale { font-size: 13px; line-height: 1.5; color: ${T.inkSoft}; font-style: italic; margin: 0 0 10px; }
        select.question__text-sibling {}
        .ai-badge { font-size: 11px; font-weight: 600; color: ${T.gold}; border: 1px solid ${T.gold}; border-radius: 999px; padding: 2px 9px; white-space: nowrap; }
        .choice-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
        .choice { font-family: 'Inter', sans-serif; font-size: 14px; padding: 9px 18px; border-radius: 999px; border: 1px solid ${T.line}; background: #fff; color: ${T.ink}; cursor: pointer; }
        .choice:hover { border-color: ${T.forestLight}; }
        .choice--active { background: ${T.forest}; border-color: ${T.forest}; color: #fff; }
        .nav-row { display: flex; justify-content: space-between; margin-top: 32px; padding-top: 24px; border-top: 1px solid ${T.line}; }
        .ai-status { font-size: 14px; color: ${T.inkSoft}; margin: 14px 0 0; }
        .ai-status--error { color: ${T.high}; }
        .results-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }
        .result-card { border: 1px solid ${T.line}; border-left: 3px solid ${T.low}; border-radius: 3px; padding: 18px 20px; }
        .result-card[data-level="High"] { border-left-color: ${T.high}; }
        .result-card[data-level="Medium"] { border-left-color: ${T.medium}; }
        .result-card[data-level="Low"] { border-left-color: ${T.low}; }
        .result-card__head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
        .result-card__level { font-size: 12px; font-weight: 600; color: ${T.inkSoft}; }
        .result-card__name { font-family: 'Fraunces', serif; font-size: 18px; color: ${T.forest}; }
        .result-card__why { font-size: 14.5px; line-height: 1.5; margin: 0 0 8px; color: ${T.ink}; }
        .result-card__win { font-size: 14px; line-height: 1.5; margin: 0; color: ${T.inkSoft}; }
        .cta-block { border-top: 1px solid ${T.line}; padding-top: 24px; text-align: left; }
        .cta-block p { font-size: 14.5px; color: ${T.inkSoft}; margin: 0 0 16px; max-width: 48ch; }
        @media (max-width: 560px) {
          .panel { padding: 28px 22px; }
          h1 { font-size: 27px; }
          .field-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {step !== "intro" && (
        <div className="rail">
          {STEPS.slice(1).map((s, i) => (
            <div key={s} className="rail__seg">
              <div className="rail__seg--fill" style={{ height: "100%", width: i <= stepIndex - 1 ? "100%" : "0%" }} />
            </div>
          ))}
        </div>
      )}

      {step === "intro" && renderIntro()}
      {step === "start" && renderStart()}
      {step === "profile" && renderProfile()}
      {currentPillar && renderPillar(currentPillar)}
      {step === "results" && renderResults()}
    </div>
  );
}
