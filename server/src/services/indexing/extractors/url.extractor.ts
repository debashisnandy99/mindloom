import * as cheerio from "cheerio";
import type { ExtractedDocument } from "../../../types/indexing.js";

const FETCH_TIMEOUT_MS = 20_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; MindloomBot/1.0; +https://mindloom.app/bot)";

export async function extractUrl(url: string): Promise<ExtractedDocument> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $("script, style, noscript, iframe, svg, nav, header, footer, aside, form").remove();

  const title = $("title").first().text().trim() || new URL(url).hostname;
  const description = $('meta[name="description"]').attr("content")?.trim() ?? "";

  // Prefer semantic containers; fall back to body when the page has no landmark.
  const container = ["article", "main", '[role="main"]', "#content", ".content"]
    .map((selector) => $(selector).first())
    .find((el) => el.length > 0 && el.text().trim().length > 200);

  const body = (container ?? $("body")).text();
  const text = body.replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*/g, "\n\n").trim();

  if (!text) throw new Error(`No readable text extracted from ${url}`);

  return {
    segments: [{ text: description ? `${description}\n\n${text}` : text, metadata: {} }],
    metadata: { url, title },
    meta: `Web · ${new URL(url).hostname}`,
  };
}
