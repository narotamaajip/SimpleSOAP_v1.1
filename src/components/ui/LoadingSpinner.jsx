import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

export function LoadingSpinner({ text }) {
  return (
    <div className="max-w-md mx-auto h-screen bg-[#f8fcf9] flex items-center justify-center border-x border-slate-200">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Activity className="text-emerald-600" size={40} />
        </motion.div>
        <p className="text-emerald-800 font-bold text-sm animate-pulse">{text}</p>
      </div>
    </div>
  );
}
