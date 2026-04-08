import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to scrape Telegram
  app.get("/api/scrape", async (req, res) => {
    try {
      const channel = "realDonaldTrump_en";
      const url = `https://t.me/s/${channel}`;
      const { data: html } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const $ = cheerio.load(html);
      const posts: any[] = [];

      $('.tgme_widget_message_wrap').each((i, el) => {
        const $el = $(el);
        const fullId = $el.find('.tgme_widget_message').attr('data-post');
        const id = fullId ? fullId.split('/').pop() : null;
        const text = $el.find('.tgme_widget_message_text').html(); 
        const plainText = $el.find('.tgme_widget_message_text').text().trim();
        const date = $el.find('.time').attr('datetime');
        
        if (id && plainText) {
          posts.push({ id, text: plainText, date });
        }
      });

      // Telegram preview usually shows last 20 posts.
      res.json({ posts: posts.reverse() }); // Newest first
    } catch (error) {
      console.error("Scraping error:", error);
      res.status(500).json({ error: "Failed to scrape Telegram" });
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
