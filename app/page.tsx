'use client';

import { useState, useCallback, useEffect } from 'react';
import { ProviderSelector } from '@/components/ProviderSelector';
import { PromptInput } from '@/components/PromptInput';
import { ResponsePanel } from '@/components/ResponsePanel';
import { ProviderInfo, ReasoningEffort, StreamChunk } from '@/lib/types';
import { GitCompare } from 'lucide-react';

interface ResponseState {
  content: string;
  reasoning: string;
  isLoading: boolean;
  metrics: {
    latency: number;
    tokens: {
      total: number;
      prompt: number;
      completion: number;
    } | null;
    cost: number | null;
    tokensPerSec: number | null;
  } | null;
  error?: string;
}

const initialResponseState: ResponseState = {
  content: '',
  reasoning: '',
  isLoading: false,
  metrics: null,
};

export default function Home() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providerA, setProviderA] = useState<string | null>(null);
  const [providerB, setProviderB] = useState<string | null>(null);
  const [modelA, setModelA] = useState<string | null>(null);
  const [modelB, setModelB] = useState<string | null>(null);
  const [reasoningA, setReasoningA] = useState<ReasoningEffort | ''>('');
  const [reasoningB, setReasoningB] = useState<ReasoningEffort | ''>('');
  const [prompt, setPrompt] = useState('');
  const [responseA, setResponseA] = useState<ResponseState>(initialResponseState);
  const [responseB, setResponseB] = useState<ResponseState>(initialResponseState);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    fetch('/api/providers')
      .then((res) => res.json())
      .then((data) => {
        setProviders(data.providers);
        if (data.providers.length >= 2) {
          const first = data.providers[0];
          const second = data.providers[1];
          setProviderA(first.id);
          setProviderB(second.id);
          setModelA(first.models[0]?.id || null);
          setModelB(second.models[0]?.id || null);
        }
      })
      .catch((err) => console.error('Failed to fetch providers:', err));
  }, []);

  // Update default model when provider changes; reset reasoning effort.
  const handleProviderAChange = useCallback((id: string) => {
    setProviderA(id);
    setReasoningA('');
    const provider = providers.find(p => p.id === id);
    if (provider) {
      setModelA(provider.models[0]?.id || null);
    }
  }, [providers]);

  const handleProviderBChange = useCallback((id: string) => {
    setProviderB(id);
    setReasoningB('');
    const provider = providers.find(p => p.id === id);
    if (provider) {
      setModelB(provider.models[0]?.id || null);
    }
  }, [providers]);

  const handleModelAChange = useCallback((id: string) => {
    setModelA(id);
    setReasoningA('');
  }, []);

  const handleModelBChange = useCallback((id: string) => {
    setModelB(id);
    setReasoningB('');
  }, []);

  const handleCompare = useCallback(async () => {
    if (!providerA || !providerB || !prompt.trim()) return;

    const modelInfoA = providers
      .find((p) => p.id === providerA)
      ?.models.find((m) => m.id === modelA);
    const modelInfoB = providers
      .find((p) => p.id === providerB)
      ?.models.find((m) => m.id === modelB);

    const computeMetrics = (
      latency: number,
      tokens: { total: number; prompt: number; completion: number } | undefined,
      model: typeof modelInfoA
    ): NonNullable<ResponseState['metrics']> => {
      const t = tokens || null;
      let cost: number | null = null;
      if (
        t &&
        model?.inputCostPer1M !== undefined &&
        model?.outputCostPer1M !== undefined
      ) {
        cost =
          (t.prompt / 1_000_000) * model.inputCostPer1M +
          (t.completion / 1_000_000) * model.outputCostPer1M;
      }
      const tokensPerSec =
        t && latency > 0 ? t.completion / (latency / 1000) : null;
      return { latency, tokens: t, cost, tokensPerSec };
    };

    setIsComparing(true);
    setResponseA({ ...initialResponseState, isLoading: true });
    setResponseB({ ...initialResponseState, isLoading: true });

    try {
      const configsRes = await fetch('/api/providers/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerAId: providerA,
          providerBId: providerB,
          modelAId: modelA,
          modelBId: modelB,
        }),
      });

      const { providerA: configA, providerB: configB } = await configsRes.json();

      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          providerA: configA,
          providerB: configB,
          ...(reasoningA ? { reasoningEffortA: reasoningA } : {}),
          ...(reasoningB ? { reasoningEffortB: reasoningB } : {}),
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6));

              const setter = data.provider === 'A' ? setResponseA : setResponseB;
              const modelInfo = data.provider === 'A' ? modelInfoA : modelInfoB;
              setter((prev) => {
                if (data.error) {
                  return { ...prev, isLoading: false, error: data.error };
                }
                if (data.done) {
                  return {
                    ...prev,
                    isLoading: false,
                    metrics:
                      data.latency !== undefined
                        ? computeMetrics(data.latency, data.tokens, modelInfo)
                        : prev.metrics,
                  };
                }
                return {
                  ...prev,
                  content: prev.content + (data.content || ''),
                  reasoning: prev.reasoning + (data.reasoning || ''),
                };
              });
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Comparison failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResponseA((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      setResponseB((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
    } finally {
      setIsComparing(false);
    }
  }, [providerA, providerB, modelA, modelB, prompt, providers, reasoningA, reasoningB]);

  const providerAConfig = providers.find((p) => p.id === providerA);
  const providerBConfig = providers.find((p) => p.id === providerB);

  const selectedModelAName = providerAConfig?.models.find(m => m.id === modelA)?.name || modelA;
  const selectedModelBName = providerBConfig?.models.find(m => m.id === modelB)?.name || modelB;

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
            <GitCompare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              AI Provider Comparison
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Compare AI inference providers side-by-side
            </p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6 overflow-hidden">
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ProviderSelector
              providers={providers}
              selectedId={providerA}
              selectedModelId={modelA}
              onSelectProvider={handleProviderAChange}
              onSelectModel={handleModelAChange}
              providerLabel="Provider A"
              modelLabel="Model A"
              disabledProviderId={providerB}
              reasoningEffort={reasoningA}
              onReasoningEffortChange={setReasoningA}
            />
            <ProviderSelector
              providers={providers}
              selectedId={providerB}
              selectedModelId={modelB}
              onSelectProvider={handleProviderBChange}
              onSelectModel={handleModelBChange}
              providerLabel="Provider B"
              modelLabel="Model B"
              disabledProviderId={providerA}
              reasoningEffort={reasoningB}
              onReasoningEffortChange={setReasoningB}
            />
          </div>
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleCompare}
            isLoading={isComparing}
            disabled={!providerA || !providerB}
          />
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 min-h-0">
          <ResponsePanel
            providerName={`${providerAConfig?.name || 'Provider A'}${selectedModelAName ? ` (${selectedModelAName})` : ''}`}
            content={responseA.content}
            reasoning={responseA.reasoning}
            isLoading={responseA.isLoading}
            metrics={responseA.metrics}
            error={responseA.error}
          />
          <ResponsePanel
            providerName={`${providerBConfig?.name || 'Provider B'}${selectedModelBName ? ` (${selectedModelBName})` : ''}`}
            content={responseB.content}
            reasoning={responseB.reasoning}
            isLoading={responseB.isLoading}
            metrics={responseB.metrics}
            error={responseB.error}
          />
        </div>
      </main>
    </div>
  );
}
