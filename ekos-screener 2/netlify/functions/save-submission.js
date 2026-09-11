// Receives a completed screener submission from the frontend and fans it out to:
//   1. A Google Apps Script Web App (see README) — the script is expected to append
//      a row to a Google Sheet AND send the results email via Gmail from whichever
//      Google account owns the script. This is the primary path: one script, no
//      extra vendor, works with any Google account.
//   2. Mailchimp (optional) — adds/updates the contact in an audience for future
//      marketing follow-up. Best-effort: if it's not configured or fails, the
//      submission still succeeds via the Google Sheet/email step.

const PILLAR_LABELS = {
  climate: "Climate",
  environment: "Environment",
  nature: "Nature",
  social: "Social",
  governance: "Governance",
};
const LEVEL_ORDER = ["High", "Medium", "Low"];

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

  const { businessName, contactName, contactEmail, website, profile, results, aiCopy } = body;
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
    sector: profile?.sector || "",
    employees: profile?.employees || "",
    revenue: profile?.revenue || "",
    sites: profile?.sites || "",
    climateLevel: results?.climate?.level || "",
    environmentLevel: results?.environment?.level || "",
    natureLevel: results?.nature?.level || "",
    socialLevel: results?.social?.level || "",
    governanceLevel: results?.governance?.level || "",
    summaryText,
    emailSubject: subject,
    emailHtmlBody: htmlBody,
  };

  const [sheet, mailchimp] = await Promise.all([
    sendToGoogleSheet(sheetPayload),
    addToMailchimp({ contactName, contactEmail, businessName }),
  ]);

  return new Response(JSON.stringify({ flow: sheet, mailchimp }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
