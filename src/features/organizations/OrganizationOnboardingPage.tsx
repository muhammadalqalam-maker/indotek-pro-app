import { OrganizationForm } from './OrganizationForm';

export function OrganizationOnboardingPage() {
  return (
    <main className="flex h-dvh min-h-0 flex-col items-center overflow-y-auto bg-muted/40 px-4 py-10">
      <div className="my-auto w-full max-w-2xl">
        <OrganizationForm required />
      </div>
    </main>
  );
}
