import { useState } from 'react';
import { Activity } from 'lucide-react';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogoIcon } from '../components/ui/Logo';
import { getFriendlyErrorMessage } from '../utils/friendlyError';

export function LoginView({ onSwitch, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      setError(getFriendlyErrorMessage(err, 'Email atau password salah. Silakan periksa kembali.'));
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setError(getFriendlyErrorMessage(err, 'Gagal masuk dengan akun Google.'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-white flex flex-col items-center justify-center border-x border-slate-200 p-6 overflow-y-auto">
      <div className="w-full max-w-sm space-y-6 my-auto py-6">
        <div className="text-center space-y-2">
          <div className="bg-emerald-50 border border-emerald-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <LogoIcon className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">SimpleSOAP</h1>
          <p className="text-sm font-medium text-slate-500">Masuk untuk mengakses rekam medis pasien.</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg border border-rose-100 text-center leading-relaxed">
            {error}
          </div>
        )}

        {/* Primary Action: Google Sign In */}
        <div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <Activity className="animate-spin" size={20} />
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" className="bg-white rounded-full p-0.5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Masuk dengan Google
              </>
            )}
          </button>
        </div>

        {/* Separator for legacy email login */}
        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-slate-200" />
          <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            Atau Email Terdaftar
          </span>
          <div className="flex-grow border-t border-slate-200" />
        </div>

        {/* Legacy Email/Password Login Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Alamat Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-colors"
          />
          <div className="space-y-1">
            <input
              type="password"
              required
              placeholder="Kata Sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs font-bold text-slate-400 hover:text-emerald-700 transition-colors"
              >
                Lupa Password?
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow active:scale-[0.98] transition-transform flex items-center justify-center"
          >
            {isSubmitting ? <Activity className="animate-spin" size={20} /> : 'Masuk dengan Email'}
          </button>
        </form>

        <div className="pt-2 text-center">
          <p className="text-xs font-bold text-slate-500">
            Dokter baru?{' '}
            <button onClick={onSwitch} className="text-emerald-600 font-bold hover:underline">
              Daftar sekarang
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
