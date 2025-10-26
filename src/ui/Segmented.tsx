import React from 'react';

export type SegOption<T extends string> = { value: T; label: string; title?: string };

type Props<T extends string> = {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
};

export function Segmented<T extends string>({ value, options, onChange, className = '', size = 'md' }: Props<T>) {
  const pd = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';
  return (
    <div className={`inline-flex rounded-md border border-gray-200 bg-white ${className}`}>
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.title ?? opt.label}
            className={[
              'text-xs font-medium',
              pd,
              i > 0 ? 'border-l border-gray-200' : '',
              active ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100',
            ].join(' ')}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
