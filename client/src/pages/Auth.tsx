import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { LogoMark } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useUniversities } from '@/hooks/use-universities';
import { safeNextPath } from '@/lib/redirect';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@shared/demo';
import { MIN_PASSWORD_LENGTH, signUpSchema, type SignUpInput, type UserRole } from '@shared/schema';

interface AuthProps {
  initialMode?: 'signin' | 'signup';
}

type FieldErrors = Partial<Record<keyof SignUpInput, string[]>>;

const inputClass =
  'block h-10 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const submitClass =
  'flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60';

const Field = ({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1">
      {label}
    </label>
    {children}
    {error ? (
      <p className="mt-1 text-xs text-destructive">{error}</p>
    ) : (
      hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    )}
  </div>
);

const emptySignUp: SignUpInput = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'student',
  universityId: 'mcmaster',
};

const Auth = ({ initialMode = 'signin' }: AuthProps) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [, setLocation] = useLocation();
  // Back to the page that asked the user to sign in, e.g. /edit-listing/<id>.
  const next = safeNextPath(useSearch());
  const { signIn, signUp } = useAuth();
  const { data: universities } = useUniversities();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [form, setForm] = useState<SignUpInput>(emptySignUp);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (patch: Partial<SignUpInput>) => setForm((f) => ({ ...f, ...patch }));

  const run = async (action: () => Promise<void>, fallback: string) => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setLoading(false);
    }
  };

  const signInAs = (address: string, secret: string) =>
    run(async () => {
      await signIn(address, secret);
      setLocation(next);
    }, 'Failed to sign in');

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    signInAs(email, password);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }
    setFieldErrors({});
    run(async () => {
      const { needsConfirmation } = await signUp(parsed.data);
      if (needsConfirmation) {
        setNotice(`Check ${parsed.data.email} for a link to confirm your account, then sign in.`);
        setMode('signin');
      } else {
        setLocation(next);
      }
    }, 'Failed to sign up');
  };

  const switchMode = (next: 'signin' | 'signup') => {
    setMode(next);
    setError(null);
    setFieldErrors({});
  };

  return (
    <div className="page py-10 md:py-16">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b px-6 pb-6 pt-8">
            <div className="mb-5 flex justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LogoMark className="h-8 w-8" />
              </span>
            </div>
            <h1 className="text-center text-3xl font-semibold">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-muted-foreground text-center mt-1">
              {mode === 'signin' ? 'Sign in to continue to LetMeKnock' : 'Find or list student housing near campus'}
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="mb-4 rounded-md border border-success/40 bg-success/10 p-3 text-sm" role="status">{notice}</div>
            )}

            {mode === 'signin' ? (
              <>
                <form onSubmit={handleSignIn} className="space-y-6">
                  <Field id="email" label="Email">
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder="you@mcmaster.ca"
                    />
                  </Field>
                  <Field id="password" label="Password">
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <button type="submit" className={submitClass} disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-card text-muted-foreground">Or try the demo</span>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {(Object.keys(DEMO_ACCOUNTS) as UserRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        disabled={loading}
                        onClick={() => signInAs(DEMO_ACCOUNTS[role].email, DEMO_PASSWORD)}
                        className="h-10 w-full rounded-md border bg-card px-4 text-sm font-medium hover:bg-accent disabled:opacity-60"
                      >
                        Demo {role}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-5" noValidate>
                <div>
                  <span className="block text-sm font-medium text-foreground mb-1">I am a</span>
                  <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
                    {(['student', 'landlord'] as const).map((role) => (
                      <button
                        key={role}
                        type="button"
                        role="radio"
                        aria-checked={form.role === role}
                        onClick={() => update({ role })}
                        className={`h-10 rounded-md border text-sm font-medium transition-colors ${form.role === role ? 'border-foreground bg-foreground text-background' : 'hover:bg-accent'}`}
                      >
                        {role === 'student' ? 'Student' : 'Landlord'}
                      </button>
                    ))}
                  </div>
                </div>
                <Field id="fullName" label="Full name" error={fieldErrors.fullName?.[0]}>
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(e) => update({ fullName: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field id="email" label="Email" error={fieldErrors.email?.[0]}>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => update({ email: e.target.value })}
                    className={inputClass}
                    placeholder="you@mcmaster.ca"
                  />
                </Field>
                <Field id="university" label="University" error={fieldErrors.universityId?.[0]}>
                  <select
                    id="university"
                    value={form.universityId}
                    onChange={(e) => update({ universityId: e.target.value })}
                    className={inputClass}
                  >
                    {!universities?.length && <option value="">Loading...</option>}
                    {universities?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id="password"
                  label="Password"
                 
                  error={fieldErrors.password?.[0]}
                  hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
                >
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => update({ password: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field id="confirmPassword" label="Confirm password" error={fieldErrors.confirmPassword?.[0]}>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(e) => update({ confirmPassword: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <button type="submit" className={submitClass} disabled={loading}>
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            )}
          </div>

          <div className="border-t bg-muted/40 px-6 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account?'}
              <button
                type="button"
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
