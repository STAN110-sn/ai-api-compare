import { ProviderConfig, ProviderInfo, ModelConfig, EffortOption } from './types';
import { getCachedProviderModels } from './modelCatalog';

function parseModels(modelsEnv: string | undefined): ModelConfig[] {
  if (!modelsEnv) return [];

  // Format: "id:Name:inputCostPer1M:outputCostPer1M:reasoning[=low|medium|high|xhigh|max]"
  // - All fields after id are optional and may be left empty
  // - "reasoning" enables the reasoning_effort UI for that model with the
  //   standard levels low/medium/high/xhigh (OpenAI's advertised set)
  // - "reasoning=high" also pre-selects High as the default level
  // - API-advertised effort lists (ai&, Anthropic) take precedence over this flag
  // - "thinking-toggle" instead enables a Reasoning On/Off switch:
  //     "thinking-toggle"             -> chat_template_kwargs.enable_thinking=false (ai& Qwen/Gemma)
  //     "thinking-toggle=effort-none" -> reasoning_effort="none" (xAI Grok)
  // - Costs are USD per 1,000,000 tokens
  return modelsEnv.split(',').map((model) => {
    const parts = model.trim().split(':').map((p) => p.trim());
    const id = parts[0];
    const name = parts[1] || id;
    const inputCost = parts[2] ? Number(parts[2]) : undefined;
    const outputCost = parts[3] ? Number(parts[3]) : undefined;
    const reasoningField = parts[4]?.toLowerCase() ?? '';
    const reasoningMatch = /^reasoning(?:=(low|medium|high|xhigh|max))?$/.exec(reasoningField);

    const config: ModelConfig = { id, name };
    if (inputCost !== undefined && Number.isFinite(inputCost)) {
      config.inputCostPer1M = inputCost;
    }
    if (outputCost !== undefined && Number.isFinite(outputCost)) {
      config.outputCostPer1M = outputCost;
    }
    if (reasoningMatch) {
      const level = reasoningMatch[1] as EffortOption | undefined;
      const efforts: EffortOption[] = ['low', 'medium', 'high', 'xhigh'];
      if (level && !efforts.includes(level)) {
        // reasoning=max (etc.) must stay selectable: append the level so the
        // dropdown has an option matching the pre-selected default.
        efforts.push(level);
      }
      config.reasoningEfforts = efforts;
      if (level) {
        config.defaultReasoningEffort = level;
      }
    } else if (/^thinking-toggle(?:=effort-none)?$/.test(reasoningField)) {
      config.supportsThinkingToggle = true;
      config.thinkingOffMode =
        reasoningField === 'thinking-toggle=effort-none'
          ? 'reasoning_effort_none'
          : 'enable_thinking';
    }
    return config;
  }).filter((m) => m.id);
}

// Apply an env-parsed override on top of a fetched model. Env entries act as
// annotations: explicit display names and costs win; thinking-toggle wins and
// removes the effort dropdown; otherwise API-advertised effort levels take
// precedence and only the env default (when valid for that list) is honored.
function applyOverride(
  fetched: ModelConfig & { created?: number },
  override: ModelConfig | undefined
): ModelConfig {
  if (!override) return fetched;

  const merged: ModelConfig & { created?: number } = { ...fetched };

  // parseModels defaults name to id, which carries no information.
  if (override.name !== override.id) {
    merged.name = override.name;
  }
  if (override.inputCostPer1M !== undefined) merged.inputCostPer1M = override.inputCostPer1M;
  if (override.outputCostPer1M !== undefined) merged.outputCostPer1M = override.outputCostPer1M;

  if (override.supportsThinkingToggle) {
    merged.supportsThinkingToggle = true;
    merged.thinkingOffMode = override.thinkingOffMode ?? 'enable_thinking';
    delete merged.reasoningEfforts;
    delete merged.defaultReasoningEffort;
  } else if (override.reasoningEfforts) {
    if (fetched.reasoningEfforts && fetched.reasoningEfforts.length > 0) {
      // The provider advertises its own levels — keep them; only the env
      // default carries over, and only if it's one of the advertised levels.
      if (
        override.defaultReasoningEffort !== undefined &&
        fetched.reasoningEfforts.includes(override.defaultReasoningEffort)
      ) {
        merged.defaultReasoningEffort = override.defaultReasoningEffort;
      }
    } else {
      merged.reasoningEfforts = override.reasoningEfforts;
      if (override.defaultReasoningEffort !== undefined) {
        merged.defaultReasoningEffort = override.defaultReasoningEffort;
      } else {
        delete merged.defaultReasoningEffort;
      }
    }
  }

  return merged;
}

// The live model list for a provider: the fetched /models catalog with env
// entries merged in as annotations. Env-annotated models come first (in env
// order) so the user's configured model is the default; the rest follow by
// recency, with env-only entries (e.g. working aliases the API doesn't list)
// last. Falls back to the plain env list when the catalog fetch fails.
async function resolveModels(
  cacheKey: string,
  modelsEnv: string | undefined,
  baseUrl: string,
  apiKey: string
): Promise<ModelConfig[]> {
  const overrides = parseModels(modelsEnv);
  const fetched = await getCachedProviderModels(cacheKey, baseUrl, apiKey);

  if (!fetched || fetched.length === 0) {
    return overrides;
  }

  const merged = fetched.map((f) => applyOverride(f, overrides.find((o) => o.id === f.id)));
  const envMatched = new Set(overrides.map((o) => o.id));
  const mergedById = new Map(merged.map((m) => [m.id, m]));

  const ordered: ModelConfig[] = [];
  const envOnly: ModelConfig[] = [];
  for (const override of overrides) {
    const match = mergedById.get(override.id);
    if (match) {
      ordered.push(match);
    } else {
      // Env-only entry (e.g. working alias claude-haiku-4-5) — stays
      // selectable, but after the live catalog so a stale id can never
      // become the default model.
      envOnly.push(override);
    }
  }
  for (const model of merged) {
    if (!envMatched.has(model.id)) {
      ordered.push(model);
    }
  }
  return [...ordered, ...envOnly];
}

function getDefaultModel(models: ModelConfig[]): string {
  return models[0]?.id || 'gpt-4';
}

export const getAvailableProviders = async (): Promise<ProviderInfo[]> => {
  const configured: Array<{ id: string; name: string; apiKey: string; baseUrl: string; modelsEnv: string | undefined }> = [];

  if (process.env.PROVIDER_A_API_KEY && process.env.PROVIDER_A_BASE_URL) {
    configured.push({
      id: 'A',
      name: process.env.PROVIDER_A_NAME || 'Provider A',
      apiKey: process.env.PROVIDER_A_API_KEY,
      baseUrl: process.env.PROVIDER_A_BASE_URL,
      modelsEnv: process.env.PROVIDER_A_MODELS,
    });
  }

  if (process.env.PROVIDER_B_API_KEY && process.env.PROVIDER_B_BASE_URL) {
    configured.push({
      id: 'B',
      name: process.env.PROVIDER_B_NAME || 'Provider B',
      apiKey: process.env.PROVIDER_B_API_KEY,
      baseUrl: process.env.PROVIDER_B_BASE_URL,
      modelsEnv: process.env.PROVIDER_B_MODELS,
    });
  }

  if (process.env.PROVIDER_C_API_KEY && process.env.PROVIDER_C_BASE_URL) {
    configured.push({
      id: 'C',
      name: process.env.PROVIDER_C_NAME || 'Provider C',
      apiKey: process.env.PROVIDER_C_API_KEY,
      baseUrl: process.env.PROVIDER_C_BASE_URL,
      modelsEnv: process.env.PROVIDER_C_MODELS,
    });
  }

  if (process.env.PROVIDER_D_API_KEY && process.env.PROVIDER_D_BASE_URL) {
    configured.push({
      id: 'D',
      name: process.env.PROVIDER_D_NAME || 'Provider D',
      apiKey: process.env.PROVIDER_D_API_KEY,
      baseUrl: process.env.PROVIDER_D_BASE_URL,
      modelsEnv: process.env.PROVIDER_D_MODELS,
    });
  }

  // Fetch all catalogs concurrently: latency = slowest provider, not the sum.
  const modelsLists = await Promise.all(
    configured.map((p) => resolveModels(p.id, p.modelsEnv, p.baseUrl, p.apiKey))
  );

  return configured.map((p, i) => ({
    id: p.id,
    name: p.name,
    models: modelsLists[i].length > 0 ? modelsLists[i] : [{ id: 'default', name: 'Default Model' }],
  }));
};

export const getProviderConfig = async (
  id: string,
  selectedModelId?: string
): Promise<ProviderConfig | null> => {
  const envMap: Record<string, { nameKey: string; keyKey: string; urlKey: string; modelsKey: string }> = {
    'A': { nameKey: 'PROVIDER_A_NAME', keyKey: 'PROVIDER_A_API_KEY', urlKey: 'PROVIDER_A_BASE_URL', modelsKey: 'PROVIDER_A_MODELS' },
    'B': { nameKey: 'PROVIDER_B_NAME', keyKey: 'PROVIDER_B_API_KEY', urlKey: 'PROVIDER_B_BASE_URL', modelsKey: 'PROVIDER_B_MODELS' },
    'C': { nameKey: 'PROVIDER_C_NAME', keyKey: 'PROVIDER_C_API_KEY', urlKey: 'PROVIDER_C_BASE_URL', modelsKey: 'PROVIDER_C_MODELS' },
    'D': { nameKey: 'PROVIDER_D_NAME', keyKey: 'PROVIDER_D_API_KEY', urlKey: 'PROVIDER_D_BASE_URL', modelsKey: 'PROVIDER_D_MODELS' },
  };

  const env = envMap[id];
  if (!env) return null;

  const apiKey = process.env[env.keyKey];
  const baseUrl = process.env[env.urlKey];

  if (!apiKey || !baseUrl) return null;

  const models = await resolveModels(id, process.env[env.modelsKey], baseUrl, apiKey);
  const modelToUse = selectedModelId && models.find(m => m.id === selectedModelId)
    ? selectedModelId
    : getDefaultModel(models);

  return {
    id,
    name: process.env[env.nameKey] || `Provider ${id}`,
    apiKey,
    baseUrl,
    model: modelToUse,
    models,
  };
};
