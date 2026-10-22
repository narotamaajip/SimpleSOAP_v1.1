import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export function AccordionSection({ title, isActive, onClick, children }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden transition-all duration-200">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full px-4 py-3.5 flex items-center justify-between font-bold text-sm text-slate-800 transition-colors active:scale-[0.99]',
          isActive ? 'bg-white/65 text-cyan-950' : 'hover:bg-white/45'
        )}
      >
        <span className="tracking-tight">{title}</span>
        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200',
            isActive ? 'bg-cyan-700/10 text-cyan-800 rotate-180' : 'bg-slate-200/50 text-slate-500'
          )}
        >
          <ChevronDown size={16} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-white/75 bg-white/30">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
