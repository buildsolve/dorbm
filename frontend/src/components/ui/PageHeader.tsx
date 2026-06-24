import { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
      <div>
        <h1 className="text-[26px] font-bold text-[#222222] tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#6A6A6A]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
