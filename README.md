This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Comparison interface

Choose providers and models independently for each response. Optional reasoning
controls are grouped under each provider's advanced settings. The configuration
can be collapsed while keeping the prompt and Compare/Stop controls available.
Press Cmd/Ctrl+Enter in the prompt to start a comparison.

Responses support Markdown, including GFM tables and fenced code blocks.
Reasoning is available in a separate disclosure. On smaller screens, response
panels stack vertically and the page scrolls rather than clipping the output.

## Model pricing

Model costs use USD per million input/output tokens:

- `input_per_1m` and `output_per_1m` returned by a provider's `/models` endpoint.
  `PROVIDER_X_MODELS` costs override these values (`.env.example` documents
  the format).
- **Anthropic API (`*.anthropic.com`):** the standard input/output prices in the
  [official pricing table](https://platform.claude.com/docs/en/about-claude/pricing)
  override env costs. The Markdown document is refreshed at most every 24 hours.
  Table entries match versioned model IDs, including major-only IDs, with or
  without date suffixes. After a failed refresh, the last successful prices
  remain available and the next retry is delayed by 60 seconds.
- If no automatic price is available, the env `inputCostPer1M` and
  `outputCostPer1M` remain the fallback.

The cost estimate covers standard input and output tokens only. Prompt caching,
batch processing, fast mode, data-residency premiums, and tiered long-context
pricing are not included. The server must be able to reach the official pricing
URL for retries and refreshes; no Anthropic API key is needed for that request.

## Getting Started

Install dependencies with `npm install`, then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

To restrict the preview to this computer when real provider keys are configured,
run `npm run dev -- -H 127.0.0.1`.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
