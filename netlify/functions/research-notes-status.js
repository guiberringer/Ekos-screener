// Fast, regular function (no "-background" suffix, so it responds immediately).
// The frontend calls this every couple of seconds with a jobId, until the
// background function has written a result for it.

import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return new Response(JSON.stringify({ status: "error", message: "Missing jobId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const store = getStore("research-jobs");
  const result = await store.get(jobId, { type: "json" });

  if (!result) {
    return new Response(JSON.stringify({ status: "pending" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
