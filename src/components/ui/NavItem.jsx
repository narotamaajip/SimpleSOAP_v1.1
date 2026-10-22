import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center gap-0.5 px-5 py-1 rounded-xl transition-all duration-200 active:scale-95',
        active ? 'text-teal-700' : 'text-slate-400 hover:text-slate-600'
      )}
    >
      {active && (
        <motion.div
          layoutId="nav-pill"
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="absolute inset-0 rounded-xl bg-white/90 border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_3px_10px_-2px_rgba(13,148,136,0.14)] -z-10"
        />
      )}
      <div className={cn('transition-transform duration-200', active && 'scale-105')}>
        {icon}
      </div>
      <span className={cn('text-[10px] tracking-wide leading-tight', active ? 'font-extrabold text-teal-800' : 'font-semibold')}>
        {label}
      </span>
    </button>
  );
}
