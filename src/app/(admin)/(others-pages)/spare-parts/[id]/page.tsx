'use client'
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Alert from '@/components/ui/alert/Alert';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import { fetchApi } from '@/app/lib/data';

interface Product {
  id: string;
  name: string;
  description: string;
  barcode: string | null;
  cost_price: string;
  retail_price: string;
  current_stock: number;
  minimum_stock: number;
  reorder_point: number;
  maximum_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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

const formatCurrency = (value: string | number) => {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

const SparePartDetailPage = () => {
  const params = useParams();
  const id = params.id as string;
  const [item, setItem] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
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

  useEffect(() => {
    const loadItem = async () => {
      try {
        setLoading(true);
        const data = await fetchApi<Product>(`/api/spare-parts/${id}/`, { method: 'GET' });
        if (data) {
          setItem(data);
          setFormData({
            name: data.name,
            description: data.description || '',
            barcode: data.barcode || '',
            cost_price: String(data.cost_price),
            retail_price: String(data.retail_price),
            current_stock: String(data.current_stock),
            minimum_stock: String(data.minimum_stock),
            reorder_point: String(data.reorder_point),
            maximum_stock: String(data.maximum_stock),
            is_active: data.is_active,
          });
        } else {
          setError('Repuesto no encontrado');
        }
      } catch (err) {
        setError('Error al cargar el repuesto');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) loadItem();
  }, [id]);

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      const payload: Partial<Product> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        barcode: formData.barcode.trim() || null,
        cost_price: Number(formData.cost_price) as unknown as string,
        retail_price: Number(formData.retail_price) as unknown as string,
        current_stock: Number(formData.current_stock) as unknown as number,
        minimum_stock: Number(formData.minimum_stock) as unknown as number,
        reorder_point: Number(formData.reorder_point) as unknown as number,
        maximum_stock: Number(formData.maximum_stock) as unknown as number,
        is_active: formData.is_active,
      };
      const resp = await fetchApi(`/api/spare-parts/${id}/`, { method: 'PATCH', body: payload });
      if (resp) {
        const refreshed = await fetchApi<Product>(`/api/spare-parts/${id}/`);
        if (refreshed) setItem(refreshed);
        setAlertMessage('Repuesto actualizado correctamente');
      }
    } catch (err) {
      console.error('Error updating spare part:', err);
      setAlertMessage('Error al actualizar el repuesto');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const result = await fetchApi(`/api/spare-parts/${id}/`, { method: 'DELETE' });
      if (result !== undefined) {
        window.location.href = '/spare-parts';
      }
    } catch (err) {
      console.error('Error deleting spare part:', err);
      setAlertMessage('Error al eliminar el repuesto');
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !item) {
    return <div className="p-4 text-red-500">{error || 'Repuesto no encontrado'}</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <Link href="/spare-parts" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Volver a repuestos</span>
        </Link>
        <div className="space-x-3">
          <button onClick={handleDelete} className="flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 8a1 1 0 011-1h6a1 1 0 011 1v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8zm3-5a1 1 0 00-1 1v1H6a1 1 0 000 2h8a1 1 0 000-2h-2V4a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Eliminar
          </button>
        </div>
      </div>

      {alertMessage && (
        <div className="mb-4">
          <Alert variant="success" title="Estado" message={alertMessage} />
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="p-5 lg:p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Detalle de Repuesto</h3>
            <div className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span>Estado</span>
                <span
                  onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                  className={`cursor-pointer px-3 py-2 rounded-md ${formData.is_active ? 'text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400' : 'text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'}`}
                >
                  {formData.is_active ? 'Desactivar' : 'Activar'}
                </span>
              </div>
            </div>
            <div className="space-x-3">
              <button onClick={handleSubmit} className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700">
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                </svg>
                Guardar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Nombre</p>
              <Input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre" />
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Código de barras</p>
              <Input type="text" name="barcode" value={formData.barcode} onChange={handleInputChange} placeholder="Código de barras" />
            </div>
            <div className="lg:col-span-2">
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Descripción</p>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Descripción" />
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Costo</p>
              <Input type="number" step="0.01" name="cost_price" value={formData.cost_price} onChange={handleInputChange} placeholder="Costo" />
              <span className="text-xs text-gray-500">Actual: {formatCurrency(item.cost_price)}</span>
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Precio de venta</p>
              <Input type="number" step="0.01" name="retail_price" value={formData.retail_price} onChange={handleInputChange} placeholder="Precio de venta" />
              <span className="text-xs text-gray-500">Actual: {formatCurrency(item.retail_price)}</span>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Stock actual</p>
              <Input type="number" name="current_stock" value={formData.current_stock} onChange={handleInputChange} placeholder="0" />
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Punto de reposición</p>
              <Input type="number" name="reorder_point" value={formData.reorder_point} onChange={handleInputChange} placeholder="0" />
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Stock mínimo</p>
              <Input type="number" name="minimum_stock" value={formData.minimum_stock} onChange={handleInputChange} placeholder="0" />
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Stock máximo</p>
              <Input type="number" name="maximum_stock" value={formData.maximum_stock} onChange={handleInputChange} placeholder="0" />
            </div>

            <div className="lg:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleInputChange} />
              <Label htmlFor="is_active">Activo</Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SparePartDetailPage;

