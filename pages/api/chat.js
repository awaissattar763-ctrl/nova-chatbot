import Groq from "groq-sdk";

export const config = {
  runtime: 'edge',
};

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
      headers: { "Content-Type": "application/json" }
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[Nova] Missing GROQ_API_KEY environment variable");
    return new Response(JSON.stringify({ error: "API configuration error on server" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const groq = new Groq({ 
    apiKey,
    maxRetries: 3 
  });

  try {
    const body = await req.json();
    const { messages } = body;

    console.log("[Nova] Incoming request with", messages?.length, "messages");

    if (!messages || !Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid messages array" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.time("[Nova] GroqAPI_Latency");

    const completionStream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
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
        } catch (error) {
          console.error("[Nova] Stream generation error:", error);
          controller.error(error);
        } finally {
          console.timeEnd("[Nova] GroqAPI_Latency");
        }
      }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      }
    });

  } catch (error) {
    console.error("[Nova] Error processing request:", error?.message || error);

    // Distinguish error types for easier diagnosis
    const message = error?.message || "";
    const isAuthError = message.includes("401") || message.includes("api_key") || message.includes("authentication") || message.includes("Unauthorized");
    const isRateLimit = message.includes("429") || message.includes("rate_limit");
    const isModelError = message.includes("model") || message.includes("404");

    const errorBody = isAuthError
      ? { error: "Invalid or missing GROQ_API_KEY. Check Vercel environment variables.", code: "AUTH_ERROR" }
      : isRateLimit
      ? { error: "Groq rate limit reached. Please try again in a moment.", code: "RATE_LIMIT" }
      : isModelError
      ? { error: "Groq model error. The requested model may be unavailable.", code: "MODEL_ERROR" }
      : { error: "Groq API error. Please try again.", code: "API_ERROR", detail: message.slice(0, 120) };

    return new Response(JSON.stringify(errorBody), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
