'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { signIn, signUp, isLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (isSignUp) {
      const { error, needsEmailConfirmation } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else if (needsEmailConfirmation) {
        setSuccessMessage('Please check your email to confirm your account');
      } else {
        setSuccessMessage('Account created successfully! You can now sign in.');
        setIsSignUp(false);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="animate-slide-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
                  <span className="text-4xl">📖</span>
                </div>
              </div>
            </div>
            <h1 className="font-display text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Vocab Master
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              {isSignUp ? 'Start your learning journey' : 'Welcome back'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-medium border border-slate-200/50 dark:border-slate-700/50 p-8">
            {error && (
              <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mb-6 p-4 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800/50 rounded-2xl text-accent-600 dark:text-accent-400 text-sm flex items-center gap-2">
                <span>✓</span>
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-slate-400"
                    required
                    minLength={6}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Must be at least 6 characters
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-soft hover:shadow-medium active:scale-[0.98]"
              >
                {isLoading
                  ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      Loading...
                    </span>
                  )
                  : isSignUp
                  ? 'Create Account'
                  : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccessMessage('');
                }}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium text-sm transition-colors"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Your data is securely stored in the cloud with Supabase
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
