'use client';

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
  const selectedProvider = providers.find((p) => p.id === selectedId);
  const availableModels = selectedProvider?.models || [];
  const selectedModel = availableModels.find((m) => m.id === selectedModelId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {providerLabel}
        </label>
        <div className="relative">
          <select
            value={selectedId || ''}
            onChange={(e) => onSelectProvider(e.target.value)}
            className="w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {availableModels.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {modelLabel}
          </label>
          <div className="relative">
            <select
              value={selectedModelId || ''}
              onChange={(e) => onSelectModel(e.target.value)}
              disabled={!selectedId}
              className="w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 disabled:opacity-50"
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
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>
      )}

      {(() => {
        const efforts = selectedModel?.reasoningEfforts;
        if (!efforts || efforts.length === 0) return null;
        // When the provider advertises 'none', it is the off state — no
        // separate "Off" option (the model default may be a reasoning level,
        // so "omit the param" would not mean off). If the UI state is ''
        // (no default advertised) but 'none' is offered, show it honestly
        // as "Provider default" instead of visually aliasing it to 'none'.
        return (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Reasoning effort
            </label>
            <div className="relative">
              <select
                value={reasoningEffort}
                onChange={(e) =>
                  onReasoningEffortChange(e.target.value as EffortOption | '')
                }
                className="w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {efforts.includes('none') && reasoningEffort === '' && (
                  <option value="">Provider default</option>
                )}
                {!efforts.includes('none') && <option value="">Off</option>}
                {efforts.map((e) => (
                  <option key={e} value={e}>
                    {EFFORT_LABELS[e]}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>
        );
      })()}

      {selectedModel?.supportsThinkingToggle && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Reasoning
          </label>
          <div className="relative">
            <select
              value={disableThinking ? 'off' : 'on'}
              onChange={(e) => onDisableThinkingChange(e.target.value === 'off')}
              className="w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="on">On (default)</option>
              <option value="off">Off (enable_thinking: false)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
}
