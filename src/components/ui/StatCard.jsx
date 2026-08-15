import { cn } from '../../utils/cn';

export function StatCard({ label, value, color, light, full, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl border shadow-sm border-l-[6px]',
        full && 'col-span-2',
        color === 'emerald'
          ? 'border-emerald-100 border-l-emerald-600'
          : 'border-rose-100 border-l-rose-500',
        light ? 'bg-emerald-50/30' : 'bg-white',
        onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''
      )}
    >
      <p className="text-[9px] font-black text-slate-400 tracking-wider mb-2">{label}</p>
      <p className={cn('text-3xl font-black', color === 'emerald' ? 'text-emerald-800' : 'text-rose-600')}>
        {value}
      </p>
    </div>
  );
}
