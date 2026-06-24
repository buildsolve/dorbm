import { ReactNode } from 'react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  trend?: { value: number; label: string };
}

const colorMap = {
  blue:   { icon: '#EBF3FF', text: '#1B66C9' },
  green:  { icon: '#E8F8EE', text: '#008A05' },
  orange: { icon: '#FFF3E8', text: '#C2410C' },
  red:    { icon: '#FFF0F3', text: '#E31C5F' },
  purple: { icon: '#F4EDFF', text: '#6F19C2' },
};

export default function StatCard({ title, value, subtitle, icon, color = 'blue', trend }: Props) {
  const c = colorMap[color];
  return (
    <div
      className="bg-white border border-[#EBEBEB] overflow-hidden transition-shadow hover:shadow-lg"
      style={{ borderRadius: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}
    >
      <div className="px-5 py-5 flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-[#6A6A6A] font-medium truncate">{title}</p>
          <p className="mt-2 text-[28px] font-bold text-[#222222] leading-none tracking-tight">{value}</p>
          {subtitle && <p className="mt-2 text-xs text-[#6A6A6A]">{subtitle}</p>}
          {trend && (
            <p className="mt-1 text-xs font-semibold" style={{ color: trend.value >= 0 ? '#008A05' : '#C13515' }}>
              {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 ml-3 shrink-0 rounded-full" style={{ background: c.icon, color: c.text }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
