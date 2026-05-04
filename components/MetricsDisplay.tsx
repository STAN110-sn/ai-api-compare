'use client';

import { Clock, Hash } from 'lucide-react';

interface Metrics {
  latency: number;
  tokens: {
    total: number;
    prompt: number;
    completion: number;
  } | null;
}

interface MetricsDisplayProps {
  metrics: Metrics | null;
  isLoading: boolean;
}

export function MetricsDisplay({ metrics, isLoading }: MetricsDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Measuring...
        </span>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
        <Clock className="h-3.5 w-3.5" />
        <span className="font-medium">{metrics.latency}ms</span>
        <span className="text-gray-400">E2E latency</span>
      </div>
      {metrics.tokens && metrics.tokens.total > 0 && (
        <>
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <Hash className="h-3.5 w-3.5" />
            <span className="font-medium">{metrics.tokens.total.toLocaleString()}</span>
            <span className="text-gray-400">total tokens</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <span>({metrics.tokens.prompt.toLocaleString()} prompt + {metrics.tokens.completion.toLocaleString()} completion)</span>
          </div>
        </>
      )}
    </div>
  );
}
