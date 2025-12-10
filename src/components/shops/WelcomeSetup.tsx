import { ShopOnboarding } from './ShopOnboarding';

export function WelcomeSetup() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="px-6 py-4 border-b bg-white">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-gray-900">Welcome to Bright Sigma</h1>
          <p className="text-sm text-slate-600">Let’s create your first shop to get started. You will become the owner of this shop.</p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto">
        <ShopOnboarding />
      </main>
    </div>
  );
}

