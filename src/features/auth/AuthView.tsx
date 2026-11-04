import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Card, CardContent, CardDescription, CardHeader, Input } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { authMessages as messages } from '../../i18n/id';
import { credentialsSchema, emailSchema, resetPasswordSchema } from './schemas/auth.schema';

type AuthFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

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
    <main className="min-h-screen overflow-y-auto bg-bg lg:grid lg:grid-cols-2">
      <aside className="relative hidden min-h-screen flex-col overflow-hidden bg-primary-900 px-10 py-10 lg:flex xl:px-16">
        <div className="flex items-center gap-3">
          <img className="size-10 rounded-lg" src="/pwa-192x192.png" alt="" />
          <span className="text-sm font-semibold tracking-wide text-primary-50">{messages.appName}</span>
        </div>
        <div className="flex flex-1 items-center justify-center py-16">
          <div className="relative">
            <div aria-hidden="true" className="absolute -inset-8 rounded-3xl border border-primary-50/20" />
            <img className="relative size-56 rounded-2xl shadow-lg" src="/pwa-512x512.png" alt="" />
          </div>
        </div>
      </aside>

      <section className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-8 sm:px-6 lg:px-12">
        <div className="flex w-full max-w-md items-center gap-3 lg:hidden">
          <img className="size-10 rounded-lg" src="/pwa-192x192.png" alt="" />
          <span className="text-sm font-semibold tracking-wide text-text">{messages.appName}</span>
        </div>
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-3">
            <h1 className="text-2xl font-semibold leading-snug text-text">{title}</h1>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className={authMode === 'update_password' ? 'space-y-5' : 'space-y-5 pb-0 sm:pb-0'}>
            {authMode === 'update_password' && !authSession ? (
              <div className="space-y-3">
                <p role="status" className="text-sm text-warning-foreground">{messages.recoveryLinkInvalid}</p>
                <Button className="w-full" type="button" onClick={() => setAuthMode('forgot_password')}>
                  {messages.requestNewLink}
                </Button>
                <Button className="w-full" variant="ghost" type="button" onClick={() => setAuthMode('sign_in')}>
                  {messages.backToSignIn}
                </Button>
              </div>
            ) : (
              <>
                <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
                  {authMode !== 'update_password' && (
                    <Input
                      {...register('email')}
                      id="auth-email"
                      label={messages.email}
                      type="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      inputMode="email"
                      error={errors.email?.message}
                      aria-required="true"
                      disabled={authBusy}
                    />
                  )}

                  {(authMode === 'sign_in' || authMode === 'sign_up') && (
                    <Input
                      {...register('password')}
                      id="auth-password"
                      label={messages.password}
                      type="password"
                      autoComplete={authMode === 'sign_in' ? 'current-password' : 'new-password'}
                      error={errors.password?.message}
                      aria-required="true"
                      disabled={authBusy}
                    />
                  )}

                  {authMode === 'update_password' && (
                    <>
                      <Input
                        {...register('password')}
                        id="auth-password"
                        label={messages.password}
                        type="password"
                        autoComplete="new-password"
                        error={errors.password?.message}
                        aria-required="true"
                        disabled={authBusy}
                      />
                      <Input
                        {...register('confirmPassword')}
                        id="auth-confirm-password"
                        label={messages.confirmPassword}
                        type="password"
                        autoComplete="new-password"
                        error={errors.confirmPassword?.message}
                        aria-required="true"
                        disabled={authBusy}
                      />
                    </>
                  )}

                  {authError && <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger">{authError}</p>}
                  {authNotice && <p role="status" className="rounded-md border border-success/30 bg-success-bg p-3 text-sm text-success">{authNotice}</p>}

                  <Button className="w-full" type="submit" loading={authBusy} disabled={authBusy}>
                    {authBusy ? messages.submitting : {
                      sign_in: messages.signIn,
                      sign_up: messages.signUp,
                      forgot_password: messages.sendResetLink,
                      update_password: messages.savePassword,
                    }[authMode]}
                  </Button>
                </form>

                {authMode === 'sign_in' && (
                  <div className="flex justify-end">
                    <Button className="min-h-11 px-2 text-sm text-muted-foreground hover:text-text" variant="ghost" type="button" onClick={() => setAuthMode('forgot_password')}>
                      {messages.forgotPassword}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>

          {authMode === 'sign_in' && (
            <div className="border-t border-border px-4 py-3 sm:px-5 sm:py-4">
              <Button className="w-full" variant="ghost" type="button" onClick={() => setAuthMode('sign_up')}>
                {messages.noAccount}
              </Button>
            </div>
          )}
          {authMode === 'sign_up' && (
            <div className="border-t border-border px-4 py-3 sm:px-5 sm:py-4">
              <Button className="w-full" variant="ghost" type="button" onClick={() => setAuthMode('sign_in')}>
                {messages.hasAccount}
              </Button>
            </div>
          )}
          {authMode === 'forgot_password' && (
            <div className="border-t border-border px-4 py-3 sm:px-5 sm:py-4">
              <Button className="w-full" variant="ghost" type="button" onClick={() => setAuthMode('sign_in')}>
                {messages.backToSignIn}
              </Button>
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}
