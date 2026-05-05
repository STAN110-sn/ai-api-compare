import { ProviderConfig, ProviderInfo, ModelConfig } from './types';

function parseModels(modelsEnv: string | undefined): ModelConfig[] {
  if (!modelsEnv) return [];

  // Format: "model-id-1:Display Name 1,model-id-2:Display Name 2"
  // Or: "model-id-1,model-id-2" (uses ID as display name)
  return modelsEnv.split(',').map((model, index) => {
    const parts = model.trim().split(':');
    if (parts.length >= 2) {
      return {
        id: parts[0].trim(),
        name: parts[1].trim(),
      };
    }
    // If no display name provided, use model ID as name
    return {
      id: parts[0].trim(),
      name: parts[0].trim(),
    };
  }).filter(m => m.id);
}

function getDefaultModel(models: ModelConfig[]): string {
  return models[0]?.id || 'gpt-4';
}

export const getAvailableProviders = (): ProviderInfo[] => {
  const providers: ProviderInfo[] = [];

  if (process.env.PROVIDER_A_API_KEY && process.env.PROVIDER_A_BASE_URL) {
    const models = parseModels(process.env.PROVIDER_A_MODELS);
    providers.push({
      id: 'A',
      name: process.env.PROVIDER_A_NAME || 'Provider A',
      models: models.length > 0 ? models : [{ id: 'default', name: 'Default Model' }],
    });
  }

  if (process.env.PROVIDER_B_API_KEY && process.env.PROVIDER_B_BASE_URL) {
    const models = parseModels(process.env.PROVIDER_B_MODELS);
    providers.push({
      id: 'B',
      name: process.env.PROVIDER_B_NAME || 'Provider B',
      models: models.length > 0 ? models : [{ id: 'default', name: 'Default Model' }],
    });
  }

  if (process.env.PROVIDER_C_API_KEY && process.env.PROVIDER_C_BASE_URL) {
    const models = parseModels(process.env.PROVIDER_C_MODELS);
    providers.push({
      id: 'C',
      name: process.env.PROVIDER_C_NAME || 'Provider C',
      models: models.length > 0 ? models : [{ id: 'default', name: 'Default Model' }],
    });
  }

  if (process.env.PROVIDER_D_API_KEY && process.env.PROVIDER_D_BASE_URL) {
    const models = parseModels(process.env.PROVIDER_D_MODELS);
    providers.push({
      id: 'D',
      name: process.env.PROVIDER_D_NAME || 'Provider D',
      models: models.length > 0 ? models : [{ id: 'default', name: 'Default Model' }],
    });
  }

  return providers;
};

export const getProviderConfig = (id: string, selectedModelId?: string): ProviderConfig | null => {
  const envMap: Record<string, { nameKey: string; keyKey: string; urlKey: string; modelsKey: string }> = {
    'A': {
      nameKey: 'PROVIDER_A_NAME',
      keyKey: 'PROVIDER_A_API_KEY',
      urlKey: 'PROVIDER_A_BASE_URL',
      modelsKey: 'PROVIDER_A_MODELS',
    },
    'B': {
      nameKey: 'PROVIDER_B_NAME',
      keyKey: 'PROVIDER_B_API_KEY',
      urlKey: 'PROVIDER_B_BASE_URL',
      modelsKey: 'PROVIDER_B_MODELS',
    },
    'C': {
      nameKey: 'PROVIDER_C_NAME',
      keyKey: 'PROVIDER_C_API_KEY',
      urlKey: 'PROVIDER_C_BASE_URL',
      modelsKey: 'PROVIDER_C_MODELS',
    },
    'D': {
      nameKey: 'PROVIDER_D_NAME',
      keyKey: 'PROVIDER_D_API_KEY',
      urlKey: 'PROVIDER_D_BASE_URL',
      modelsKey: 'PROVIDER_D_MODELS',
    },
  };

  const env = envMap[id];
  if (!env) return null;

  const apiKey = process.env[env.keyKey];
  const baseUrl = process.env[env.urlKey];

  if (!apiKey || !baseUrl) return null;

  const models = parseModels(process.env[env.modelsKey]);
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
