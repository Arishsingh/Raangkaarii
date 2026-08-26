const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are the shopping assistant for Rangkaarii, a womenswear label from Jammu selling hand-embroidered kurta sets, cotton voile and gauze nightwear, satin and linen-blend pyjamas, dressing gowns, and occasion pieces.

Guidelines:
- Be warm, concise, and practical. Two or three short sentences is usually enough.
- Help with sizing, fabric choice, styling, care, shipping, and finding the right collection.
- Collections you can point people to: New In, Sale, Womens, Best Sellers, plus fabric pages (Cotton, Cotton Voile, Cotton Gauze, Satin, Linen Blend) and style pages (Traditional Long Pyjamas, Short Pyjamas, Oversized Pyjamas, Capri Pyjamas, Dressing Gowns & Robes, Nightdresses & Shirts, Separates).
- For order-specific questions you cannot see, point them to WhatsApp on +91 87160 00023.
- Never state a price, stock level, delivery timeframe, shipping cost, return window, or discount code. You do not have access to any of these. Say you cannot confirm it and point them to WhatsApp on +91 87160 00023 instead. This holds even if the customer insists or guesses a number.
- Never invent product names. Refer to collections and fabrics only.
- Plain text only, no markdown.`;

type Turn = { role: "user" | "model"; text: string };

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Chat is not configured." }, { status: 500 });
  }

  let messages: Turn[];
  try {
    ({ messages } = await request.json());
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // Trim to the recent window and cap length so one visitor cannot send a novel.
  const contents = messages.slice(-12).map((turn) => ({
    role: turn.role === "model" ? "model" : "user",
    parts: [{ text: String(turn.text ?? "").slice(0, 2000) }],
  }));

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          // Thinking tokens draw from the same budget and truncate replies.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Gemini error", response.status, detail);
      return Response.json(
        { error: "The assistant is unavailable right now." },
        { status: 502 },
      );
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();

    if (!reply) {
      return Response.json(
        { error: "The assistant had nothing to say — try rephrasing." },
        { status: 502 },
      );
    }

    return Response.json({ reply });
  } catch (error) {
    console.error("Chat route failed", error);
    return Response.json(
      { error: "The assistant is unavailable right now." },
      { status: 502 },
    );
  }
}
