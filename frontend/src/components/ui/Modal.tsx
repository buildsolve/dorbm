import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export default function Modal({ title, onClose, children, size = 'md' }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div
        className={`bg-white w-full ${sizes[size]} max-h-[90vh] flex flex-col`}
        style={{ borderRadius: 20, boxShadow: '0 16px 48px rgba(0,0,0,0.22)' }}
      >
        <div
          className="flex items-center px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid #EBEBEB' }}
        >
          <button
            onClick={onClose}
            className="text-[#222222] hover:bg-[#F7F7F7] p-1.5 rounded-full transition-colors -ml-1.5"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="flex-1 text-center text-[15px] font-bold text-[#222222] pr-7">{title}</h2>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
