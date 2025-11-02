import React, { useState, useEffect } from 'react';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import { fetchApi } from '@/app/lib/data';

interface Category {
  id: string;
  name: string;
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: any) => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onProductCreated }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cost_price: '',
    retail_price: '',
    wholesale_price: '',
    category: '',
    barcode: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await fetchApi<{ results: Category[] }>('/api/categories/');
      if (response && response.results) {
        setCategories(response.results);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    if (!formData.cost_price || parseFloat(formData.cost_price) <= 0) {
      newErrors.cost_price = 'El precio de costo debe ser mayor a 0';
    }
    if (!formData.retail_price || parseFloat(formData.retail_price) <= 0) {
      newErrors.retail_price = 'El precio de venta debe ser mayor a 0';
    }
    if (!formData.category) {
      newErrors.category = 'La categoría es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name,
        description: formData.description || formData.name,
        cost_price: parseFloat(formData.cost_price),
        retail_price: parseFloat(formData.retail_price),
        wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : parseFloat(formData.retail_price) * 0.85,
        category: formData.category,
        barcode: formData.barcode || null,
        is_active: true
      };

      const response = await fetchApi('/api/products/', {
        method: 'POST',
        body: payload
      });

      if (response) {
        onProductCreated(response);
        handleClose();
      }
    } catch (error) {
      console.error('Error creating product:', error);
      setErrors({ submit: 'Error al crear el producto' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      cost_price: '',
      retail_price: '',
      wholesale_price: '',
      category: '',
      barcode: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl p-6 mx-auto bg-white rounded-xl shadow-lg dark:bg-gray-800 animate-fadeIn max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Agregar Nuevo Producto
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nombre del Producto *
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={!!errors.name}
                placeholder="Ej: Zapatillas Nike Air Max"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <Label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descripción
              </Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Descripción del producto"
              />
            </div>

            {/* Precios */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cost_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Precio de Costo *
                </Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) => handleChange('cost_price', e.target.value)}
                  error={!!errors.cost_price}
                  placeholder="0.00"
                />
                {errors.cost_price && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.cost_price}</p>
                )}
              </div>

              <div>
                <Label htmlFor="retail_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Precio de Venta *
                </Label>
                <Input
                  id="retail_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.retail_price}
                  onChange={(e) => handleChange('retail_price', e.target.value)}
                  error={!!errors.retail_price}
                  placeholder="0.00"
                />
                {errors.retail_price && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.retail_price}</p>
                )}
              </div>

              <div>
                <Label htmlFor="wholesale_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Precio Mayorista
                </Label>
                <Input
                  id="wholesale_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.wholesale_price}
                  onChange={(e) => handleChange('wholesale_price', e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            {/* Categoría y Código de Barras */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Categoría *
                </Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>
                )}
              </div>

              <div>
                <Label htmlFor="barcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Código de Barras
                </Label>
                <Input
                  id="barcode"
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => handleChange('barcode', e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear Producto'}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
};

export default AddProductModal;
