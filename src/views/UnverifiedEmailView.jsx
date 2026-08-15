import { useState } from 'react';
import { ChevronLeft, AlertTriangle, Activity } from 'lucide-react';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../lib/firebase';
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
    <div className="max-w-md mx-auto h-screen bg-slate-50 flex flex-col items-center justify-center border-x border-slate-200 p-6 text-center space-y-6">
      <div className="bg-amber-100 p-4 rounded-full">
        <AlertTriangle className="text-amber-600" size={48} />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Verifikasi Email Anda</h1>
        <p className="text-sm font-medium text-slate-500">
          Link verifikasi telah dikirim ke{' '}
          <span className="font-bold text-slate-800">{auth.currentUser?.email}</span>. Silakan klik link
          tersebut untuk mengaktifkan akun Anda.
        </p>
      </div>

      {message.text && (
        <div
          className={cn(
            'w-full p-3 text-xs font-bold rounded-lg border',
            message.type === 'error'
              ? 'bg-rose-50 text-rose-600 border-rose-100'
              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          )}
        >
          {message.text}
        </div>
      )}

      <div className="w-full space-y-3 pt-4">
        <button
          onClick={handleReload}
          className="w-full py-4 bg-emerald-600 text-white font-black text-sm rounded-xl shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <Activity size={18} /> Saya Sudah Verifikasi
        </button>
        <button
          onClick={handleResend} disabled={isResending}
          className="w-full py-4 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-transform"
        >
          {isResending ? 'Mengirim...' : 'Kirim Ulang Email'}
        </button>
      </div>

      <button
        onClick={onLogout}
        className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 mt-6"
      >
        <ChevronLeft size={14} /> Kembali ke Login
      </button>
    </div>
  );
}
