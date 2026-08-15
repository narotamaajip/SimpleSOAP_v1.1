import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export function AccordionSection({ title, isActive, onClick, children }) {
  return (
    <div className="border border-emerald-100 rounded-lg overflow-hidden bg-white shadow-sm">
      <button
        onClick={onClick}
        className={cn(
          'w-full px-4 py-3.5 flex items-center justify-between font-bold text-slate-800 transition-colors',
          isActive ? 'bg-emerald-50/50' : 'bg-emerald-50/30'
        )}
      >
        <span>{title}</span>
        <ChevronDown
          size={18}
          className={cn('transition-transform text-slate-500', isActive ? 'rotate-180' : '')}
        />
      </button>
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-emerald-50/10"
          >
            <div className="p-4 border-t border-emerald-50">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
