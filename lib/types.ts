export type ReasoningEffort = 'low' | 'medium' | 'high';

export interface ModelConfig {
  id: string;
  name: string;
  inputCostPer1M?: number;
  outputCostPer1M?: number;
  supportsReasoning?: boolean;
  defaultReasoningEffort?: ReasoningEffort;
  // Models (e.g. ai&'s Qwen/Gemma) whose chat template exposes an on/off
  // thinking switch via chat_template_kwargs.enable_thinking. When set, the UI
  // shows a Reasoning On/Off toggle instead of the low/medium/high selector.
  supportsThinkingToggle?: boolean;
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
  // When true, sends chat_template_kwargs.enable_thinking=false to disable the
  // model's reasoning output (ai& Qwen/Gemma OpenAI-compatible models).
  disableThinkingA?: boolean;
  disableThinkingB?: boolean;
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
