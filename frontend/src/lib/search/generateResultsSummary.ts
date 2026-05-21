import { GoogleGenerativeAI } from "@google/generative-ai";

interface ChurchSummaryInput {
  church_name: string;
  category_normalized: string;
  distanceFromOrigin?: number;
  distanceFromRoute?: number;
  address?: string;
  city?: string;
}

export async function generateResultsSummary(
  churches: ChurchSummaryInput[],
  searchContext: string,
  totalCount: number
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey || churches.length === 0) return "";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const top5 = churches.slice(0, 5).map((c) => ({
    name: c.church_name,
    type: c.category_normalized,
    distance: c.distanceFromOrigin != null
      ? `${c.distanceFromOrigin.toFixed(1)} miles away`
      : c.distanceFromRoute != null
      ? `${c.distanceFromRoute.toFixed(1)} miles from route`
      : "distance unknown",
    location: c.city || c.address || "",
  }));

  const prompt = `You help users find Traditional Latin Mass (TLM) locations through the app Viam.
Based on these search results, write a friendly, warm 1-2 sentence summary for the user. 
Be specific and mention the closest church and category. Sound helpful, not robotic.

Search: "${searchContext}"
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
