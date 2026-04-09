import React, { useState } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { isFirestoreQuotaExceededError, isFirestoreSyncPaused, pauseFirestoreForToday } from '../services/firestoreService';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Mail, Lock, ArrowLeft, AlertCircle, CheckCircle, Eye, EyeOff, DollarSign, CalendarDays, Heart } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot-password';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const Auth: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const syncUserProfile = async (user: Awaited<ReturnType<typeof signInWithPopup>>['user'], nextDisplayName?: string) => {
    if (isFirestoreSyncPaused()) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: nextDisplayName ?? user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
        return;
      }
      await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
    } catch (err) {
      if (isFirestoreQuotaExceededError(err)) {
        pauseFirestoreForToday();
        console.warn('Firestore quota exceeded during auth sync.');
        return;
      }
      throw err;
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncUserProfile(result.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'login') {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await syncUserProfile(result.user);
      } else if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        await syncUserProfile(result.user, displayName);
      } else if (mode === 'forgot-password') {
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset email sent! Check your inbox.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Left branding panel – hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-16 relative overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-80px] right-[-80px] w-[300px] h-[300px] bg-teal-600/20 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center"
        >
          <img
            src="/icons/icon-192.svg"
            alt="Younesslifehub logo"
            className="w-28 h-28 mx-auto mb-8 drop-shadow-2xl"
          />
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4">
            Younesslifehub
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed max-w-sm mx-auto">
            Your all-in-one dashboard for planning, wellbeing, and professional growth.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[
              { label: 'Finance', icon: <DollarSign className="h-6 w-6 text-indigo-300" /> },
              { label: 'Schedule', icon: <CalendarDays className="h-6 w-6 text-indigo-300" /> },
              { label: 'Wellness', icon: <Heart className="h-6 w-6 text-indigo-300" /> },
            ].map(({ label, icon }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex justify-center mb-2">{icon}</div>
                <div className="text-white/70 text-xs font-medium">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
            {/* Logo – shown on mobile only */}
            <div className="flex lg:hidden justify-center mb-6">
               <img src="/icons/icon-192.svg" alt="Younesslifehub" className="w-16 h-16" />
            </div>

            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">
                {mode === 'login' && 'Welcome back'}
                {mode === 'signup' && 'Create your account'}
                {mode === 'forgot-password' && 'Reset your password'}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                 {mode === 'login' && 'Sign in to your Younesslifehub account'}
                {mode === 'signup' && 'Get started — it only takes a minute'}
                {mode === 'forgot-password' && "We'll send a reset link to your email"}
              </p>
            </div>

            {/* Alerts */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-3"
                >
                  <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-300">{message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Display Name
                  </label>
                  <div className="relative">
                    <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Your Name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {mode !== 'forgot-password' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot-password')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-900/40 hover:shadow-indigo-700/40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' && 'Sign In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot-password' && 'Send Reset Link'}
                  </>
                )}
              </button>
            </form>

            {/* Divider + Google */}
            {mode !== 'forgot-password' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-transparent text-xs text-slate-500 font-medium">or continue with</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl text-sm transition-all"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              </>
            )}

            {/* Footer links */}
            <div className="mt-6 text-center text-sm">
              {mode === 'login' && (
                <p className="text-slate-400">
                  Don't have an account?{' '}
                  <button onClick={() => switchMode('signup')} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                    Sign up
                  </button>
                </p>
              )}
              {mode === 'signup' && (
                <p className="text-slate-400">
                  Already have an account?{' '}
                  <button onClick={() => switchMode('login')} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                    Sign in
                  </button>
                </p>
              )}
              {mode === 'forgot-password' && (
                <button
                  onClick={() => switchMode('login')}
                  className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
