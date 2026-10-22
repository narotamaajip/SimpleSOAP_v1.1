import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { AmbientBackground } from './AmbientBackground';

export function LoadingSpinner({ text }) {
  return (
    <div className="max-w-md mx-auto h-screen liquid-canvas flex items-center justify-center border-x border-white/60 relative overflow-hidden">
      <AmbientBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="glass-card rounded-3xl px-8 py-7 flex flex-col items-center gap-4 z-10"
      >
        <div className="w-14 h-14 rounded-2xl glass-subpanel flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          >
            <Activity className="text-cyan-700" size={28} />
          </motion.div>
        </div>
        <p className="text-slate-700 font-semibold text-xs tracking-wide animate-pulse">{text}</p>
      </motion.div>
    </div>
  );
}
