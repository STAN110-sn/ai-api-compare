'use client';

import { MetricsDisplay } from './MetricsDisplay';
import { AlertCircle, Brain, CircleStop } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const remarkPlugins = [remarkGfm];
const markdownComponents: Components = {
  table({ children }) {
    return (
      <div className="my-5 max-w-full overflow-x-auto">
        <table className="my-0 w-full">{children}</table>
      </div>
    );
  },
};

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
    ? 'Streaming…'
    : stopped
      ? 'Stopped'
      : content
        ? 'Complete'
        : 'Waiting…';
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50">
        <h3 className="min-w-0 break-words font-semibold text-gray-900 dark:text-gray-100">
          {providerName}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          {isLoading && (
            <div
              aria-hidden="true"
              className="h-2 w-2 animate-pulse rounded-full bg-blue-500"
            />
          )}
          <span
            aria-live="polite"
            aria-atomic="true"
            className={`break-words text-xs ${
              stopped && !isLoading
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-500'
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-auto p-4">
        {error ? (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
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
              <details className="rounded-md border border-purple-200 bg-purple-50/60 dark:border-purple-900/50 dark:bg-purple-950/20">
                <summary className="flex cursor-pointer select-none items-center gap-1.5 px-3 py-2 text-xs font-medium text-purple-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:text-purple-300">
                  <Brain aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>Thinking</span>
                  {isLoading && !content && (
                    <span aria-hidden="true" className="ml-1 animate-pulse text-purple-500/70">
                      …
                    </span>
                  )}
                </summary>
                <pre className="whitespace-pre-wrap break-words px-3 pb-3 pt-1 font-sans text-xs italic text-purple-900/80 dark:text-purple-200/70">
                  {reasoning}
                </pre>
              </details>
            )}
            {content && (
              <div className="prose prose-sm dark:prose-invert prose-headings:text-pretty prose-pre:max-w-full max-w-none min-w-0 break-words [overflow-wrap:anywhere]">
                <ReactMarkdown
                  remarkPlugins={remarkPlugins}
                  components={markdownComponents}
                >
                  {content}
                </ReactMarkdown>
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
            {isLoading ? 'Waiting for response…' : 'No response yet'}
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
