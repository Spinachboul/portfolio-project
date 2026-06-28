import { useEffect, useState } from 'react';
import { Lock, Mail, Loader2, AlertCircle, PenTool } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../lib/router';

export default function Login() {
  const { signIn, signUp, user } = useAuth();
  const { navigate } = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate('/admin');
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error: err } = await fn(email, password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    navigate('/admin');
  };

  return (
    <div className="container-page py-16 max-w-md animate-fade-in">
      <div className="card p-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-fg">
            <PenTool size={16} />
          </span>
          <div>
            <h1 className="font-serif text-xl font-semibold">
              {mode === 'signin' ? 'Owner sign in' : 'Create owner account'}
            </h1>
            <p className="text-xs text-muted">Manage posts, blueprint, and messages.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 block">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input pl-9"
                autoComplete="email"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 block">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="input pl-9"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-danger flex items-center gap-1.5">
              <AlertCircle size={14} />
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-muted">
          {mode === 'signin' ? (
            <>
              Need an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); }}
                className="text-accent font-medium link-underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); }}
                className="text-accent font-medium link-underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        Only the site owner needs an account. Visitors can read and message without signing in.
      </p>
    </div>
  );
}
