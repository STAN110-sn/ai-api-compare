import { ProviderConfig } from './types';

export const getAvailableProviders = (): { id: string; name: string }[] => {
  const providers: { id: string; name: string }[] = [];

  if (process.env.PROVIDER_A_API_KEY && process.env.PROVIDER_A_BASE_URL) {
    providers.push({
      id: 'A',
      name: process.env.PROVIDER_A_NAME || 'Provider A',
    });
  }

  if (process.env.PROVIDER_B_API_KEY && process.env.PROVIDER_B_BASE_URL) {
    providers.push({
      id: 'B',
      name: process.env.PROVIDER_B_NAME || 'Provider B',
    });
  }

  if (process.env.PROVIDER_C_API_KEY && process.env.PROVIDER_C_BASE_URL) {
    providers.push({
      id: 'C',
      name: process.env.PROVIDER_C_NAME || 'Provider C',
    });
  }

  if (process.env.PROVIDER_D_API_KEY && process.env.PROVIDER_D_BASE_URL) {
    providers.push({
      id: 'D',
      name: process.env.PROVIDER_D_NAME || 'Provider D',
    });
  }

  return providers;
};

export const getProviderConfig = (id: string): ProviderConfig | null => {
  const envMap: Record<string, { nameKey: string; keyKey: string; urlKey: string; modelKey: string }> = {
    'A': {
      nameKey: 'PROVIDER_A_NAME',
      keyKey: 'PROVIDER_A_API_KEY',
      urlKey: 'PROVIDER_A_BASE_URL',
      modelKey: 'PROVIDER_A_MODEL',
    },
    'B': {
      nameKey: 'PROVIDER_B_NAME',
      keyKey: 'PROVIDER_B_API_KEY',
      urlKey: 'PROVIDER_B_BASE_URL',
      modelKey: 'PROVIDER_B_MODEL',
    },
    'C': {
      nameKey: 'PROVIDER_C_NAME',
      keyKey: 'PROVIDER_C_API_KEY',
      urlKey: 'PROVIDER_C_BASE_URL',
      modelKey: 'PROVIDER_C_MODEL',
    },
    'D': {
      nameKey: 'PROVIDER_D_NAME',
      keyKey: 'PROVIDER_D_API_KEY',
      urlKey: 'PROVIDER_D_BASE_URL',
      modelKey: 'PROVIDER_D_MODEL',
    },
  };

  const env = envMap[id];
  if (!env) return null;

  const apiKey = process.env[env.keyKey];
  const baseUrl = process.env[env.urlKey];

  if (!apiKey || !baseUrl) return null;

  return {
    id,
    name: process.env[env.nameKey] || `Provider ${id}`,
    apiKey,
    baseUrl,
    model: process.env[env.modelKey] || 'gpt-4',
  };
};
