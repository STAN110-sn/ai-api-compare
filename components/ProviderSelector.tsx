'use client';

import { ChevronDown } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
}

interface ProviderSelectorProps {
  providers: Provider[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  label: string;
  disabledId?: string | null;
}

export function ProviderSelector({
  providers,
  selectedId,
  onSelect,
  label,
  disabledId,
}: ProviderSelectorProps) {
  const selectedProvider = providers.find((p) => p.id === selectedId);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <select
          value={selectedId || ''}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="" disabled>
            Select a provider
          </option>
          {providers.map((provider) => (
            <option
              key={provider.id}
              value={provider.id}
              disabled={provider.id === disabledId}
            >
              {provider.name} {provider.id === disabledId ? '(selected)' : ''}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
      </div>
      {selectedProvider && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {selectedProvider.name}
        </div>
      )}
    </div>
  );
}
