import React, { useState, useEffect } from 'react';
import { categoryService, expenseReasonService } from '../services/categories';
import { Category, ExpenseReason, CategoryType } from '../types/budget';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Tag, 
  List,
  ChevronRight,
  ChevronDown,
  Target
} from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseReasons, setExpenseReasons] = useState<ExpenseReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingReason, setEditingReason] = useState<ExpenseReason | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddReason, setShowAddReason] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [newCategory, setNewCategory] = useState<{ name: string; type: string }>({ name: '', type: 'wants' });
  const [newReason, setNewReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesData, expenseReasonsData] = await Promise.all([
        categoryService.getAll(),
        expenseReasonService.getAll(),
      ]);
      
      setCategories(categoriesData);
      setExpenseReasons(expenseReasonsData);
      
      // Expand all categories by default
      setExpandedCategories(new Set(categoriesData.map(c => c.id)));
    } catch (error) {
      toast.error('Failed to load categories and expense reasons');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      await categoryService.create({
        name: newCategory.name,
        type: newCategory.type as any // Temporary fix for type mismatch
      });
      toast.success('Category created successfully');
      setNewCategory({ name: '', type: 'wants' });
      setShowAddCategory(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to create category');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      await categoryService.update(editingCategory.id, {
        name: editingCategory.name,
        type: editingCategory.type,
      });
      toast.success('Category updated successfully');
      setEditingCategory(null);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId: number, categoryName: string) => {
    // Note: Delete functionality not yet implemented in service
    toast('Delete functionality will be available soon', { icon: 'ℹ️' });
  };

  const handleCreateExpenseReason = async (categoryId: number) => {
    if (!newReason.trim()) {
      toast.error('Expense reason name is required');
      return;
    }

    try {
      await expenseReasonService.create({
        name: newReason,
        categoryId: categoryId,
        isRecurring: false
      });
      toast.success('Expense reason created successfully');
      setNewReason('');
      setShowAddReason(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to create expense reason');
    }
  };

  const handleUpdateExpenseReason = async () => {
    if (!editingReason || !editingReason.name.trim()) {
      toast.error('Expense reason name is required');
      return;
    }

    try {
      await expenseReasonService.update(editingReason.id, {
        name: editingReason.name,
        categoryId: editingReason.categoryId
      });
      toast.success('Expense reason updated successfully');
      setEditingReason(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update expense reason');
    }
  };

  const handleDeleteExpenseReason = async (reasonId: number, reasonName: string) => {
    if (!window.confirm(`Are you sure you want to delete the expense reason "${reasonName}"?`)) {
      return;
    }

    try {
      await expenseReasonService.delete(reasonId);
      toast.success('Expense reason deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete expense reason');
    }
  };

  const toggleCategoryExpansion = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryColor = (categoryType: string) => {
    switch (categoryType.toLowerCase()) {
      case 'wants': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'needs': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'investments': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (categoryType: string) => {
    switch (categoryType.toLowerCase()) {
      case 'wants': return '🎉';
      case 'needs': return '🏠';
      case 'investments': return '💰';
      default: return '📝';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Categories & Expense Reasons</h1>
        <button
          onClick={() => setShowAddCategory(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <>
          {/* Add New Category Form */}
          {showAddCategory && (
            <div className="card">
              <h3 className="font-semibold mb-4">Add New Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="form-label">Category Name</label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    className="form-input"
                    placeholder="Enter category name"
                  />
                </div>
                <div>
                  <label className="form-label">Category Type</label>
                  <select
                    value={newCategory.type}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, type: e.target.value }))}
                    className="form-input"
                  >
                    <option value="wants">Wants</option>
                    <option value="needs">Needs</option>
                    <option value="investments">Investments</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategory({ name: '', type: 'wants' });
                  }}
                  className="btn btn-secondary"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleCreateCategory}
                  className="btn btn-primary"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Category
                </button>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="space-y-4">
            {categories.length === 0 ? (
              <div className="card text-center py-12">
                <Tag className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No categories found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first category.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowAddCategory(true)}
                    className="btn btn-primary"
                  >
                    Add Your First Category
                  </button>
                </div>
              </div>
            ) : (
              categories.map((category) => {
                const categoryReasons = expenseReasons.filter(reason => reason.categoryId === category.id);
                const isExpanded = expandedCategories.has(category.id);

                return (
                  <div key={category.id} className="card">
                    {/* Category Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => toggleCategoryExpansion(category.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getCategoryIcon(category.type)}</span>
                          
                          {editingCategory?.id === category.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editingCategory.name}
                                onChange={(e) => setEditingCategory(prev => 
                                  prev ? { ...prev, name: e.target.value } : null
                                )}
                                className="form-input py-1 text-lg font-semibold"
                              />
                              <select
                                value={editingCategory.type}
                                onChange={(e) => setEditingCategory(prev => 
                                  prev ? { ...prev, type: e.target.value as any } : null
                                )}
                                className="form-input py-1"
                              >
                                <option value="wants">Wants</option>
                                <option value="needs">Needs</option>
                                <option value="investments">Investments</option>
                              </select>
                            </div>
                          ) : (
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(category.type)}`}>
                                {category.type}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          {categoryReasons.length} expense reason{categoryReasons.length !== 1 ? 's' : ''}
                        </span>
                        
                        {editingCategory?.id === category.id ? (
                          <>
                            <button
                              onClick={handleUpdateCategory}
                              className="p-2 text-green-600 hover:bg-green-50 rounded"
                              title="Save changes"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingCategory(null)}
                              className="p-2 text-gray-400 hover:bg-gray-50 rounded"
                              title="Cancel editing"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingCategory(category)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit category"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id, category.name)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete category"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expense Reasons */}
                    {isExpanded && (
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium text-gray-700 flex items-center">
                            <List className="h-4 w-4 mr-2" />
                            Expense Reasons
                          </h4>
                          <button
                            onClick={() => setShowAddReason(category.id)}
                            className="btn btn-secondary btn-sm"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Reason
                          </button>
                        </div>

                        {/* Add New Reason Form */}
                        {showAddReason === category.id && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={newReason}
                                onChange={(e) => setNewReason(e.target.value)}
                                className="form-input flex-1"
                                placeholder="Enter expense reason name"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCreateExpenseReason(category.id);
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleCreateExpenseReason(category.id)}
                                className="btn btn-primary btn-sm"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setShowAddReason(null);
                                  setNewReason('');
                                }}
                                className="btn btn-secondary btn-sm"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Reasons List */}
                        {categoryReasons.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Target className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                            <p className="text-sm">No expense reasons yet</p>
                            <p className="text-xs">Add reasons to track specific expenses</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {categoryReasons.map((reason) => (
                              <div key={reason.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                {editingReason?.id === reason.id ? (
                                  <div className="flex items-center space-x-2 flex-1">
                                    <input
                                      type="text"
                                      value={editingReason.name}
                                      onChange={(e) => setEditingReason(prev => 
                                        prev ? { ...prev, name: e.target.value } : null
                                      )}
                                      className="form-input flex-1 py-1"
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          handleUpdateExpenseReason();
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={handleUpdateExpenseReason}
                                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                                      title="Save changes"
                                    >
                                      <Save className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => setEditingReason(null)}
                                      className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                      title="Cancel editing"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-gray-900 flex-1">{reason.name}</span>
                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={() => setEditingReason(reason)}
                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded"
                                        title="Edit reason"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteExpenseReason(reason.id, reason.name)}
                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                                        title="Delete reason"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};