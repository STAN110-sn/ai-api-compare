'use client';

import { useState, useCallback, useEffect } from 'react';
import { ProviderSelector } from '@/components/ProviderSelector';
import { PromptInput } from '@/components/PromptInput';
import { ResponsePanel } from '@/components/ResponsePanel';
import { ProviderInfo, ReasoningEffort, StreamChunk } from '@/lib/types';
import { GitCompare, ChevronsUp, ChevronsDown } from 'lucide-react';

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
  const [configCollapsed, setConfigCollapsed] = useState(false);

  useEffect(() => {
    fetch('/api/providers')
      .then((res) => res.json())
      .then((data) => {
        setProviders(data.providers);
        if (data.providers.length >= 2) {
          const first = data.providers[0];
          const second = data.providers[1];
          const firstModel = first.models[0];
          const secondModel = second.models[0];
          setProviderA(first.id);
          setProviderB(second.id);
          setModelA(firstModel?.id || null);
          setModelB(secondModel?.id || null);
          setReasoningA(firstModel?.defaultReasoningEffort ?? '');
          setReasoningB(secondModel?.defaultReasoningEffort ?? '');
        }
      })
      .catch((err) => console.error('Failed to fetch providers:', err));
  }, []);

  // When provider/model changes, seed reasoning effort from the model's
  // configured default (if any), otherwise reset to Off.
  const handleProviderAChange = useCallback((id: string) => {
    setProviderA(id);
    const provider = providers.find(p => p.id === id);
    const firstModel = provider?.models[0];
    setModelA(firstModel?.id || null);
    setReasoningA(firstModel?.defaultReasoningEffort ?? '');
  }, [providers]);

  const handleProviderBChange = useCallback((id: string) => {
    setProviderB(id);
    const provider = providers.find(p => p.id === id);
    const firstModel = provider?.models[0];
    setModelB(firstModel?.id || null);
    setReasoningB(firstModel?.defaultReasoningEffort ?? '');
  }, [providers]);

  const handleModelAChange = useCallback((id: string) => {
    setModelA(id);
    const model = providers
      .find((p) => p.id === providerA)
      ?.models.find((m) => m.id === id);
    setReasoningA(model?.defaultReasoningEffort ?? '');
  }, [providers, providerA]);

  const handleModelBChange = useCallback((id: string) => {
    setModelB(id);
    const model = providers
      .find((p) => p.id === providerB)
      ?.models.find((m) => m.id === id);
    setReasoningB(model?.defaultReasoningEffort ?? '');
  }, [providers, providerB]);

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
    <div className="flex flex-col h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
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
          <button
            type="button"
            onClick={() => setConfigCollapsed((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            title={configCollapsed ? 'Show configuration' : 'Hide configuration to expand responses'}
          >
            {configCollapsed ? (
              <>
                <ChevronsDown className="h-4 w-4" />
                <span>Show config</span>
              </>
            ) : (
              <>
                <ChevronsUp className="h-4 w-4" />
                <span>Expand responses</span>
              </>
            )}
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6 overflow-hidden">
        {!configCollapsed && (
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
        )}

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
