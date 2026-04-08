// @ts-ignore
import { translate } from "google-translate-api-browser";

export async function translateToKorean(text: string): Promise<string> {
  try {
    const res = await translate(text, { to: "ko" });
    return res.text;
  } catch (error) {
    console.error("Google Translation error:", error);
    throw error; // Let the caller handle retries
  }
}
