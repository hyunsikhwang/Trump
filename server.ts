import express from "express";
import axios from "axios";
import { load } from "cheerio";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { translate } from "@vitalets/google-translate-api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to translate text
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, to } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      
      const result = await translate(text, { to: to || "ko" });
      res.json({ text: result.text });
    } catch (error: any) {
      console.error("Translation error:", error.message);
      res.status(500).json({ error: "Translation failed", details: error.message });
    }
  });

  // API Route to scrape Telegram
  app.get("/api/scrape", async (req, res) => {
    try {
      const channel = "realDonaldTrump_en";
      const url = `https://t.me/s/${channel}`;
      
      console.log(`Scraping Telegram channel: ${channel}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 10000, // 10 seconds timeout
      });

      const html = response.data;
      const $ = load(html);
      const posts: any[] = [];

      $('.tgme_widget_message_wrap').each((i, el) => {
        const $el = $(el);
        const fullId = $el.find('.tgme_widget_message').attr('data-post');
        const id = fullId ? fullId.split('/').pop() : null;
        const plainText = $el.find('.tgme_widget_message_text').text().trim();
        const date = $el.find('.time').attr('datetime');
        
        if (id && plainText) {
          posts.push({ id, text: plainText, date });
        }
      });

      console.log(`Found ${posts.length} posts`);
      res.json({ posts: posts.reverse() }); // Newest first
    } catch (error: any) {
      console.error("Scraping error:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
      }
      res.status(500).json({ 
        error: "Failed to scrape Telegram", 
        details: error.message 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
