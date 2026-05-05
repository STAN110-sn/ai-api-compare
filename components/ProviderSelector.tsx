'use client';

import { ChevronDown } from 'lucide-react';
import { ModelConfig } from '@/lib/types';

interface Provider {
  id: string;
  name: string;
  models: ModelConfig[];
}

interface ProviderSelectorProps {
  providers: Provider[];
  selectedId: string | null;
  selectedModelId: string | null;
  onSelectProvider: (id: string) => void;
  onSelectModel: (modelId: string) => void;
  providerLabel: string;
  modelLabel: string;
  disabledProviderId?: string | null;
}

export function ProviderSelector({
  providers,
  selectedId,
  selectedModelId,
  onSelectProvider,
  onSelectModel,
  providerLabel,
  modelLabel,
  disabledProviderId,
}: ProviderSelectorProps) {
  const selectedProvider = providers.find((p) => p.id === selectedId);
  const availableModels = selectedProvider?.models || [];

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
              <option
                key={provider.id}
                value={provider.id}
                disabled={provider.id === disabledProviderId}
              >
                {provider.name} {provider.id === disabledProviderId ? '(selected)' : ''}
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
    </div>
  );
}
