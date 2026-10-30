import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description: "A question about the book searches the PDF on GitHub.",
  async test(t) {
    await t.send("Who rings the copper bell in the glass orchard?");
    t.succeeded();
    t.calledTool("search_book");
  },
});
