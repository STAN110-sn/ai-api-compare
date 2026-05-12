'use client';

import { Send } from 'lucide-react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled,
}: PromptInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disabled && !isLoading && value.trim()) {
      onSubmit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!disabled && !isLoading && value.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label className="text-sm font-medium text-christmas-green-dark dark:text-emerald-100">
        Prompt
      </label>
      <div className="flex gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your prompt here..."
          rows={3}
          className="flex-1 resize-none rounded-lg border border-christmas-green/30 dark:border-christmas-gold/30 bg-white dark:bg-[#0f2a1d] px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-christmas-red focus:outline-none focus:ring-2 focus:ring-christmas-red/20"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={disabled || isLoading || !value.trim()}
          className="flex items-center justify-center rounded-lg bg-christmas-green px-6 text-white ring-2 ring-christmas-gold/50 transition-colors hover:bg-christmas-green-dark disabled:cursor-not-allowed disabled:bg-gray-400 disabled:ring-transparent disabled:opacity-50"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </form>
  );
}
