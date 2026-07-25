import type { Source } from "../../../generated/prisma/client.js";
import type { ExtractedDocument } from "../../../types/indexing.js";
import { extractGoogleDoc } from "./gdoc.extractor.js";
import { extractPdf } from "./pdf.extractor.js";
import { extractText } from "./text.extractor.js";
import { extractUrl } from "./url.extractor.js";
import { extractYoutube } from "./youtube.extractor.js";

export async function extractSource(source: Source): Promise<ExtractedDocument> {
  switch (source.type) {
    case "PDF":
      if (!source.s3Key) throw new Error("PDF source is missing its S3 key");
      return extractPdf(source.s3Key);
    case "URL":
      return extractUrl(source.content);
    case "YT":
      return extractYoutube(source.content);
    case "GDOC":
      return extractGoogleDoc(source.content);
    case "TEXT":
      return extractText(source.content);
  }
}

export { parseYoutubeId } from "./youtube.extractor.js";
export { parseGoogleDocId } from "./gdoc.extractor.js";
