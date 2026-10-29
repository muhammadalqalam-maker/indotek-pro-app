import { OrganizationForm } from './OrganizationForm';

export function OrganizationOnboardingPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-2xl">
        <OrganizationForm required />
      </div>
    </main>
  );
}
