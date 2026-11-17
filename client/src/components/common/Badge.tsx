import React from 'react';

export type BadgeVariant = 'demo' | 'public' | 'restricted' | 'online' | 'synced' | 'offline' | 'unknown' | 'info' | 'gray' | 'real' | 'pending' | 'partial';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'info',
  children,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs font-medium';

  const variantMap: Record<BadgeVariant, string> = {
    real: 'bg-emerald-600 text-white font-semibold shadow-xs',
    partial: 'bg-teal-700 text-white font-semibold shadow-xs',
    pending: 'bg-amber-600 text-white font-semibold shadow-xs',
    demo: 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold',
    public: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    restricted: 'bg-rose-100 text-rose-800 border border-rose-300',
    online: 'bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1',
    synced: 'bg-sky-50 text-sky-700 border border-sky-300 flex items-center gap-1',
    offline: 'bg-rose-50 text-rose-700 border border-rose-300 flex items-center gap-1',
    unknown: 'bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1',
    info: 'bg-blue-100 text-blue-800 border border-blue-200',
    gray: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  return (
    <span className={`inline-flex items-center rounded-full ${sizeClasses} ${variantMap[variant]} ${className}`}>
      {variant === 'online' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
      {variant === 'synced' && <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>}
      {variant === 'offline' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>}
      {children}
    </span>
  );
};
