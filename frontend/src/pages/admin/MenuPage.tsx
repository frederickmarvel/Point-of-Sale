import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/shared/Layout';
import Modal from '@/components/shared/Modal';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { menuService } from '@/services/menu.service';
import { formatCurrency } from '@/utils/formatters';
import type { Category, MenuItem, CreateCategoryRequest, CreateMenuItemRequest } from '@/types';

// ─── Category Form ────────────────────────────────────────────────────────────

interface CategoryFormProps {
  initial?: Category;
  onSubmit: (data: CreateCategoryRequest) => void;
  isPending: boolean;
}

function CategoryForm({ initial, onSubmit, isPending }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description: description || undefined, sortOrder, isActive });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="cat-active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 text-primary-500 rounded"
        />
        <label htmlFor="cat-active" className="text-sm text-gray-700">Active</label>
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {isPending && <LoadingSpinner size="sm" />}
          {initial ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

// ─── Item Form ────────────────────────────────────────────────────────────────

interface ItemFormProps {
  initial?: MenuItem;
  categories: Category[];
  onSubmit: (data: CreateMenuItemRequest) => void;
  isPending: boolean;
}

function ItemForm({ initial, categories, onSubmit, isPending }: ItemFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [isAvailable, setIsAvailable] = useState(initial?.isAvailable ?? true);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description: description || undefined,
      price,
      imageUrl: imageUrl || undefined,
      isAvailable,
      categoryId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rp) *</label>
          <input
            type="number"
            required
            min={0}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none bg-white"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="item-available"
          checked={isAvailable}
          onChange={(e) => setIsAvailable(e.target.checked)}
          className="w-4 h-4 text-primary-500 rounded"
        />
        <label htmlFor="item-available" className="text-sm text-gray-700">Available</label>
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {isPending && <LoadingSpinner size="sm" />}
          {initial ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MenuPage() {
  const qc = useQueryClient();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Modals
  const [catModal, setCatModal] = useState<{ open: boolean; editing?: Category }>({ open: false });
  const [itemModal, setItemModal] = useState<{ open: boolean; editing?: MenuItem }>({ open: false });

  // Queries
  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => menuService.getCategories(),
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['items'],
    queryFn: () => menuService.getItems(),
  });

  // Category mutations
  const createCat = useMutation({
    mutationFn: menuService.createCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category created'); setCatModal({ open: false }); },
    onError: () => toast.error('Failed to create category'),
  });
  const updateCat = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCategoryRequest }) => menuService.updateCategory(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category updated'); setCatModal({ open: false }); },
    onError: () => toast.error('Failed to update category'),
  });
  const deleteCat = useMutation({
    mutationFn: menuService.deleteCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category deleted'); },
    onError: () => toast.error('Failed to delete category'),
  });

  // Item mutations
  const createItem = useMutation({
    mutationFn: menuService.createItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); toast.success('Item created'); setItemModal({ open: false }); },
    onError: () => toast.error('Failed to create item'),
  });
  const updateItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateMenuItemRequest }) => menuService.updateItem(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); toast.success('Item updated'); setItemModal({ open: false }); },
    onError: () => toast.error('Failed to update item'),
  });
  const deleteItem = useMutation({
    mutationFn: menuService.deleteItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); toast.success('Item deleted'); },
    onError: () => toast.error('Failed to delete item'),
  });
  const toggleAvailability = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      menuService.updateItem(id, { isAvailable }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
    onError: () => toast.error('Failed to update availability'),
  });

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const confirmDeleteCat = (cat: Category) => {
    if (confirm(`Delete category "${cat.name}"? This may also affect items in it.`)) {
      deleteCat.mutate(cat.id);
    }
  };

  const confirmDeleteItem = (item: MenuItem) => {
    if (confirm(`Delete item "${item.name}"?`)) deleteItem.mutate(item.id);
  };

  if (loadingCats || loadingItems) {
    return <Layout><PageLoader /></Layout>;
  }

  const itemsByCategory = (catId: string) => items.filter((i) => i.categoryId === catId);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Menu Management</h1>
            <p className="text-gray-500 text-sm mt-1">{categories.length} categories · {items.length} items</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setCatModal({ open: true })}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
            <button
              onClick={() => setItemModal({ open: true })}
              className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          {categories.map((cat) => {
            const catItems = itemsByCategory(cat.id);
            const isExpanded = expandedCategories.has(cat.id);
            return (
              <div key={cat.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Category header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCategory(cat.id)}
                >
                  <button className="text-gray-400">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{cat.name}</span>
                      {!cat.isActive && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    {cat.description && <p className="text-xs text-gray-400 mt-0.5">{cat.description}</p>}
                  </div>
                  <span className="text-sm text-gray-400">{catItems.length} items</span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setCatModal({ open: true, editing: cat })}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => confirmDeleteCat(cat)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items list */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {catItems.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400">No items in this category.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                            <th className="text-left px-5 py-3">Item</th>
                            <th className="text-left px-5 py-3">Price</th>
                            <th className="text-left px-5 py-3">Available</th>
                            <th className="text-right px-5 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {catItems.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  {item.imageUrl ? (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.name}
                                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                                  )}
                                  <div>
                                    <p className="font-medium text-gray-800">{item.name}</p>
                                    {item.description && (
                                      <p className="text-xs text-gray-400 truncate max-w-[200px]">{item.description}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3 font-medium text-primary-600">
                                {formatCurrency(item.price)}
                              </td>
                              <td className="px-5 py-3">
                                <button
                                  onClick={() => toggleAvailability.mutate({ id: item.id, isAvailable: !item.isAvailable })}
                                  className="flex items-center gap-1.5 text-sm"
                                >
                                  {item.isAvailable ? (
                                    <ToggleRight className="w-6 h-6 text-green-500" />
                                  ) : (
                                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                                  )}
                                  <span className={item.isAvailable ? 'text-green-600' : 'text-gray-400'}>
                                    {item.isAvailable ? 'Yes' : 'No'}
                                  </span>
                                </button>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => setItemModal({ open: true, editing: item })}
                                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => confirmDeleteItem(item)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {categories.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-400">No categories yet. Add your first category to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      <Modal
        isOpen={catModal.open}
        onClose={() => setCatModal({ open: false })}
        title={catModal.editing ? 'Edit Category' : 'New Category'}
      >
        <CategoryForm
          initial={catModal.editing}
          isPending={createCat.isPending || updateCat.isPending}
          onSubmit={(data) => {
            if (catModal.editing) {
              updateCat.mutate({ id: catModal.editing.id, data });
            } else {
              createCat.mutate(data);
            }
          }}
        />
      </Modal>

      {/* Item Modal */}
      <Modal
        isOpen={itemModal.open}
        onClose={() => setItemModal({ open: false })}
        title={itemModal.editing ? 'Edit Item' : 'New Item'}
        size="lg"
      >
        <ItemForm
          initial={itemModal.editing}
          categories={categories}
          isPending={createItem.isPending || updateItem.isPending}
          onSubmit={(data) => {
            if (itemModal.editing) {
              updateItem.mutate({ id: itemModal.editing.id, data });
            } else {
              createItem.mutate(data);
            }
          }}
        />
      </Modal>
    </Layout>
  );
}
