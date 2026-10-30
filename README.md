# timorobot

Ask questions about the book in `book.pdf`. The agent in `book-guide` reads that file from this GitHub repository and answers from the pages that match.

## Add your book

This repository is public. Commit a PDF only if you have the right to publish it. For a copyrighted book, make the repository private before you upload the file.

1. Put the PDF at the root of this repository as `book.pdf`, on the `main` branch. Replace the sample that is already there.
2. The sample is a three-page story, The Glass Orchard, so you can try a question before your book is uploaded.
3. If the repository is private, set `GITHUB_TOKEN` in the agent environment. The token needs read access to this repository. Do not commit the token.

A scan with no text layer cannot be searched. Run OCR first, then upload the PDF.

## Ask a question

```bash
cd book-guide
npx @grok/agent-sdk login
npx @grok/agent-sdk dev
```

Open the playground at `http://127.0.0.1:3000/playground` and ask about the book.
