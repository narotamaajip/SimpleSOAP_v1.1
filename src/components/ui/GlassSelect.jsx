import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export function GlassSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Pilih...',
  className = '',
  buttonClassName = ''
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-2xl glass-input flex items-center justify-between gap-1.5 text-left text-xs font-semibold text-slate-700 active:scale-[0.98] transition-all',
          open && 'ring-2 ring-cyan-600/15 border-cyan-600/40 bg-white/90',
          buttonClassName
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          size={14}
          className={cn(
            'text-slate-400 shrink-0 transition-transform duration-200',
            open && 'rotate-180 text-cyan-700'
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ type: 'spring', stiffness: 430, damping: 30, mass: 0.7 }}
            style={{ transformOrigin: 'top center' }}
            className="absolute right-0 left-0 mt-1.5 z-50 glass-dropdown rounded-2xl p-1.5 max-h-60 overflow-y-auto no-scrollbar"
          >
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between gap-2 transition-all active:scale-[0.98]',
                    isSelected
                      ? 'bg-cyan-700/10 text-cyan-900 font-bold'
                      : 'text-slate-700 hover:bg-white/75'
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={13} className="text-cyan-700 shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
