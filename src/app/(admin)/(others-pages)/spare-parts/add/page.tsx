'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Alert from '@/components/ui/alert/Alert';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import { fetchApi } from '@/app/lib/data';

interface FormData {
  name: string;
  description: string;
  barcode: string;
  cost_price: string;
  retail_price: string;
  current_stock: string;
  minimum_stock: string;
  reorder_point: string;
  maximum_stock: string;
  is_active: boolean;
}

interface FormErrors {
  name?: string;
  cost_price?: string;
  retail_price?: string;
}

const AddSparePartPage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    barcode: '',
    cost_price: '',
    retail_price: '',
    current_stock: '0',
    minimum_stock: '0',
    reorder_point: '0',
    maximum_stock: '0',
    is_active: true,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.retail_price || isNaN(Number(formData.retail_price))) newErrors.retail_price = 'Precio de venta inválido';
    if (!formData.cost_price || isNaN(Number(formData.cost_price))) newErrors.cost_price = 'Costo inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        barcode: formData.barcode.trim() || null,
        cost_price: Number(formData.cost_price),
        retail_price: Number(formData.retail_price),
        current_stock: Number(formData.current_stock || '0'),
        minimum_stock: Number(formData.minimum_stock || '0'),
        reorder_point: Number(formData.reorder_point || '0'),
        maximum_stock: Number(formData.maximum_stock || '0'),
        is_active: formData.is_active,
      };

      const response = await fetchApi('/api/spare-parts/', { method: 'POST', body: payload });
      if (response) {
        router.push('/spare-parts');
      }
    } catch (error) {
      console.error('Error al crear repuesto:', error);
      setAlertMessage('Error al crear el repuesto. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/spare-parts');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <Link href="/spare-parts" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Volver a repuestos</span>
        </Link>
      </div>

      {alertMessage && (
        <div className="mb-4">
          <Alert variant="error" title="Error" message={alertMessage} />
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Crear Nuevo Repuesto</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre del repuesto" error={!!errors.name} />
              {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
            </div>
            <div>
              <Label>Código de barras</Label>
              <Input type="text" name="barcode" value={formData.barcode} onChange={handleInputChange} placeholder="Código de barras (opcional)" />
            </div>
            <div className="md:col-span-2">
              <Label>Descripción</Label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Descripción del repuesto" />
            </div>

            <div>
              <Label>Costo</Label>
              <Input type="number" step="0.01" name="cost_price" value={formData.cost_price} onChange={handleInputChange} placeholder="Costo" error={!!errors.cost_price} />
              {errors.cost_price && <span className="text-xs text-red-500">{errors.cost_price}</span>}
            </div>
            <div>
              <Label>Precio de venta</Label>
              <Input type="number" step="0.01" name="retail_price" value={formData.retail_price} onChange={handleInputChange} placeholder="Precio de venta" error={!!errors.retail_price} />
              {errors.retail_price && <span className="text-xs text-red-500">{errors.retail_price}</span>}
            </div>

            <div>
              <Label>Stock actual</Label>
              <Input type="number" name="current_stock" value={formData.current_stock} onChange={handleInputChange} placeholder="0" />
            </div>
            <div>
              <Label>Punto de reposición</Label>
              <Input type="number" name="reorder_point" value={formData.reorder_point} onChange={handleInputChange} placeholder="0" />
            </div>
            <div>
              <Label>Stock mínimo</Label>
              <Input type="number" name="minimum_stock" value={formData.minimum_stock} onChange={handleInputChange} placeholder="0" />
            </div>
            <div>
              <Label>Stock máximo</Label>
              <Input type="number" name="maximum_stock" value={formData.maximum_stock} onChange={handleInputChange} placeholder="0" />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleInputChange} />
              <Label htmlFor="is_active">Activo</Label>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-200 dark:border-gray-800">
            <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed">
              {isSubmitting ? (
                <>
                  <svg className="inline w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creando...
                </>
              ) : (
                'Crear Repuesto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSparePartPage;

