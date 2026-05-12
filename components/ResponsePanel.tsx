'use client';

import { MetricsDisplay } from './MetricsDisplay';
import { AlertCircle, Brain } from 'lucide-react';

interface ResponsePanelProps {
  providerName: string;
  content: string;
  reasoning?: string;
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

export function ResponsePanel({
  providerName,
  content,
  reasoning,
  isLoading,
  metrics,
  error,
}: ResponsePanelProps) {
  return (
    <div className="flex flex-col h-full rounded-lg border border-christmas-green/30 dark:border-christmas-gold/30 bg-white dark:bg-[#0f2a1d] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between border-b border-christmas-gold/40 bg-[#fbeee0] dark:bg-[#143626] px-4 py-3">
        <h3 className="font-semibold text-christmas-red-dark dark:text-emerald-100">
          {providerName}
        </h3>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="h-2 w-2 animate-pulse rounded-full bg-christmas-red" />
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
        ) : content || reasoning ? (
          <div className="flex flex-col gap-3">
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
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            {isLoading ? 'Waiting for response...' : 'No response yet'}
          </div>
        )}
      </div>

      {(metrics || isLoading) && (
        <div className="border-t border-christmas-gold/40 bg-[#fbeee0] dark:bg-[#143626] px-4 py-3">
          <MetricsDisplay metrics={metrics} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
