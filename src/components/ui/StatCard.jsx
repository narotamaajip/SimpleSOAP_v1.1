import { cn } from '../../utils/cn';

export function StatCard({ label, value, color, light, full, onClick }) {
  const isEmerald = color === 'emerald';

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 pl-5 rounded-2xl relative overflow-hidden',
        onClick ? 'glass-card-interactive cursor-pointer' : 'glass-card',
        full && 'col-span-2',
        light && 'bg-emerald-50/35'
      )}
    >
      {/* Full-height flush left accent strip */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-[5px]',
          isEmerald ? 'bg-[#10B981]' : 'bg-[#EF4444]'
        )}
      />
      <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <p
        className={cn(
          'text-3xl font-black tracking-tight',
          isEmerald ? 'text-emerald-800' : 'text-[#EF4444]'
        )}
      >
        {value}
      </p>
    </div>
  );
}
