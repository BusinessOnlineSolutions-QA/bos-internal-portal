// Cloudflare Worker entry point.
// Handles /api/send-otp server-side (so the internal OTP API's URL never
// ships to the browser), and serves the built React app for everything else.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/send-otp" && request.method === "POST") {
      return handleSendOtp(request, env);
    }

    // Everything else: serve the static build (index.html, JS, CSS, etc.)
    return env.ASSETS.fetch(request);
  },
};

async function handleSendOtp(request, env) {
  let mobile;
  try {
    const body = await request.json();
    mobile = body.mobile;
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return json({ error: "Enter a valid 10-digit mobile number" }, 400);
  }

  if (!env.OTP_API_URL) {
    return json({ error: "OTP_API_URL is not configured on the server" }, 500);
  }

  let upstream;
  try {
    upstream = await fetch(env.OTP_API_URL, {
      method: "POST",
      headers: {
        accept: "*/*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobileOrEmailID: mobile,
        // Adjust via the OTP_TYPE secret/var if your API expects a different value
        otP_Type: env.OTP_TYPE || "Mobile",
      }),
    });
  } catch (e) {
    return json({ error: "Could not reach the OTP API" }, 502);
  }

  let data;
  try {
    data = await upstream.json();
  } catch {
    return json({ error: "OTP API returned an unexpected response" }, 502);
  }

  // Their API returns: { "statuss": "True", "message": "...", "value": "6193" }
  const ok = String(data.statuss).toLowerCase() === "true";
  if (!ok) {
    return json({ error: data.message || "Failed to send OTP" }, 502);
  }

  return json({ otp: data.value, message: data.message });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
