import { useState } from 'react';
import { ChevronLeft, Key, Activity } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
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
    <div className="max-w-md mx-auto h-screen bg-white flex flex-col items-center justify-center border-x border-slate-200 p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Key className="text-emerald-600" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Lupa Password?</h1>
          <p className="text-sm font-medium text-slate-500">
            Masukkan email Anda untuk menerima link reset password.
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          {message.text && (
            <div
              className={cn(
                'p-3 text-xs font-bold rounded-lg border text-center',
                message.type === 'error'
                  ? 'bg-rose-50 text-rose-600 border-rose-100'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              )}
            >
              {message.text}
            </div>
          )}
          <input
            type="email" required placeholder="Alamat Email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-colors"
          />
          <button
            type="submit" disabled={isSubmitting}
            className="w-full py-4 bg-emerald-600 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-transform flex items-center justify-center"
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
      </div>
    </div>
  );
}
