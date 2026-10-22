import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Key, Activity } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AmbientBackground } from '../components/ui/AmbientBackground';
import { cn } from '../utils/cn';

export default function ForgotPasswordView({ onBack }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage({
        type: 'success',
        text: 'Link reset password telah dikirim. Silakan cek inbox/spam email Anda.'
      });
      setEmail('');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setMessage({ type: 'error', text: 'Email tidak terdaftar.' });
      } else {
        setMessage({ type: 'error', text: 'Gagal mengirim email. Coba lagi.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen liquid-canvas flex flex-col items-center justify-center border-x border-white/60 p-6 relative overflow-hidden">
      <AmbientBackground />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        className="w-full max-w-sm glass-card rounded-3xl p-6 space-y-6 z-10"
      >
        <div className="text-center space-y-2">
          <div className="glass-subpanel w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Key className="text-cyan-700" size={28} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Lupa Password?</h1>
          <p className="text-xs font-medium text-slate-500">
            Masukkan email Anda untuk menerima link reset password.
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          {message.text && (
            <div
              className={cn(
                'p-3 text-xs font-bold rounded-2xl border text-center',
                message.type === 'error'
                  ? 'bg-rose-500/12 text-rose-700 border-rose-200/80'
                  : 'bg-teal-500/12 text-teal-800 border-teal-200/80'
              )}
            >
              {message.text}
            </div>
          )}
          <input
            type="email"
            required
            placeholder="Alamat Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 rounded-2xl glass-input text-sm font-medium text-slate-800"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 glass-btn-primary font-bold text-sm rounded-2xl flex items-center justify-center"
          >
            {isSubmitting ? <Activity className="animate-spin" size={20} /> : 'Kirim Link Reset'}
          </button>
        </form>

        <button
          onClick={onBack}
          className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1"
        >
          <ChevronLeft size={14} /> Kembali ke Login
        </button>
      </motion.div>
    </div>
  );
}
