import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiModelName() {
  const isProduction = process.env.NODE_ENV === "production";
  return process.env.GEMINI_MODEL || (isProduction ? "gemini-2.5-flash" : "gemini-2.5-flash-lite");
}

export async function callGeminiAPI(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set. Using fallback.");
    return null;
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = getGeminiModelName();
    console.log(`Using Gemini model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.8,
        thinkingConfig: {
          thinkingBudget: 0, // 思考機能を無効化
        },
      },
    });

    const response = await result.response;
    const text = response.text();
    return text?.trim() || null;
  } catch (error) {
    console.error("💥 Gemini API Error:", error.message || error);
    if (error.response) {
      console.error("📋 Error response:", error.response);
    }
    return null;
  }
}
