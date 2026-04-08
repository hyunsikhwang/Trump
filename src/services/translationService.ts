import axios from "axios";

export async function translateToKorean(text: string): Promise<string> {
  try {
    const response = await axios.post("/api/translate", {
      text,
      to: "ko"
    });
    
    if (response.data && response.data.text) {
      return response.data.text;
    }
    
    throw new Error("Invalid response from translation API");
  } catch (error: any) {
    console.error("Translation service error:", error.message || error);
    throw error;
  }
}
