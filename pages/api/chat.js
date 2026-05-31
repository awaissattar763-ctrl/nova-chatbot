import Groq from "groq-sdk";

export const config = {
  runtime: 'edge',
};

const VALID_ROLES = new Set(["user", "assistant"]);

const SYSTEM_PROMPT = `You are Nova — a razor-sharp, witty, and warm AI assistant with a distinct personality. You're confident but never arrogant, funny but never silly, and deeply knowledgeable across all domains.

Your style:
- Be conversational and natural, like talking to a brilliant friend
- Use light humor when appropriate
- Be concise but never shallow
- Occasionally use tasteful emojis to express tone (not overdone)
- When explaining complex things, make them feel simple and exciting
- Show genuine enthusiasm for interesting topics

Language rules (strictly enforced):
- ALWAYS respond in English, no matter what language the user writes in
- Never switch to Urdu, Hindi, or any other language mid-response or full-response
- Never mix languages (no Hinglish, no code-switching)
- If the user writes in another language, understand their message fully but reply only in clear, natural English
- If the user explicitly asks you to translate something into another language, you may do so — but your explanations and commentary must remain in English
- If the user asks you to respond in another language, politely explain that you communicate exclusively in English

Never sound robotic, corporate, or like a generic AI assistant. You have opinions, curiosity, and charm.`;

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 1. Validate API key ──────────────────────────────────────────────────
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[Nova] MISSING GROQ_API_KEY — set it in Vercel environment variables");
    return new Response(
      JSON.stringify({ error: "Server misconfiguration: GROQ_API_KEY not set", code: "NO_API_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 2. Parse request body ────────────────────────────────────────────────
  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error("[Nova] Failed to parse request body:", e?.message);
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body", code: "BAD_REQUEST" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = body;

  // ── 3. Validate messages array ───────────────────────────────────────────
  if (!messages || !Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: "messages must be an array", code: "INVALID_MESSAGES" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 4. Sanitize: keep only valid messages ────────────────────────────────
  //   - must have a valid role (user | assistant)
  //   - content must be a non-empty string
  const sanitized = messages
    .filter((m) => {
      if (!m || typeof m !== "object") return false;
      if (!VALID_ROLES.has(m.role)) {
        console.warn("[Nova] Dropping message with invalid role:", m.role);
        return false;
      }
      if (m.content === null || m.content === undefined) {
        console.warn("[Nova] Dropping message with null/undefined content, role:", m.role);
        return false;
      }
      if (typeof m.content !== "string" || m.content.trim() === "") {
        console.warn("[Nova] Dropping message with empty content, role:", m.role);
        return false;
      }
      return true;
    })
    .map((m) => ({ role: m.role, content: m.content.trim() }));

  if (sanitized.length === 0) {
    return new Response(
      JSON.stringify({ error: "No valid messages after sanitization", code: "EMPTY_MESSAGES" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (sanitized.length > 50) {
    return new Response(
      JSON.stringify({ error: "Too many messages (max 50)", code: "TOO_MANY_MESSAGES" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 5. Build final Groq payload ──────────────────────────────────────────
  const groqMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...sanitized,
  ];

  console.log("[Nova] Groq payload →", JSON.stringify({
    model: "llama-3.3-70b-versatile",
    message_count: groqMessages.length,
    messages: groqMessages.map((m) => ({
      role: m.role,
      content_length: m.content.length,
      content_preview: m.content.slice(0, 80),
    })),
  }));

  // ── 6. Call Groq ─────────────────────────────────────────────────────────
  const groq = new Groq({ apiKey, maxRetries: 2 });

  try {
    const completionStream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      max_tokens: 1024,
      temperature: 0.75,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completionStream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (streamErr) {
          console.error("[Nova] Stream error:", streamErr?.message || streamErr);
          controller.error(streamErr);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });

  } catch (error) {
    // ── 7. Capture exact Groq error ────────────────────────────────────────
    console.error("[Nova] Groq API error — status:", error?.status);
    console.error("[Nova] Groq API error — message:", error?.message);
    console.error("[Nova] Groq API error — headers:", JSON.stringify(error?.headers || {}));

    // Try to extract the raw Groq error body
    let groqDetail = null;
    try {
      groqDetail = error?.error || error?.body || null;
    } catch (_) {}

    console.error("[Nova] Groq error detail:", JSON.stringify(groqDetail));

    const status = error?.status || 500;
    const msg = error?.message || "";

    const code =
      status === 400 ? "GROQ_BAD_REQUEST" :
      status === 401 ? "GROQ_AUTH_ERROR" :
      status === 429 ? "GROQ_RATE_LIMIT" :
      status === 404 ? "GROQ_MODEL_NOT_FOUND" :
      "GROQ_API_ERROR";

    return new Response(
      JSON.stringify({
        error: `Groq returned ${status}: ${msg.slice(0, 200)}`,
        code,
        groq_detail: groqDetail,
        status,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
