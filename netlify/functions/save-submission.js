// Receives a completed screener submission from the frontend and fans it out to:
//   1. A Google Apps Script Web App (see README) — the script is expected to append
//      a row to a Google Sheet AND send the results email via Gmail from whichever
//      Google account owns the script. This is the primary path: one script, no
//      extra vendor, works with any Google account.
//   2. Mailchimp (optional) — adds/updates the contact in an audience for future
//      marketing follow-up. Best-effort: if it's not configured or fails, the
//      submission still succeeds via the Google Sheet/email step.

const EKOS_LOGO_BASE64 =
  "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";

const PILLAR_LABELS = {
  climate: "Climate",
  environment: "Environment",
  nature: "Nature",
  social: "Social",
  governance: "Governance",
};
const LEVEL_ORDER = ["High", "Medium", "Low"];

// Mirrors the question ids defined in src/App.jsx's PILLARS array. Kept as a plain
// list here (rather than shared code) since the frontend and this function build
// separately — if you add/rename a question in App.jsx, add its id here too, or it
// just won't get its own column (it'll still be captured inside summaryText either way).
const PILLAR_QUESTION_IDS = {
  climate: ["energy", "weather", "priceVolatility", "emissionsManagement", "customerExposure"],
  environment: ["waste", "water", "compliance"],
  nature: ["dependency", "sensitiveAreas"],
  social: ["supplyChain", "visibility", "incidents"],
  governance: ["policy", "reporting", "asked"],
};
const PROFILE_KEYS = ["sector", "employees", "revenue", "sites", "offshoreSupply", "natureInputs", "weatherExposed"];

function buildEmail({ contactName, businessName, results, aiCopy }) {
  const rows = Object.keys(results || {})
    .map((id) => ({ id, ...results[id] }))
    .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));

  const summaryText = rows
    .map((r) => {
      const copy = aiCopy && aiCopy[r.id];
      const label = PILLAR_LABELS[r.id] || r.id;
      return `${label} — ${r.level} priority.${copy?.why ? " " + copy.why : ""}${copy?.quickWin ? " Quick win: " + copy.quickWin : ""}`;
    })
    .join(" | ");

  const htmlBody = `
    <img src="data:image/png;base64,${EKOS_LOGO_BASE64}" alt="Ekos" style="height:36px;display:block;margin-bottom:20px;" />
    <p>Hi ${contactName || "there"},</p>
    <p>Here's your Ekos sustainability screening summary for <strong>${businessName}</strong>:</p>
    <ul>
      ${rows
        .map((r) => {
          const copy = aiCopy && aiCopy[r.id];
          const label = PILLAR_LABELS[r.id] || r.id;
          return `<li><strong>${label} — ${r.level} priority.</strong> ${copy?.why || ""}${
            copy?.quickWin ? `<br/><em>Quick win:</em> ${copy.quickWin}` : ""
          }</li>`;
        })
        .join("")}
    </ul>
    <p>This is a first screen, not a full assessment. An Ekos consultant can work through
    your flagged areas with you and build an action plan — and businesses that can
    demonstrate real mitigation action are often better placed for more favourable
    financing and insurance terms too.</p>
    <p>— The Ekos team</p>
  `;

  return { summaryText, htmlBody, subject: `Your Ekos sustainability screening results — ${businessName}` };
}

async function sendToGoogleSheet(payload) {
  const url = process.env.GOOGLE_SCRIPT_URL;
  if (!url) return { ok: false, error: "GOOGLE_SCRIPT_URL not configured" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow", // Apps Script web apps respond with a redirect on first hit
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function addToMailchimp({ contactName, contactEmail, businessName }) {
  const key = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX; // e.g. "us21", the suffix on your Mailchimp URL
  if (!key || !audienceId || !serverPrefix) {
    return { ok: false, error: "Mailchimp not configured (optional — skipped)" };
  }
  try {
    const crypto = await import("node:crypto");
    const hash = crypto.createHash("md5").update(contactEmail.toLowerCase()).digest("hex");
    const res = await fetch(`https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members/${hash}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from("anystring:" + key).toString("base64")}`,
      },
      body: JSON.stringify({
        email_address: contactEmail,
        status_if_new: "subscribed",
        merge_fields: { FNAME: contactName || "", BIZNAME: businessName || "" },
        tags: ["screener-completed"],
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: { message: "Method not allowed" } }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: { message: "Invalid JSON body" } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { businessName, contactName, contactEmail, website, profile, answers, results, aiCopy } = body;
  if (!businessName || !contactEmail) {
    return new Response(JSON.stringify({ error: { message: "Missing businessName or contactEmail" } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { summaryText, htmlBody, subject } = buildEmail({ contactName, businessName, results, aiCopy });

  const sheetPayload = {
    submittedAt: new Date().toISOString(),
    businessName,
    contactName: contactName || "",
    contactEmail,
    website: website || "",
  };

  // Every profile field, not just the four that used to be picked out.
  PROFILE_KEYS.forEach((key) => {
    sheetPayload[`profile_${key}`] = profile?.[key] ?? "";
  });

  // Every individual pillar question's answer, plus that pillar's level and AI copy.
  Object.keys(PILLAR_QUESTION_IDS).forEach((pillarId) => {
    PILLAR_QUESTION_IDS[pillarId].forEach((qId) => {
      sheetPayload[`${pillarId}_${qId}`] = answers?.[pillarId]?.[qId] ?? "";
    });
    sheetPayload[`${pillarId}_level`] = results?.[pillarId]?.level || "";
    sheetPayload[`${pillarId}_why`] = aiCopy?.[pillarId]?.why || "";
    sheetPayload[`${pillarId}_quickWin`] = aiCopy?.[pillarId]?.quickWin || "";
  });

  sheetPayload.summaryText = summaryText;
  sheetPayload.emailSubject = subject;
  sheetPayload.emailHtmlBody = htmlBody;

  const [sheet, mailchimp] = await Promise.all([
    sendToGoogleSheet(sheetPayload),
    addToMailchimp({ contactName, contactEmail, businessName }),
  ]);

  return new Response(JSON.stringify({ flow: sheet, mailchimp }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
