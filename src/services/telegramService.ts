import axios from "axios";

export interface TelegramPost {
  id: string;
  text: string;
  date: string;
}

export async function fetchTelegramPosts(): Promise<TelegramPost[]> {
  try {
    const response = await axios.get("/api/scrape");
    if (response.data && Array.isArray(response.data.posts)) {
      return response.data.posts;
    }
    
    if (response.data && response.data.error) {
      throw new Error(response.data.error);
    }
    
    throw new Error("Invalid response format from scraper");
  } catch (error: any) {
    console.error("Error fetching Telegram posts:", error.message || error);
    if (error.response && error.response.data && error.response.data.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}
