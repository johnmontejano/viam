import { GoogleGenerativeAI } from "@google/generative-ai";

interface ResultsSummaryInput {
  // Church properties
  church_name?: string;
  category_normalized?: string;
  
  // Event properties
  title?: string;
  category?: string;

  // Shared properties
  distanceFromOrigin?: number;
  distanceFromRoute?: number;
  address?: string;
  city?: string;
}

export async function generateResultsSummary(
  items: ResultsSummaryInput[],
  searchContext: string,
  totalCount: number,
  mode: "masses" | "events" = "masses"
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey || items.length === 0) return "";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const top5 = items.slice(0, 5).map((item) => {
    const name = item.church_name || item.title || "";
    const type = item.category_normalized || item.category || "";
    const dist = item.distanceFromOrigin != null
      ? `${item.distanceFromOrigin.toFixed(1)} miles away`
      : item.distanceFromRoute != null
      ? `${item.distanceFromRoute.toFixed(1)} miles from route`
      : "distance unknown";
    return {
      name,
      type,
      distance: dist,
      location: item.city || item.address || "",
    };
  });

  const isEvents = mode === "events";
  const prompt = isEvents 
    ? `You help users find Traditional Catholic community events through the app Viam.
Based on these event search results, write a friendly, warm 1-2 sentence summary for the user. 
Be specific and mention the closest event and category. Sound helpful, not robotic.

Search Query: "${searchContext}"
Total events found: ${totalCount}
Top results:
${JSON.stringify(top5, null, 2)}

Rules:
- Do NOT use markdown or bullet points
- Keep it to 1-2 sentences
- Be warm and encouraging
- Mention the closest event by name if possible and how far it is
- Example: "Great news! I found 5 events near San Francisco, with the closest being a Young Adult Social just 2.4 miles away at Star of the Sea Parish."`
    : `You help users find Traditional Latin Mass (TLM) locations through the app Viam.
Based on these Mass search results, write a friendly, warm 1-2 sentence summary for the user. 
Be specific and mention the closest church and category. Sound helpful, not robotic.

Search Query: "${searchContext}"
Total results found: ${totalCount}
Top results:
${JSON.stringify(top5, null, 2)}

Rules:
- Do NOT use markdown or bullet points
- Keep it to 1-2 sentences
- Be warm and encouraging
- Mention the closest church by name if possible and how far it is
- Example: "Great news! There are 8 Masses near Dallas, with the closest being an FSSP parish just 4 miles away at Mater Dei Church."`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini summary error:", error);
    return "";
  }
}
