import { useState } from 'react';
import { Store } from 'lucide-react';
import { createShop, bootstrapMe } from '../../lib/api';
import { useShop } from '../../contexts/ShopContext';

export function ShopOnboarding() {
  const { refresh } = useShop();
  const [shopName, setShopName] = useState('');
  const [timezone, setTimezone] = useState('Europe/Bucharest');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Ensure user exists in backend before creating shop
      // This is idempotent - if user exists, it just updates them
      try {
        await bootstrapMe();
      } catch (bootstrapErr: any) {
        // Ignore "user already exists" type errors - that's fine
        const msg = bootstrapErr?.message?.toLowerCase() || '';
        if (!msg.includes('already') && !msg.includes('exists') && !msg.includes('create user')) {
          throw bootstrapErr;
        }
      }

      // Create the shop
      await createShop({ name: shopName, timezone });
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to create shop');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Create your first shop</h1>
          <p className="text-gray-600">Set up your shop to get started. You will become the owner.</p>
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">{error}</div>
        )}

        <form onSubmit={onCreate} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Shop name</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="e.g., Bright Sigma Bucharest"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Timezone</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="e.g., Europe/Bucharest"
            />
            <p className="text-xs text-slate-500 mt-1.5">Use an IANA timezone, e.g. Europe/Bucharest, Europe/London, UTC.</p>
          </div>

          <button
            type="submit"
            disabled={busy}
            className={`w-full px-4 py-3 rounded-xl text-white font-medium transition-all ${
              busy
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30'
            }`}
          >
            {busy ? 'Creating shop…' : 'Create shop & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

