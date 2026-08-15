import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 transition-all px-8 relative',
        active ? 'text-emerald-700' : 'text-slate-400'
      )}
    >
      {icon}
      <span className="text-[10px] font-bold tracking-wide">{label}</span>
      {active && (
        <motion.div
          layoutId="nav-pill"
          className="absolute -top-3 w-1.5 h-1.5 bg-emerald-700 rounded-full"
        />
      )}
    </button>
  );
}
