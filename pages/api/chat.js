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
    console.error("[Nova] Error processing request:", error);
    return new Response(JSON.stringify({ error: "API error." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
