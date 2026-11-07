import { ModelConfig } from './types';

const PRICING_URL = 'https://platform.claude.com/docs/en/about-claude/pricing.md';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FAILURE_RETRY_MS = 60_000;

// Canonical modern Claude ID: claude-opus-4-7-20260201 -> claude-opus-4-7.
// A major-only dated ID (claude-sonnet-5-20260901) must leave the date to the
// final group instead of consuming it as a minor version.
function canonicalModelId(id: string): string | null {
  const match = /^claude-([a-z][a-z0-9]*)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/i.exec(id);
  if (!match) return null;
  return `claude-${match[1].toLowerCase()}-${match[2]}${match[3] ? `-${match[3]}` : ''}`;
}

function parsePrice(cell: string): number | undefined {
  const match = /^\$(\d+(?:\.\d+)?)(?:\s+USD)?\s*\/\s*MTok/.exec(cell.trim());
  if (!match) return undefined;
  const price = Number(match[1]);
  return Number.isFinite(price) && price >= 0 ? price : undefined;
}

// The first table is the standard API base-token table. Restrict parsing to
// this section so batch, cache, fast-mode, and long-context rows cannot be
// mistaken for standard synchronous input/output pricing.
function parsePricing(markdown: string): Map<string, { inputCostPer1M: number; outputCostPer1M: number }> {
  const start = /^## Model pricing\s*$/m.exec(markdown);
  if (!start) return new Map();
  const body = markdown.slice(start.index + start[0].length);
  const end = /^## /m.exec(body);
  const pricing = new Map<string, { inputCostPer1M: number; outputCostPer1M: number }>();

  for (const line of (end ? body.slice(0, end.index) : body).split('\n')) {
    if (!line.startsWith('|')) continue;
    const columns = line.split('|').map((cell) => cell.trim());
    if (columns.length !== 8) continue;
    const [, nameCell, inputCell, , , , outputCell] = columns;
    const name = /^Claude\s+([A-Za-z][A-Za-z0-9]*)\s+(\d+(?:\.\d+)?)/.exec(nameCell);
    // The app currently computes base-token costs only. For a tiered model,
    // the first/base tier applies to prompts up to 100,000 tokens.
    if (!name || /prompts over/i.test(nameCell)) continue;
    const inputCostPer1M = parsePrice(inputCell);
    const outputCostPer1M = parsePrice(outputCell);
    if (inputCostPer1M === undefined || outputCostPer1M === undefined) continue;
    const id = `claude-${name[1].toLowerCase()}-${name[2].replace('.', '-')}`;
    if (!pricing.has(id)) pricing.set(id, { inputCostPer1M, outputCostPer1M });
  }

  return pricing;
}

let cache: { at: number; pricing: Map<string, { inputCostPer1M: number; outputCostPer1M: number }> } | undefined;
let pending: Promise<Map<string, { inputCostPer1M: number; outputCostPer1M: number }> | null> | undefined;
let failedAt: number | undefined;

async function getPricing() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.pricing;
  // Avoid adding the request timeout to every page load and comparison while
  // the document is unreachable. Keep stale prices, if any, during the pause.
  if (failedAt !== undefined && Date.now() - failedAt < FAILURE_RETRY_MS) {
    return cache?.pricing ?? null;
  }
  if (!pending) {
    pending = (async () => {
      try {
        const response = await fetch(PRICING_URL, {
          headers: { Accept: 'text/markdown' },
          signal: AbortSignal.timeout(10_000),
          // The module cache below owns freshness, so concurrent requests do
          // not depend on Next.js's fetch cache behavior.
          cache: 'no-store',
        });
        if (!response.ok) return null;
        const pricing = parsePricing(await response.text());
        if (pricing.size === 0) return null;
        cache = { at: Date.now(), pricing };
        return pricing;
      } catch {
        return null;
      }
    })();
  }

  try {
    const pricing = await pending;
    failedAt = pricing ? undefined : Date.now();
    return pricing ?? cache?.pricing ?? null;
  } finally {
    pending = undefined;
  }
}

export async function applyAnthropicPricing(
  models: ModelConfig[],
  baseUrl: string
): Promise<ModelConfig[]> {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    if (host !== 'api.anthropic.com' && !host.endsWith('.anthropic.com')) return models;
  } catch {
    return models;
  }
  if (!models.some((model) => canonicalModelId(model.id))) return models;

  const pricing = await getPricing();
  if (!pricing) return models;
  return models.map((model) => {
    const price = pricing.get(canonicalModelId(model.id) || '');
    return price ? { ...model, ...price } : model;
  });
}
