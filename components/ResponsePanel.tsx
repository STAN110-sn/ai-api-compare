'use client';

import { MetricsDisplay } from './MetricsDisplay';
import { AlertCircle, Brain, CircleStop } from 'lucide-react';

interface ResponsePanelProps {
  providerName: string;
  content: string;
  reasoning?: string;
  isLoading: boolean;
  stopped?: boolean;
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

export function ResponsePanel({
  providerName,
  content,
  reasoning,
  isLoading,
  stopped,
  metrics,
  error,
}: ResponsePanelProps) {
  const statusLabel = isLoading
    ? 'Streaming...'
    : stopped
      ? 'Stopped'
      : content
        ? 'Complete'
        : 'Waiting...';
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
          <span
            className={`text-xs ${
              stopped && !isLoading
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-500'
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {error ? (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : content || reasoning ? (
          <div className="flex flex-col gap-3">
            {stopped && !isLoading && (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                <CircleStop className="h-3.5 w-3.5" />
                <span>Stopped by user</span>
              </div>
            )}
            {reasoning && reasoning.length > 0 && (
              <details
                open
                className="rounded-md border border-purple-200 dark:border-purple-900/50 bg-purple-50/60 dark:bg-purple-950/20"
              >
                <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-medium text-purple-700 dark:text-purple-300 select-none">
                  <Brain className="h-3.5 w-3.5" />
                  <span>Thinking</span>
                  {isLoading && !content && (
                    <span className="ml-1 text-purple-500/70 animate-pulse">…</span>
                  )}
                </summary>
                <pre className="whitespace-pre-wrap px-3 pb-3 pt-1 font-sans text-xs italic text-purple-900/80 dark:text-purple-200/70">
                  {reasoning}
                </pre>
              </details>
            )}
            {content && (
              <div className="prose dark:prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 dark:text-gray-200">
                  {content}
                </pre>
              </div>
            )}
          </div>
        ) : stopped ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <CircleStop className="h-5 w-5" />
            <span>Stopped before any output</span>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            {isLoading ? 'Waiting for response...' : 'No response yet'}
          </div>
        )}
      </div>

      {(metrics || isLoading) && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
          <MetricsDisplay metrics={metrics} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
