'use client';

import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { ModelConfig, EffortOption } from '@/lib/types';

interface Provider {
  id: string;
  name: string;
  models: ModelConfig[];
}

const EFFORT_LABELS: Record<EffortOption, string> = {
  none: 'None (off)',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra High',
  max: 'Max',
};

interface ProviderSelectorProps {
  providers: Provider[];
  selectedId: string | null;
  selectedModelId: string | null;
  onSelectProvider: (id: string) => void;
  onSelectModel: (modelId: string) => void;
  providerLabel: string;
  modelLabel: string;
  reasoningEffort: EffortOption | '';
  onReasoningEffortChange: (value: EffortOption | '') => void;
  disableThinking: boolean;
  onDisableThinkingChange: (value: boolean) => void;
}

export function ProviderSelector({
  providers,
  selectedId,
  selectedModelId,
  onSelectProvider,
  onSelectModel,
  providerLabel,
  modelLabel,
  reasoningEffort,
  onReasoningEffortChange,
  disableThinking,
  onDisableThinkingChange,
}: ProviderSelectorProps) {
  const instanceId = useId();
  const providerId = `${instanceId}-provider`;
  const modelId = `${instanceId}-model`;
  const advancedId = `${instanceId}-advanced`;
  const reasoningEffortId = `${instanceId}-reasoning-effort`;
  const thinkingId = `${instanceId}-thinking`;

  const selectedProvider = providers.find((p) => p.id === selectedId);
  const availableModels = selectedProvider?.models || [];
  const selectedModel = availableModels.find((m) => m.id === selectedModelId);
  const efforts = selectedModel?.reasoningEfforts;
  const hasReasoningEfforts = Boolean(efforts?.length);
  const supportsThinkingToggle = Boolean(selectedModel?.supportsThinkingToggle);
  // An advertised 'none' is an explicit off state. Keep it distinct from '',
  // which either means provider default or omits the parameter for off.
  const effortSummary = reasoningEffort
    ? reasoningEffort === 'none'
      ? 'Off'
      : EFFORT_LABELS[reasoningEffort]
    : efforts?.includes('none')
      ? 'Provider default'
      : 'Off';
  const advancedSummary = [
    hasReasoningEfforts ? effortSummary : null,
    supportsThinkingToggle ? `Thinking ${disableThinking ? 'off' : 'on'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <label
            htmlFor={providerId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {providerLabel}
          </label>
          <div className="relative">
            <select
              id={providerId}
              name="provider"
              autoComplete="off"
              value={selectedId || ''}
              onChange={(e) => onSelectProvider(e.target.value)}
              className="w-full min-w-0 appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="" disabled>
                Select a provider
              </option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>
        </div>

        {availableModels.length > 0 && (
          <div className="flex min-w-0 flex-col gap-2">
            <label
              htmlFor={modelId}
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {modelLabel}
            </label>
            <div className="relative">
              <select
                id={modelId}
                name="model"
                autoComplete="off"
                value={selectedModelId || ''}
                onChange={(e) => onSelectModel(e.target.value)}
                disabled={!selectedId}
                className="w-full min-w-0 appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 disabled:opacity-50"
              >
                <option value="" disabled>
                  Select a model
                </option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
            </div>
          </div>
        )}
      </div>

      {(hasReasoningEfforts || supportsThinkingToggle) && (
        <details
          id={advancedId}
          className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
        >
          <summary className="cursor-pointer rounded-md px-1 py-1 text-sm font-medium text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-gray-300">
            Advanced settings
            <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
              {advancedSummary}
            </span>
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-3 pb-1 sm:grid-cols-2">
            {hasReasoningEfforts && (
              <div className="flex min-w-0 flex-col gap-2">
                <label
                  htmlFor={reasoningEffortId}
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Reasoning effort
                </label>
                <div className="relative">
                  <select
                    id={reasoningEffortId}
                    name="reasoningEffort"
                    autoComplete="off"
                    value={reasoningEffort}
                    onChange={(e) =>
                      onReasoningEffortChange(e.target.value as EffortOption | '')
                    }
                    className="w-full min-w-0 appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {efforts?.includes('none') && reasoningEffort === '' && (
                      <option value="">Provider default</option>
                    )}
                    {!efforts?.includes('none') && <option value="">Off</option>}
                    {efforts?.map((effort) => (
                      <option key={effort} value={effort}>
                        {EFFORT_LABELS[effort]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none"
                  />
                </div>
              </div>
            )}

            {supportsThinkingToggle && (
              <div className="flex min-w-0 flex-col gap-2">
                <label
                  htmlFor={thinkingId}
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Thinking
                </label>
                <div className="relative">
                  <select
                    id={thinkingId}
                    name="thinking"
                    autoComplete="off"
                    value={disableThinking ? 'off' : 'on'}
                    onChange={(e) => onDisableThinkingChange(e.target.value === 'off')}
                    className="w-full min-w-0 appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="on">On (default)</option>
                    <option value="off">Off (enable_thinking: false)</option>
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none"
                  />
                </div>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
