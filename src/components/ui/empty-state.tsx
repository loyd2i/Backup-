import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: { wrapper: 'py-8', badge: 'w-12 h-12', icon: 'w-5 h-5', title: 'text-sm' },
  md: { wrapper: 'py-12', badge: 'w-16 h-16', icon: 'w-7 h-7', title: 'text-lg' },
  lg: { wrapper: 'py-16', badge: 'w-20 h-20', icon: 'w-8 h-8', title: 'text-xl' },
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  const s = sizeStyles[size];

  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6', s.wrapper, className)}>
      <div className={cn('rounded-2xl bg-[#2a2a2a] flex items-center justify-center mb-4', s.badge)}>
        <Icon className={cn('text-gray-500', s.icon)} />
      </div>
      <p className={cn('text-gray-300 font-medium', s.title)}>{title}</p>
      {description && (
        <p className="text-gray-500 text-sm mt-1.5 max-w-xs">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 bg-[#6366f1] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#5558e3] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
