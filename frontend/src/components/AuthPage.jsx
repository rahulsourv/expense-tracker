import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Sparkles,
  Shield,
  Zap,
  PiggyBank,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

export const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(isLogin, email, password, displayName);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: PiggyBank, text: 'Track expenses & savings', color: 'bg-neo-green' },
    { icon: BarChart3, text: 'Smart analytics & budgets', color: 'bg-neo-pink' },
    { icon: Zap, text: 'Investment portfolio SIPs', color: 'bg-neo-yellow' },
    { icon: Shield, text: 'Your data, always secure', color: 'bg-neo-cyan' },
  ];

  return (
    <div className="min-h-screen bg-neo-bg flex items-center justify-center px-4 py-8">
      <div className="max-w-4xl w-full flex flex-col lg:flex-row gap-6 lg:gap-0">
        {/* Left Panel - Branding */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:w-1/2 lg:pr-8 flex flex-col justify-center"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-black text-neo-yellow p-3 border-2 border-black shadow-brutal rotate-[-3deg]">
              <TrendingUp className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase">NYNET</h1>
              <p className="text-[10px] md:text-xs font-black uppercase leading-tight max-w-[220px]">NOT YOUR NORMAL EXPENSE TRACKER</p>
            </div>
          </div>

          <p className="text-sm font-bold text-black/70 font-mono uppercase tracking-wide mb-6">
            Not your normal expense tracker // personal finance system
          </p>

          <div className="space-y-3 mb-6">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className={`${feat.color} p-2 border-2 border-black shadow-brutal-sm`}>
                  <feat.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold uppercase">{feat.text}</span>
              </motion.div>
            ))}
          </div>

          <div className="hidden lg:block brutal-badge bg-black text-white text-[10px] w-fit">
            PRO V2.5 • PostgreSQL-BACKED
          </div>
        </motion.div>

        {/* Right Panel - Auth Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:w-1/2"
        >
          <div className="brutal-card bg-white p-6 md:p-8">
            {/* Tab Switcher */}
            <div className="flex mb-6 border-2 border-black">
              <button
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 px-4 py-2.5 text-sm font-black uppercase transition-all flex items-center justify-center gap-2 ${
                  isLogin
                    ? 'bg-neo-yellow text-black shadow-[inset_0_-3px_0_0_#000]'
                    : 'bg-white text-black/50 hover:bg-neo-cream'
                }`}
              >
                <LogIn className="w-4 h-4" />
                LOGIN
              </button>
              <button
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 px-4 py-2.5 text-sm font-black uppercase transition-all flex items-center justify-center gap-2 border-l-2 border-black ${
                  !isLogin
                    ? 'bg-neo-green text-black shadow-[inset_0_-3px_0_0_#000]'
                    : 'bg-white text-black/50 hover:bg-neo-cream'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                SIGN UP
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.form
                key={isLogin ? 'login' : 'signup'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Display Name (signup only) */}
                {!isLogin && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
                      Display Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Rahul"
                        className="brutal-input pl-10"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="brutal-input pl-10"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isLogin ? '••••••••' : 'Min 6 characters'}
                      required
                      minLength={6}
                      className="brutal-input pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-100 border-2 border-red-600 text-red-900 text-xs font-bold"
                  >
                    ⚠️ {error}
                  </motion.div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`brutal-btn w-full py-3 text-sm font-black uppercase ${
                    isLogin
                      ? 'bg-neo-yellow hover:bg-yellow-300'
                      : 'bg-neo-green hover:bg-emerald-300'
                  } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 animate-spin" />
                      {isLogin ? 'LOGGING IN...' : 'CREATING ACCOUNT...'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      {isLogin ? 'LOGIN TO DASHBOARD' : 'CREATE ACCOUNT'}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
              </motion.form>
            </AnimatePresence>

            {/* Footer */}
            <div className="mt-5 pt-4 border-t-2 border-black/10">
              <p className="text-[11px] text-black/50 font-mono text-center">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => { setIsLogin(!isLogin); setError(''); }}
                  className="text-black font-bold underline underline-offset-2 hover:text-neo-purple"
                >
                  {isLogin ? 'Sign up free' : 'Login here'}
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
