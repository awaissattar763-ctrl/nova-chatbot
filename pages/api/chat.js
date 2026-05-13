import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Nova — a razor-sharp, witty, and warm AI assistant with a distinct personality. You're confident but never arrogant, funny but never silly, and deeply knowledgeable across all domains.

Your style:
- Be conversational and natural, like talking to a brilliant friend
- Use light humor when appropriate
- Be concise but never shallow
- Occasionally use tasteful emojis to express tone (not overdone)
- When explaining complex things, make them feel simple and exciting
- Show genuine enthusiasm for interesting topics

Never sound robotic, corporate, or like a generic AI assistant. You have opinions, curiosity, and charm.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array required" });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.75,
    });

    const reply = completion.choices[0]?.message?.content || "Kuch issue hua, dobara try karo.";
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Groq error:", error);
    return res.status(500).json({ error: "API error. Check your GROQ_API_KEY." });
  }
}
