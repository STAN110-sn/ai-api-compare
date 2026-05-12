'use client';

import { Clock, Hash, DollarSign, Zap } from 'lucide-react';

interface Metrics {
  latency: number;
  tokens: {
    total: number;
    prompt: number;
    completion: number;
  } | null;
  cost: number | null;
  tokensPerSec: number | null;
}

interface MetricsDisplayProps {
  metrics: Metrics | null;
  isLoading: boolean;
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0';
  if (cost < 0.0001) return '<$0.0001';
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatLatency(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

export function MetricsDisplay({ metrics, isLoading }: MetricsDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock className="h-4 w-4 animate-pulse" />
        <span>Measuring...</span>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const tokensTotal = metrics.tokens?.total ?? null;
  const promptCompletion = metrics.tokens
    ? `${metrics.tokens.prompt.toLocaleString()} + ${metrics.tokens.completion.toLocaleString()}`
    : null;

  type Cell = {
    icon: typeof Clock;
    label: string;
    value: string;
    sub?: string | null;
  };

  const cells: Cell[] = [
    {
      icon: Clock,
      label: 'Latency',
      value: formatLatency(metrics.latency),
    },
    {
      icon: Hash,
      label: 'Tokens',
      value: tokensTotal !== null ? tokensTotal.toLocaleString() : '—',
      sub: promptCompletion,
    },
    {
      icon: DollarSign,
      label: 'Cost',
      value: metrics.cost !== null ? formatCost(metrics.cost) : '—',
    },
    {
      icon: Zap,
      label: 'Speed',
      value:
        metrics.tokensPerSec !== null
          ? `${metrics.tokensPerSec.toFixed(1)} tok/s`
          : '—',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cells.map(({ icon: Icon, label, value, sub }) => (
        <div
          key={label}
          className="flex flex-col gap-0.5 rounded-md border border-christmas-gold/40 bg-white dark:bg-[#0f2a1d] px-3 py-2"
        >
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-christmas-green-dark dark:text-emerald-200/80">
            <Icon className="h-3 w-3 text-christmas-red" />
            <span>{label}</span>
          </div>
          <div className="text-2xl font-semibold tabular-nums text-christmas-red-dark dark:text-gray-100">
            {value}
          </div>
          {sub && (
            <div className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
              {sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
