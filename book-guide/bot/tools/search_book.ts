import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { loadBook, openingLine, searchPages, type TextCache } from "../lib/book.js";

function fileCache(files: {
  read(path: string, options?: { scope?: "deployment" }): Promise<string | undefined>;
  write(path: string, data: string, options?: { scope?: "deployment" }): Promise<void>;
}): TextCache {
  return {
    read: (filePath) => files.read(filePath, { scope: "deployment" }),
    write: (filePath, data) => files.write(filePath, data, { scope: "deployment" }),
  };
}

export default defineTool({
  description:
    "Search the book PDF stored on GitHub (book.pdf). Call this before every answer about the book. Returns the PDF page numbers and a short excerpt from each matching page.",
  effect: "read",
  inputSchema: z.object({
    query: z.string().min(2).describe("Words or a question to find in the book."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(6)
      .optional()
      .describe("How many matching pages to return. Default 4."),
  }),
  async execute({ query, limit }, ctx) {
    try {
      const book = await loadBook(fileCache(ctx.host.files));
      const matches = searchPages(book.pages, query, limit ?? 4);
      return {
        ok: true as const,
        source: book.source,
        pageCount: book.pages.length,
        openingLine: openingLine(book.pages),
        query,
        matches,
        note:
          matches.length > 0
            ? "Answer only from these excerpts. Cite the PDF page number. Quote at most a sentence or two."
            : "No page in the book matches that query.",
        ...(book.warning ? { warning: book.warning } : {}),
      };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Could not read the book PDF.",
      };
    }
  },
});
