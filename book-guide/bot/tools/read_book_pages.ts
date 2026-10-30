import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { loadBook, readPageRange, type TextCache } from "../lib/book.js";

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
    "Read a short range of PDF pages from the book on GitHub. Use this after search_book when a summary needs the surrounding pages. At most 3 pages are returned.",
  effect: "read",
  inputSchema: z.object({
    startPage: z.number().int().min(1).describe("First PDF page to read."),
    endPage: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Last PDF page to read. Defaults to startPage. The range is capped at 3 pages."),
  }),
  async execute({ startPage, endPage }, ctx) {
    try {
      const book = await loadBook(fileCache(ctx.host.files));
      const range = readPageRange(book.pages, startPage, endPage ?? startPage);
      return {
        ok: true as const,
        source: book.source,
        pageCount: range.pageCount,
        pages: range.pages,
        note: "Cite the PDF page numbers. Quote at most a sentence or two.",
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
