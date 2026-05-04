export interface ProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ComparisonRequest {
  prompt: string;
  providerA: ProviderConfig;
  providerB: ProviderConfig;
}

export interface StreamChunk {
  provider: 'A' | 'B';
  content?: string;
  done?: boolean;
  error?: string;
  latency?: number;
  tokens?: {
    total: number;
    prompt: number;
    completion: number;
  };
}

export interface ComparisonResult {
  provider: 'A' | 'B';
  content: string;
  latency: number;
  tokens: {
    total: number;
    prompt: number;
    completion: number;
  };
  error?: string;
}
