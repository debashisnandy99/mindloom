import { PDFParse } from "pdf-parse";
import type { ExtractedDocument, ExtractedSegment } from "../../../types/indexing.js";
import { downloadFromS3 } from "../../storage/s3.service.js";

export async function extractPdf(s3Key: string): Promise<ExtractedDocument> {
  const buffer = await downloadFromS3(s3Key);
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();

    const segments: ExtractedSegment[] = result.pages
      .filter((page) => page.text.trim().length > 0)
      .map((page) => ({
        text: page.text,
        metadata: { pageNumber: page.num },
      }));

    if (segments.length === 0) {
      throw new Error("No selectable text found in this PDF (it may be a scanned image)");
    }

    return {
      segments,
      metadata: { pageCount: result.total },
      meta: `PDF · ${result.total} page${result.total === 1 ? "" : "s"}`,
    };
  } finally {
    await parser.destroy();
  }
}
