import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useApp } from '../../context/AppContext';
import { authMessages as messages } from '../../i18n/id';
import { credentialsSchema, emailSchema, resetPasswordSchema } from './schemas/auth.schema';

type AuthFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

const fieldClassName = 'mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-3 text-base text-slate-900 outline-none focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:text-white dark:focus-visible:ring-offset-slate-900';
const primaryButtonClassName = 'min-h-11 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900';
const linkButtonClassName = 'min-h-11 w-full rounded-md text-sm text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-blue-400 dark:focus-visible:ring-offset-slate-900';

export function AuthView() {
  const {
    authMode,
    setAuthMode,
    authSession,
    authError,
    authNotice,
    authBusy,
    clearAuthFeedback,
    submitAuth,
    requestPasswordReset,
    updatePassword,
  } = useApp();
  const { register, handleSubmit, setError, setFocus, clearErrors, reset, formState: { errors } } = useForm<AuthFormValues>({
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    clearErrors();
    reset((values) => ({ ...values, password: '', confirmPassword: '' }));
  }, [authMode, clearErrors, reset]);

  const applyValidationErrors = (issues: z.ZodIssue[]) => {
    let firstInvalidField: keyof AuthFormValues | null = null;
    for (const issue of issues) {
      const field = issue.path[0];
      if (field === 'email' || field === 'password' || field === 'confirmPassword') {
        setError(field, { type: 'validate', message: issue.message });
        firstInvalidField ??= field;
      }
    }
    if (firstInvalidField) setFocus(firstInvalidField);
  };

  const onSubmit = async (values: AuthFormValues) => {
    clearAuthFeedback();
    if (authMode === 'sign_in' || authMode === 'sign_up') {
      const parsed = credentialsSchema.safeParse(values);
      if (!parsed.success) {
        applyValidationErrors(parsed.error.issues);
        return;
      }
      await submitAuth(parsed.data.email, parsed.data.password);
      return;
    }
    if (authMode === 'forgot_password') {
      const parsed = emailSchema.safeParse(values.email);
      if (!parsed.success) {
        setError('email', { type: 'validate', message: parsed.error.issues[0]?.message ?? messages.emailInvalid });
        setFocus('email');
        return;
      }
      await requestPasswordReset(parsed.data);
      return;
    }
    const parsed = resetPasswordSchema.safeParse(values);
    if (!parsed.success) {
      applyValidationErrors(parsed.error.issues);
      return;
    }
    await updatePassword(parsed.data.password);
  };

  const title = {
    sign_in: messages.signInTitle,
    sign_up: messages.signUpTitle,
    forgot_password: messages.forgotPasswordTitle,
    update_password: messages.updatePasswordTitle,
  }[authMode];
  const description = {
    sign_in: messages.signInDescription,
    sign_up: messages.signUpDescription,
    forgot_password: messages.forgotPasswordDescription,
    update_password: messages.updatePasswordDescription,
  }[authMode];

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <section className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <header>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-500">{messages.appName}</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          <p className="mt-2 text-xs text-slate-400">{messages.demoNotice}</p>
        </header>

        {authMode === 'update_password' && !authSession ? (
          <div className="space-y-3">
            <p role="status" className="text-sm text-amber-700 dark:text-amber-300">{messages.recoveryLinkInvalid}</p>
            <button className={primaryButtonClassName} type="button" onClick={() => setAuthMode('forgot_password')}>
              {messages.requestNewLink}
            </button>
            <button className={linkButtonClassName} type="button" onClick={() => setAuthMode('sign_in')}>
              {messages.backToSignIn}
            </button>
          </div>
        ) : (
          <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
            {authMode !== 'update_password' && (
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="auth-email">
                {messages.email}
                <input
                  {...register('email')}
                  id="auth-email"
                  className={fieldClassName}
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  inputMode="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'auth-email-error' : undefined}
                  aria-required="true"
                  disabled={authBusy}
                />
                {errors.email && <span id="auth-email-error" className="mt-1 block text-xs text-red-600">{errors.email.message}</span>}
              </label>
            )}

            {(authMode === 'sign_in' || authMode === 'sign_up') && (
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="auth-password">
                {messages.password}
                <input
                  {...register('password')}
                  id="auth-password"
                  className={fieldClassName}
                  type="password"
                  autoComplete={authMode === 'sign_in' ? 'current-password' : 'new-password'}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'auth-password-error' : undefined}
                  aria-required="true"
                  disabled={authBusy}
                />
                {errors.password && <span id="auth-password-error" className="mt-1 block text-xs text-red-600">{errors.password.message}</span>}
              </label>
            )}

            {authMode === 'update_password' && (
              <>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="auth-password">
                  {messages.password}
                  <input
                    {...register('password')}
                    id="auth-password"
                    className={fieldClassName}
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'auth-password-error' : undefined}
                    aria-required="true"
                    disabled={authBusy}
                  />
                  {errors.password && <span id="auth-password-error" className="mt-1 block text-xs text-red-600">{errors.password.message}</span>}
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="auth-confirm-password">
                  {messages.confirmPassword}
                  <input
                    {...register('confirmPassword')}
                    id="auth-confirm-password"
                    className={fieldClassName}
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.confirmPassword)}
                    aria-describedby={errors.confirmPassword ? 'auth-confirm-password-error' : undefined}
                    aria-required="true"
                    disabled={authBusy}
                  />
                  {errors.confirmPassword && <span id="auth-confirm-password-error" className="mt-1 block text-xs text-red-600">{errors.confirmPassword.message}</span>}
                </label>
              </>
            )}

            {authError && <p role="alert" className="text-sm text-red-600">{authError}</p>}
            {authNotice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{authNotice}</p>}

            <button className={primaryButtonClassName} type="submit" disabled={authBusy}>
              {authBusy ? messages.submitting : {
                sign_in: messages.signIn,
                sign_up: messages.signUp,
                forgot_password: messages.sendResetLink,
                update_password: messages.savePassword,
              }[authMode]}
            </button>
          </form>
        )}

        {authMode === 'sign_in' && (
          <div className="space-y-1">
            <button className={linkButtonClassName} type="button" onClick={() => setAuthMode('forgot_password')}>
              {messages.forgotPassword}
            </button>
            <button className={linkButtonClassName} type="button" onClick={() => setAuthMode('sign_up')}>
              {messages.noAccount}
            </button>
          </div>
        )}
        {authMode === 'sign_up' && (
          <button className={linkButtonClassName} type="button" onClick={() => setAuthMode('sign_in')}>
            {messages.hasAccount}
          </button>
        )}
        {authMode === 'forgot_password' && (
          <button className={linkButtonClassName} type="button" onClick={() => setAuthMode('sign_in')}>
            {messages.backToSignIn}
          </button>
        )}
      </section>
    </main>
  );
}
