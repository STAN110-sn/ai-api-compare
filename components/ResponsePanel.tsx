'use client';

import { MetricsDisplay } from './MetricsDisplay';
import { AlertCircle } from 'lucide-react';

interface ResponsePanelProps {
  providerName: string;
  content: string;
  isLoading: boolean;
  metrics: {
    latency: number;
    tokens: {
      total: number;
      prompt: number;
      completion: number;
    } | null;
  } | null;
  error?: string;
}

export function ResponsePanel({
  providerName,
  content,
  isLoading,
  metrics,
  error,
}: ResponsePanelProps) {
  return (
    <div className="flex flex-col h-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {providerName}
        </h3>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          )}
          <span className="text-xs text-gray-500">
            {isLoading ? 'Streaming...' : content ? 'Complete' : 'Waiting...'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {error ? (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : content ? (
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 dark:text-gray-200">
              {content}
            </pre>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            {isLoading ? 'Waiting for response...' : 'No response yet'}
          </div>
        )}
      </div>

      {(metrics || isLoading) && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-2">
          <MetricsDisplay metrics={metrics} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
