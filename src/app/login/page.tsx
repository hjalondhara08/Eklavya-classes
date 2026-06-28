'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) {
      if (err === 'CredentialsSignin') {
        setError('Invalid email or password');
      } else {
        setError(err);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-navy relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-gold/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-white rounded-card shadow-premium overflow-hidden z-10 border border-slate-100">
        {/* Header Banner */}
        <div className="bg-navy p-8 text-center flex flex-col items-center relative border-b border-navy-light/10">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-3 overflow-hidden p-1">
            <img src="/logo.png" alt="Eklavya Classes Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-gold tracking-wide">EKLAVYA CLASSES</h2>
          <p className="font-gujarati text-xs text-slate-200 mt-1">જ્ઞાનથી ઉજ્જવળ ભવિષ્ય તરફ ✨</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-800 font-sans">Welcome Back</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">Log in to manage tuition records</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-btn flex items-center text-xs text-brand-red">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Username/Email Field */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Username / Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-navy text-white text-sm font-semibold rounded-btn hover:bg-navy-light focus:outline-none shadow-md hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-75"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
            ) : null}
            Sign In
          </button>
        </form>
      </div>
      
      {/* Footer */}
      <p className="text-xs text-slate-400 font-gujarati mt-6 text-center z-10">
        Eklavya Classes © 2026 · Anand Nagar & Kanbivad
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-navy">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
