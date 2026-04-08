import axios from "axios";

export interface TelegramPost {
  id: string;
  text: string;
  date: string;
}

export async function fetchTelegramPosts(): Promise<TelegramPost[]> {
  try {
    const response = await axios.get("/api/scrape");
    return response.data.posts;
  } catch (error) {
    console.error("Error fetching Telegram posts:", error);
    throw error;
  }
}
