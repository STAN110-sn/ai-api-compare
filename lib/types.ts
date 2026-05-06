export type ReasoningEffort = 'low' | 'medium' | 'high';

export interface ModelConfig {
  id: string;
  name: string;
  inputCostPer1M?: number;
  outputCostPer1M?: number;
  supportsReasoning?: boolean;
}

export interface ProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  models: ModelConfig[];
}

export interface ProviderInfo {
  id: string;
  name: string;
  models: ModelConfig[];
}

export interface ComparisonRequest {
  prompt: string;
  providerA: ProviderConfig;
  providerB: ProviderConfig;
  reasoningEffortA?: ReasoningEffort;
  reasoningEffortB?: ReasoningEffort;
}

export interface StreamChunk {
  provider: 'A' | 'B';
  content?: string;
  reasoning?: string;
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
