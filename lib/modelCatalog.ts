import { EffortOption, ModelConfig } from './types';

// A model as advertised by a provider's GET /models endpoint, normalized to
// the app's ModelConfig shape. `created` is epoch milliseconds (used only for
// ordering the catalog; missing on some providers).
export interface FetchedModel extends ModelConfig {
  created?: number;
}

const EFFORT_ORDER: EffortOption[] = ['none', 'low', 'medium', 'high', 'xhigh', 'max'];
const NON_CHAT_ID = /tts|whisper|realtime|audio|image|imagine|video|embedding|moderation|transcribe/i;
const KNOWN_EFFORTS: Record<string, true> = {
  none: true, low: true, medium: true, high: true, xhigh: true, max: true,
};


// Extract the advertised effort levels from a raw /models entry.
// - ai&: `reasoning_efforts: string[]` (may include 'none')
// - Anthropic: `capabilities.effort` with per-level `supported` flags
// - everyone else (OpenAI, xAI): no effort metadata -> undefined
function extractReasoningEfforts(raw: Record<string, unknown>): EffortOption[] | undefined {
  if (Array.isArray(raw.reasoning_efforts)) {
    const efforts = [
      ...new Set(
        raw.reasoning_efforts
          .filter((e): e is string => typeof e === 'string' && KNOWN_EFFORTS[e] === true)
          .map((e) => e as EffortOption)
      ),
    ].sort((a, b) => EFFORT_ORDER.indexOf(a) - EFFORT_ORDER.indexOf(b));
    return efforts.length > 0 ? efforts : undefined;
  }

  const effort = (raw.capabilities as
    | { effort?: { supported?: unknown } & Record<'low' | 'medium' | 'high' | 'xhigh' | 'max', { supported?: unknown }> }
    | undefined
  )?.effort;
  if (effort?.supported === true) {
    const efforts = EFFORT_ORDER.filter(
      (level) => level !== 'none' && effort[level]?.supported === true
    );
    return efforts.length > 0 ? efforts : undefined;
  }

  return undefined;
}

// Fetch and normalize a provider's model catalog. Returns null on any failure
// (network error, non-2xx, malformed payload) so callers can fall back to the
// env-configured list.
export async function fetchProviderModels(
  baseUrl: string,
  apiKey: string
): Promise<FetchedModel[] | null> {
  try {
    let anthropic = false;
    try {
      const host = new URL(baseUrl).hostname.toLowerCase();
      anthropic = host === 'api.anthropic.com' || host.endsWith('.anthropic.com');
    } catch { /* invalid URL -> Bearer auth */ }
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
      headers: anthropic
        ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
        : { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const payload = (await res.json()) as { data?: unknown };
    if (!Array.isArray(payload.data)) return null;

    const models: FetchedModel[] = [];
    for (const entry of payload.data) {
      if (typeof entry !== 'object' || entry === null) continue;
      const raw = entry as Record<string, unknown>;

      const id = raw.id;
      if (typeof id !== 'string' || !id) continue;
      if (NON_CHAT_ID.test(id)) continue;

      // OpenAI lists models past their shutdown date; keep only live ones.
      if (typeof raw.shutdown_date === 'string' && Date.parse(raw.shutdown_date) <= Date.now()) {
        continue;
      }

      const name =
        (typeof raw.name === 'string' && raw.name) ||
        (typeof raw.display_name === 'string' && raw.display_name) ||
        id;

      const created =
        typeof raw.created === 'number'
          ? raw.created * 1000
          : Date.parse(typeof raw.created_at === 'string' ? raw.created_at : '') || undefined;

      const config: FetchedModel = { id, name, ...(created !== undefined ? { created } : {}) };

      const inputCost = Number(raw.input_per_1m);
      if (raw.input_per_1m !== null && raw.input_per_1m !== undefined && Number.isFinite(inputCost)) {
        config.inputCostPer1M = inputCost;
      }
      const outputCost = Number(raw.output_per_1m);
      if (raw.output_per_1m !== null && raw.output_per_1m !== undefined && Number.isFinite(outputCost)) {
        config.outputCostPer1M = outputCost;
      }

      const reasoningEfforts = extractReasoningEfforts(raw);
      if (reasoningEfforts) {
        config.reasoningEfforts = reasoningEfforts;
        const advertisedDefault = raw.reasoning_effort_default;
        if (
          typeof advertisedDefault === 'string' &&
          reasoningEfforts.includes(advertisedDefault as EffortOption)
        ) {
          config.defaultReasoningEffort = advertisedDefault as EffortOption;
        }
      }

      models.push(config);
    }

    // Newest first; entries without a creation date sink to the end (stable).
    models.sort((a, b) => {
      if (a.created === b.created) return 0;
      if (a.created === undefined) return 1;
      if (b.created === undefined) return -1;
      return b.created - a.created;
    });

    return models;
  } catch {
    return null;
  }
}

// Module-level catalog cache. Next 16 route handlers are not cached by
// default, so this is the mechanism that keeps /models calls off the hot path.
const CACHE_TTL_MS = 300_000;
const NEGATIVE_TTL_MS = 60_000;

const catalogCache = new Map<
  string,
  { at: number; ttl: number; models: FetchedModel[] | null }
>();

export async function getCachedProviderModels(
  cacheKey: string,
  baseUrl: string,
  apiKey: string
): Promise<FetchedModel[] | null> {
  const cached = catalogCache.get(cacheKey);
  if (cached && Date.now() - cached.at < cached.ttl) {
    return cached.models;
  }

  const fetched = await fetchProviderModels(baseUrl, apiKey);

  if (fetched) {
    catalogCache.set(cacheKey, { at: Date.now(), ttl: CACHE_TTL_MS, models: fetched });
    return fetched;
  }

  // Fetch failed. Serve a stale-but-nonempty catalog for one short window
  // before retrying, instead of flashing the env fallback.
  if (cached && cached.models) {
    catalogCache.set(cacheKey, { at: Date.now(), ttl: NEGATIVE_TTL_MS, models: cached.models });
    return cached.models;
  }

  catalogCache.set(cacheKey, { at: Date.now(), ttl: NEGATIVE_TTL_MS, models: null });
  return null;
}
