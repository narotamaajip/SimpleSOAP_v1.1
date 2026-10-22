import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  LogOut,
  Trash2,
  Info,
  X
} from 'lucide-react';
import { cn } from '../utils/cn';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialogState, setDialogState] = useState(null);
  const [promptValue, setPromptValue] = useState('');
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : (options || {});
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        type: 'confirm',
        title: opts.title || 'Konfirmasi',
        message: opts.message || '',
        confirmText: opts.confirmText || 'Ya, Lanjutkan',
        cancelText: opts.cancelText || 'Batal',
        variant: opts.variant || 'primary',
        icon: opts.icon
      });
    });
  }, []);

  const alert = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : (options || {});
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        type: 'alert',
        title: opts.title || 'Pemberitahuan',
        message: opts.message || '',
        confirmText: opts.confirmText || opts.buttonText || 'Mengerti',
        variant: opts.variant || 'primary',
        icon: opts.icon
      });
    });
  }, []);

  const prompt = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : (options || {});
    setPromptValue(opts.defaultValue || '');
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        type: 'prompt',
        title: opts.title || 'Input Diperlukan',
        message: opts.message || '',
        placeholder: opts.placeholder || '',
        inputType: opts.inputType || 'text',
        matchText: opts.matchText || null,
        confirmText: opts.confirmText || 'Lanjutkan',
        cancelText: opts.cancelText || 'Batal',
        variant: opts.variant || 'primary',
        icon: opts.icon
      });
    });
  }, []);

  const handleClose = useCallback((value) => {
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
    setDialogState(null);
    setPromptValue('');
  }, []);

  // Keyboard accessibility: Escape to dismiss, Enter to confirm
  useEffect(() => {
    if (!dialogState) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(dialogState.type === 'prompt' ? null : false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogState, handleClose]);

  const renderIcon = () => {
    if (!dialogState) return null;
    const { variant, icon, type } = dialogState;

    if (React.isValidElement(icon)) return icon;

    if (icon === 'refresh') {
      return <RefreshCw size={26} className="text-cyan-800" />;
    }
    if (icon === 'logout') {
      return <LogOut size={26} className="text-amber-600" />;
    }
    if (icon === 'trash') {
      return <Trash2 size={26} className="text-rose-600" />;
    }

    if (variant === 'danger') {
      return <AlertTriangle size={28} className="text-rose-600" />;
    }
    if (variant === 'warning') {
      return <AlertCircle size={28} className="text-amber-600" />;
    }
    if (variant === 'success') {
      return <CheckCircle2 size={28} className="text-teal-600" />;
    }
    if (type === 'confirm') {
      return <HelpCircle size={28} className="text-cyan-800" />;
    }
    return <Info size={28} className="text-cyan-800" />;
  };

  const getIconWrapperClasses = () => {
    if (!dialogState) return '';
    const { variant } = dialogState;
    if (variant === 'danger') {
      return 'bg-rose-500/10 border border-rose-200/80 shadow-rose-500/10';
    }
    if (variant === 'warning') {
      return 'bg-amber-500/10 border border-amber-200/80 shadow-amber-500/10';
    }
    if (variant === 'success') {
      return 'bg-teal-500/10 border border-teal-200/80 shadow-teal-500/10';
    }
    return 'glass-subpanel border border-white/90 shadow-cyan-900/5';
  };

  const isPromptSubmitDisabled =
    dialogState?.type === 'prompt' &&
    dialogState.matchText &&
    promptValue.trim() !== dialogState.matchText.trim();

  return (
    <DialogContext.Provider value={{ confirm, alert, prompt }}>
      {children}

      <AnimatePresence>
        {dialogState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[999999] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleClose(dialogState.type === 'alert' ? true : (dialogState.type === 'prompt' ? null : false));
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 440, damping: 30 }}
              className="glass-dropdown rounded-[26px] max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative overflow-hidden border border-white/90"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close X Button in top right */}
              <button
                type="button"
                onClick={() =>
                  handleClose(dialogState.type === 'alert' ? true : (dialogState.type === 'prompt' ? null : false))
                }
                title="Tutup"
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1 rounded-full transition-colors active:scale-90"
              >
                <X size={16} />
              </button>

              {/* Status / Category Icon Pill */}
              <div
                className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-sm',
                  getIconWrapperClasses()
                )}
              >
                {renderIcon()}
              </div>

              {/* Content Header & Body */}
              <div className="space-y-1.5 px-1">
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight leading-snug">
                  {dialogState.title}
                </h3>
                {dialogState.message && (
                  <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                    {dialogState.message}
                  </p>
                )}
              </div>

              {/* Prompt Input Field (if prompt) */}
              {dialogState.type === 'prompt' && (
                <div className="pt-1">
                  <input
                    type={dialogState.inputType || 'text'}
                    autoFocus
                    placeholder={dialogState.placeholder}
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isPromptSubmitDisabled) {
                        e.preventDefault();
                        handleClose(promptValue);
                      }
                    }}
                    className="w-full p-3 rounded-2xl glass-input text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                  {dialogState.matchText && (
                    <p className="text-[10px] text-slate-400 font-medium mt-1.5 text-left">
                      Ketik tepat: <span className="font-mono font-bold text-slate-700">{dialogState.matchText}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-2">
                {dialogState.type === 'alert' ? (
                  <button
                    type="button"
                    autoFocus
                    onClick={() => handleClose(true)}
                    className={cn(
                      'w-full py-3 rounded-2xl font-bold text-xs active:scale-95 transition-all shadow-md',
                      dialogState.variant === 'danger'
                        ? 'bg-[#EF4444] text-white hover:bg-rose-600 shadow-rose-500/25'
                        : 'glass-btn-primary'
                    )}
                  >
                    {dialogState.confirmText}
                  </button>
                ) : (
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleClose(dialogState.type === 'prompt' ? null : false)}
                      className="flex-1 py-3 rounded-2xl glass-btn-secondary font-bold text-xs text-slate-700 active:scale-95 transition-all"
                    >
                      {dialogState.cancelText}
                    </button>
                    <button
                      type="button"
                      autoFocus
                      disabled={isPromptSubmitDisabled}
                      onClick={() =>
                        handleClose(dialogState.type === 'prompt' ? promptValue : true)
                      }
                      className={cn(
                        'flex-1 py-3 rounded-2xl font-bold text-xs active:scale-95 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed',
                        dialogState.variant === 'danger'
                          ? 'bg-[#EF4444] text-white hover:bg-rose-600 shadow-rose-500/25'
                          : 'glass-btn-primary'
                      )}
                    >
                      {dialogState.confirmText}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
