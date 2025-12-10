import { useState } from 'react';
import { Plus, Trash2, FolderTree } from 'lucide-react';
import { useCategories, useInvalidateBootstrap } from '../contexts/BootstrapContext';
import { Category, createCategory, deleteCategory } from '../lib/api';

export function Categories() {
  const { categories, loading } = useCategories();
  const invalidateBootstrap = useInvalidateBootstrap();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState<'count' | 'currency'>('count');
  const [formParentId, setFormParentId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    invalidateBootstrap();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await createCategory({
        name: formName.trim(),
        unit: formUnit,
        parent_id: formParentId || null,
      });
      console.log('Created category:', created);
      setFormName('');
      setFormUnit('count');
      setFormParentId('');
      setShowForm(false);
      await fetchCategories();
    } catch (err: any) {
      setError(err?.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setError(null);
    try {
      await deleteCategory(id);
      setDeleteId(null);
      await fetchCategories();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  // Helper to extract parent_id value (handles both string and {String, Valid} format from Go backend)
  const getParentId = (cat: Category): string | null => {
    const pid = cat.parent_id;
    if (!pid) return null;
    if (typeof pid === 'string') return pid || null;
    // Handle Go sql.NullString format: {String: "...", Valid: bool}
    if (typeof pid === 'object' && 'Valid' in (pid as any)) {
      const nullable = pid as unknown as { String: string; Valid: boolean };
      return nullable.Valid ? nullable.String : null;
    }
    return null;
  };

  // Build a tree structure for display
  const rootCategories = categories.filter((c) => !getParentId(c));
  const getChildren = (parentId: string) => categories.filter((c) => getParentId(c) === parentId);

  const renderCategory = (cat: Category, depth: number = 0) => {
    const children = getChildren(cat.id);
    return (
      <div key={cat.id}>
        <div
          className={`flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow ${
            depth > 0 ? 'ml-8 mt-2' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            {depth > 0 && <FolderTree className="w-4 h-4 text-slate-400" />}
            <div>
              <p className="font-medium text-gray-900">{cat.name}</p>
            </div>
          </div>
          <button
            onClick={() => setDeleteId(cat.id)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete category"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        {children.map((child) => renderCategory(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
          <p className="text-slate-600 text-sm mt-1">
            Manage product and service categories for your sales targets
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Add Category Form */}
      {showForm && (
        <div className="mb-6 p-6 bg-white border border-slate-200 rounded-xl">
          <h2 className="text-lg font-medium text-gray-900 mb-4">New Category</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., VOCE TOTAL"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Unit</label>
                <select
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value as 'count' | 'currency')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="count">Count (number of contracts)</option>
                  <option value="currency">Currency (RON value)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Parent Category</label>
                <select
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">None (top-level)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 rounded-lg text-white ${
                  submitting ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {submitting ? 'Creating...' : 'Create Category'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      {loading ? (
        <div className="text-slate-600">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
          <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No categories yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Add your first category to start setting up sales targets
          </p>
        </div>
      ) : (
        <div className="space-y-3">{rootCategories.map((cat) => renderCategory(cat))}</div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Category?</h3>
            <p className="text-slate-600 text-sm mb-4">
              This will permanently delete this category. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  backgroundColor: '#fff',
                  color: '#333',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  cursor: deleting ? 'not-allowed' : 'pointer'
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
