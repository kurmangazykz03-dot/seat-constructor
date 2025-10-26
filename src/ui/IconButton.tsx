import React from 'react';
import { tokens } from './tokens';

type Props = {
  label: string;          // короткая подпись на кнопке (или иконка-символ)
  ariaLabel?: string;     // подсказка для скринридеров
  active?: boolean;
  disabled?: boolean;
  title?: string;         // tooltip (native)
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md';
};

export const IconButton: React.FC<Props> = ({
  label,
  ariaLabel,
  active,
  disabled,
  title,
  onClick,
  className = '',
  size = 'md',
}) => {
  const ht = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      title={title ?? ariaLabel ?? label}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center',
        ht,
        'rounded-md border',
        active ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-800',
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100',
        'transition-colors',
        className,
      ].join(' ')}
      style={{ boxShadow: active ? tokens.shadow : 'none' }}
    >
      <span className="text-[12px] font-semibold select-none">{label}</span>
    </button>
  );
};
