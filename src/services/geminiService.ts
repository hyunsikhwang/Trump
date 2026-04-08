import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function translateToKorean(text: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following English text from Donald Trump's Telegram channel into natural, professional Korean. Maintain the original tone and meaning. Only provide the translation.\n\nText: ${text}`,
    });

    return response.text || "번역 실패";
  } catch (error) {
    console.error("Translation error:", error);
    return "번역 중 오류가 발생했습니다.";
  }
}
