import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, AlertTriangle, Activity } from 'lucide-react';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AmbientBackground } from '../components/ui/AmbientBackground';
import { cn } from '../utils/cn';

export default function UnverifiedEmailView({ onLogout }) {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleResend = async () => {
    setIsResending(true);
    setMessage({ type: '', text: '' });
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setMessage({
          type: 'success',
          text: 'Email verifikasi telah dikirim ulang. Silakan cek inbox/spam Anda.'
        });
      }
    } catch (err) {
      console.error(err);
      setMessage({
        type: 'error',
        text: 'Gagal mengirim email. Tunggu beberapa saat sebelum mencoba lagi.'
      });
    }
    setIsResending(false);
  };

  const handleReload = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen liquid-canvas flex flex-col items-center justify-center border-x border-white/60 p-6 text-center relative overflow-hidden">
      <AmbientBackground />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        className="w-full max-w-sm glass-card rounded-3xl p-6 space-y-6 z-10 flex flex-col items-center"
      >
        <div className="glass-subpanel p-4 rounded-2xl">
          <AlertTriangle className="text-amber-600" size={40} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Verifikasi Email Anda</h1>
          <p className="text-xs font-medium text-slate-500 leading-relaxed">
            Link verifikasi telah dikirim ke{' '}
            <span className="font-bold text-slate-800">{auth.currentUser?.email}</span>. Silakan klik link
            tersebut untuk mengaktifkan akun Anda.
          </p>
        </div>

        {message.text && (
          <div
            className={cn(
              'w-full p-3 text-xs font-bold rounded-2xl border',
              message.type === 'error'
                ? 'bg-rose-500/12 text-rose-700 border-rose-200/80'
                : 'bg-teal-500/12 text-teal-800 border-teal-200/80'
            )}
          >
            {message.text}
          </div>
        )}

        <div className="w-full space-y-3 pt-2">
          <button
            onClick={handleReload}
            className="w-full py-4 glass-btn-primary font-bold text-sm rounded-2xl flex items-center justify-center gap-2"
          >
            <Activity size={18} /> Saya Sudah Verifikasi
          </button>
          <button
            onClick={handleResend}
            disabled={isResending}
            className="w-full py-4 glass-btn-secondary text-slate-700 font-bold text-sm rounded-2xl"
          >
            {isResending ? 'Mengirim...' : 'Kirim Ulang Email'}
          </button>
        </div>

        <button
          onClick={onLogout}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 pt-2"
        >
          <ChevronLeft size={14} /> Kembali ke Login
        </button>
      </motion.div>
    </div>
  );
}
