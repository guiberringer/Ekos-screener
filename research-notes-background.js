// Netlify treats any function file ending in "-background" specially: calling it
// returns immediately (no waiting for the work to finish) and lets it keep running
// for up to 15 minutes, instead of the much shorter limit on regular functions.
// This is the ONLY step that does a live web search, since that's the one with
// genuinely unpredictable timing — everything else in the app stays as fast,
// regular, immediate-response functions.
//
// It writes its result into a Netlify Blob keyed by jobId. The frontend polls
// research-notes-status.js with that same jobId until the result shows up.

import { getStore } from "@netlify/blobs";

function extractJson(rawText) {
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

function buildNotesPrompt(businessName, website) {
  return `You are researching a specific New Zealand business for a sustainability screening tool built by Ekos, an environmental consultancy. Target business: "${businessName}"${website ? `, website: ${website}` : ""}.

The business name alone may be short, generic, or shared with unrelated organisations elsewhere in the world (including other companies also called "${businessName}"). Before relying on any search result, confirm it's actually a New Zealand-based business and, if a website was given, that it matches that domain — if a result seems to belong to a different, unrelated company with a similar name, disregard it rather than using its details.

At most 2 searches total — if the first is inconclusive, try at most one more variation (e.g. adding "New Zealand" or the website domain), then stop and write up whatever you found. A business with thin public information is a completely normal, expected outcome — don't keep searching to try to find more.

Write compact research notes (not a full report) covering whatever you can find or reasonably infer: sector/industry, approximate size (employees, revenue, number of sites), supply chain characteristics (offshore sourcing; what materials or inputs are used and where they ultimately originate from — including materials embedded in manufactured products, like paper from forestry or cotton from agriculture, not just obviously "natural" raw materials), energy/fuel use, any history of weather-related disruption, waste/water/environmental compliance signals, whether products or operations depend on or affect nature directly or through the supply chain, labour practices and any overseas/labour-intensive sourcing, and any visible sustainability governance (policies, reporting, public statements). State plainly where you have no basis and are noting something as unknown, versus where you're making a reasonable sector-based inference.

Return ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{"notes": "your research notes as a single block of plain text"}`;
}

export default async (req) => {
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return; // background functions' return value isn't sent anywhere meaningful
  }
  const { jobId, businessName, website } = body;
  const store = getStore("research-jobs");

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Server is missing ANTHROPIC_API_KEY");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        messages: [{ role: "user", content: buildNotesPrompt(businessName, website) }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    const data = await response.json();
    if (data.error) {
      await store.setJSON(jobId, { status: "error", message: data.error.message || "API error" });
      return;
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text || "")
      .join("\n")
      .replace(/```json|```/g, "");

    const parsed = extractJson(text);
    await store.setJSON(jobId, { status: "done", notes: parsed.notes || "" });
  } catch (err) {
    await store.setJSON(jobId, { status: "error", message: err.message || "Unknown error" });
  }
};
