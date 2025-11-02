'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Link from 'next/link';
import Alert from '@/components/ui/alert/Alert';
import { fetchApi } from '@/app/lib/data';

// Interfaces para el formulario de facturas AFIP
interface Branch {
  id: number;
  name: string;
  code: string;
  address: string;
  status: string;
}

interface AFIPConfiguration {
  id: string;
  branch: number;
  cuit: string;
  razon_social: string;
  punto_venta: number;
  is_active: boolean;
  production_mode: boolean;
  certificate_path: string;
  private_key_path: string;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier: {
    id: string;
    name: string;
    tax_id: string;
  };
  total: number;
  status: string;
}

interface Sale {
  id: string;
  sale_number: string;
  customer: {
    id: string;
    name: string;
    tax_id: string;
  } | null;
  customer_name: string;
  customer_tax_id: string;
  total: number;
  status: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  retail_price: number;
  category: {
    id: string;
    name: string;
  };
}

interface AFIPInvoiceFormData {
  branch: string;
  afip_config: string;
  tipo_comprobante: string;
  documento_tipo: string;
  documento_numero: string;
  razon_social: string;
  purchase_order: string;
  sale: string;
  fecha_vencimiento: string;
}

interface AFIPInvoiceItemFormData {
  product: string;
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
  alicuota_iva: string;
}

interface FormErrors {
  branch?: string;
  afip_config?: string;
  tipo_comprobante?: string;
  documento_tipo?: string;
  documento_numero?: string;
  razon_social?: string;
  purchase_order?: string;
  sale?: string;
  fecha_vencimiento?: string;
  items?: string;
}

interface ItemErrors {
  [key: number]: {
    product?: string;
    descripcion?: string;
    cantidad?: string;
    precio_unitario?: string;
    alicuota_iva?: string;
  };
}

const AddAFIPInvoicePage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('error');
  
  // Estados para datos del formulario
  const [branches, setBranches] = useState<Branch[]>([]);
  const [afipConfigs, setAfipConfigs] = useState<AFIPConfiguration[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [formData, setFormData] = useState<AFIPInvoiceFormData>({
    branch: '',
    afip_config: '',
    tipo_comprobante: '1', // Factura A por defecto
    documento_tipo: '80', // CUIT por defecto
    documento_numero: '',
    razon_social: '',
    purchase_order: '',
    sale: '',
    fecha_vencimiento: ''
  });

  const [items, setItems] = useState<AFIPInvoiceItemFormData[]>([{
    product: '',
    descripcion: '',
    cantidad: '1',
    precio_unitario: '0',
    alicuota_iva: '21.00'
  }]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [itemErrors, setItemErrors] = useState<ItemErrors>({});

  // Opciones para los selects
  const tipoComprobanteOptions = [
    { value: '1', label: 'Factura A' },
    { value: '6', label: 'Factura B' },
    { value: '11', label: 'Factura C' },
    { value: '3', label: 'Nota de Crédito A' },
    { value: '8', label: 'Nota de Crédito B' },
    { value: '13', label: 'Nota de Crédito C' },
    { value: '2', label: 'Nota de Débito A' },
    { value: '7', label: 'Nota de Débito B' },
    { value: '12', label: 'Nota de Débito C' }
  ];

  const documentoTipoOptions = [
    { value: '80', label: 'CUIT' },
    { value: '86', label: 'CUIL' },
    { value: '96', label: 'DNI' },
    { value: '99', label: 'Sin identificar' }
  ];

  // Cargar datos iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoadingBranches(true);
        setLoadingProducts(true);
        
        const [branchesResponse, productsResponse] = await Promise.all([
          fetchApi<{ results: Branch[] }>('/api/branches/'),
          fetchApi<{ results: Product[] }>('/api/products/')
        ]);

        if (branchesResponse) {
          setBranches(branchesResponse.results.filter(branch => branch.status === 'active'));
        }
        
        if (productsResponse) {
          setProducts(productsResponse.results);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setAlertMessage('Error al cargar los datos iniciales');
        setAlertType('error');
      } finally {
        setLoadingBranches(false);
        setLoadingProducts(false);
      }
    };

    fetchInitialData();
  }, []);

  // Cargar configuraciones AFIP cuando se selecciona una sucursal
  useEffect(() => {
    if (formData.branch) {
      const fetchAfipConfigs = async () => {
        try {
          setLoadingConfigs(true);
          const response = await fetchApi<{ results: AFIPConfiguration[] }>(`/api/afip-configurations/?branch=${formData.branch}`);
          if (response) {
            setAfipConfigs(response.results.filter(config => config.is_active));
          }
        } catch (error) {
          console.error('Error fetching AFIP configurations:', error);
        } finally {
          setLoadingConfigs(false);
        }
      };

      fetchAfipConfigs();
    } else {
      setAfipConfigs([]);
    }
  }, [formData.branch]);

  // Cargar órdenes de compra y ventas cuando se selecciona una sucursal
  useEffect(() => {
    if (formData.branch) {
      const fetchOrdersAndSales = async () => {
        try {
          setLoadingOrders(true);
          setLoadingSales(true);
          
          const [ordersResponse, salesResponse] = await Promise.all([
            fetchApi<{ results: PurchaseOrder[] }>(`/api/purchase-orders/?branch=${formData.branch}&status=COMPLETED`),
            fetchApi<{ results: Sale[] }>(`/api/sales/?branch=${formData.branch}&status=COMPLETED`)
          ]);

          if (ordersResponse) {
            setPurchaseOrders(ordersResponse.results);
          }
          
          if (salesResponse) {
            setSales(salesResponse.results);
          }
        } catch (error) {
          console.error('Error fetching orders and sales:', error);
        } finally {
          setLoadingOrders(false);
          setLoadingSales(false);
        }
      };

      fetchOrdersAndSales();
    } else {
      setPurchaseOrders([]);
      setSales([]);
    }
  }, [formData.branch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar errores cuando el usuario empiece a escribir
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleItemChange = (index: number, field: keyof AFIPInvoiceItemFormData, value: string) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };

    // Si se selecciona un producto, auto-completar descripción y precio
    if (field === 'product' && value) {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        newItems[index].descripcion = selectedProduct.description || selectedProduct.name;
        newItems[index].precio_unitario = selectedProduct.retail_price.toString();
      }
    }

    setItems(newItems);

    // Limpiar errores del item
    if (itemErrors[index]?.[field]) {
      setItemErrors(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          [field]: undefined
        }
      }));
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      product: '',
      descripcion: '',
      cantidad: '1',
      precio_unitario: '0',
      alicuota_iva: '21.00'
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
      setItemErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const newItemErrors: ItemErrors = {};

    // Validaciones del formulario principal
    if (!formData.branch) newErrors.branch = 'La sucursal es requerida';
    if (!formData.afip_config) newErrors.afip_config = 'La configuración AFIP es requerida';
    if (!formData.tipo_comprobante) newErrors.tipo_comprobante = 'El tipo de comprobante es requerido';
    if (!formData.documento_tipo) newErrors.documento_tipo = 'El tipo de documento es requerido';
    if (!formData.documento_numero.trim()) newErrors.documento_numero = 'El número de documento es requerido';
    if (!formData.razon_social.trim()) newErrors.razon_social = 'La razón social es requerida';
    
    // Validar que se especifique al menos una orden de compra o venta
    if (!formData.purchase_order && !formData.sale) {
      newErrors.purchase_order = 'Debe especificar al menos una orden de compra o una venta';
      newErrors.sale = 'Debe especificar al menos una orden de compra o una venta';
    }

    // Validaciones de items
    if (items.length === 0) {
      newErrors.items = 'Debe agregar al menos un item';
    } else {
      items.forEach((item, index) => {
        const itemError: any = {};
        
        if (!item.descripcion.trim()) itemError.descripcion = 'La descripción es requerida';
        if (!item.cantidad || parseFloat(item.cantidad) <= 0) itemError.cantidad = 'La cantidad debe ser mayor a 0';
        if (!item.precio_unitario || parseFloat(item.precio_unitario) <= 0) itemError.precio_unitario = 'El precio debe ser mayor a 0';
        if (!item.alicuota_iva || parseFloat(item.alicuota_iva) < 0) itemError.alicuota_iva = 'La alícuota IVA debe ser válida';

        if (Object.keys(itemError).length > 0) {
          newItemErrors[index] = itemError;
        }
      });
    }

    setErrors(newErrors);
    setItemErrors(newItemErrors);

    return Object.keys(newErrors).length === 0 && Object.keys(newItemErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setAlertMessage('Por favor, corrija los errores en el formulario');
      setAlertType('error');
      return;
    }

    setIsSubmitting(true);
    setAlertMessage(null);

    try {
      const submitData = {
        ...formData,
        items: items.map(item => ({
          product: item.product || null,
          descripcion: item.descripcion,
          cantidad: parseFloat(item.cantidad),
          precio_unitario: parseFloat(item.precio_unitario),
          alicuota_iva: parseFloat(item.alicuota_iva)
        }))
      };

      const response = await fetchApi('/api/afip-invoices/', {
        method: 'POST',
        body: submitData,
      });

      if (response) {
        setAlertMessage('Factura AFIP creada exitosamente');
        setAlertType('success');
        
        // Redirigir después de un breve delay
        setTimeout(() => {
          router.push('/arca');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error creating AFIP invoice:', error);
      setAlertMessage(error.message || 'Error al crear la factura AFIP');
      setAlertType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Nueva Factura AFIP
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Crear una nueva factura electrónica AFIP
              </p>
            </div>
            <Link
              href="/arca"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              ← Volver
            </Link>
          </div>
        </div>

        {/* Alert */}
        {alertMessage && (
          <div className="mb-6">
            <Alert
              variant={alertType}
              title={alertType === 'success' ? 'Éxito' : 'Error'}
              message={alertMessage}
              onClose={() => setAlertMessage(null)}
            />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Información General */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Información General
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sucursal */}
              <div>
                <Label htmlFor="branch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sucursal *
                </Label>
                <select
                  id="branch"
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  disabled={loadingBranches}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.branch ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Seleccionar sucursal...</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} - {branch.address}
                    </option>
                  ))}
                </select>
                {errors.branch && (
                  <span className="text-xs text-red-500">{errors.branch}</span>
                )}
              </div>

              {/* Configuración AFIP */}
              <div>
                <Label htmlFor="afip_config" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Configuración AFIP *
                </Label>
                <select
                  id="afip_config"
                  name="afip_config"
                  value={formData.afip_config}
                  onChange={handleInputChange}
                  disabled={loadingConfigs || !formData.branch}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.afip_config ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Seleccionar configuración...</option>
                  {afipConfigs.map(config => (
                    <option key={config.id} value={config.id}>
                      {config.razon_social} - CUIT: {config.cuit} - PV: {config.punto_venta}
                    </option>
                  ))}
                </select>
                {errors.afip_config && (
                  <span className="text-xs text-red-500">{errors.afip_config}</span>
                )}
              </div>

              {/* Tipo de Comprobante */}
              <div>
                <Label htmlFor="tipo_comprobante" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Comprobante *
                </Label>
                <select
                  id="tipo_comprobante"
                  name="tipo_comprobante"
                  value={formData.tipo_comprobante}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.tipo_comprobante ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {tipoComprobanteOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.tipo_comprobante && (
                  <span className="text-xs text-red-500">{errors.tipo_comprobante}</span>
                )}
              </div>

              {/* Fecha de Vencimiento */}
              <div>
                <Label htmlFor="fecha_vencimiento" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha de Vencimiento
                </Label>
                <Input
                  type="date"
                  id="fecha_vencimiento"
                  name="fecha_vencimiento"
                  value={formData.fecha_vencimiento}
                  onChange={handleInputChange}
                  error={!!errors.fecha_vencimiento}
                />
                {errors.fecha_vencimiento && (
                  <span className="text-xs text-red-500">{errors.fecha_vencimiento}</span>
                )}
              </div>
            </div>
          </div>

          {/* Información del Cliente/Receptor */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Información del Cliente/Receptor
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tipo de Documento */}
              <div>
                <Label htmlFor="documento_tipo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Documento *
                </Label>
                <select
                  id="documento_tipo"
                  name="documento_tipo"
                  value={formData.documento_tipo}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.documento_tipo ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {documentoTipoOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.documento_tipo && (
                  <span className="text-xs text-red-500">{errors.documento_tipo}</span>
                )}
              </div>

              {/* Número de Documento */}
              <div>
                <Label htmlFor="documento_numero" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Número de Documento *
                </Label>
                <Input
                  type="text"
                  id="documento_numero"
                  name="documento_numero"
                  value={formData.documento_numero}
                  onChange={handleInputChange}
                  placeholder="Ej: 20123456789"
                  error={!!errors.documento_numero}
                />
                {errors.documento_numero && (
                  <span className="text-xs text-red-500">{errors.documento_numero}</span>
                )}
              </div>

              {/* Razón Social */}
              <div>
                <Label htmlFor="razon_social" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Razón Social *
                </Label>
                <Input
                  type="text"
                  id="razon_social"
                  name="razon_social"
                  value={formData.razon_social}
                  onChange={handleInputChange}
                  placeholder="Nombre o razón social del cliente"
                  error={!!errors.razon_social}
                />
                {errors.razon_social && (
                  <span className="text-xs text-red-500">{errors.razon_social}</span>
                )}
              </div>
            </div>
          </div>

          {/* Origen de la Factura */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Origen de la Factura
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Orden de Compra */}
              <div>
                <Label htmlFor="purchase_order" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Orden de Compra
                </Label>
                <select
                  id="purchase_order"
                  name="purchase_order"
                  value={formData.purchase_order}
                  onChange={handleInputChange}
                  disabled={loadingOrders || !formData.branch}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.purchase_order ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Seleccionar orden de compra...</option>
                  {purchaseOrders.map(order => (
                    <option key={order.id} value={order.id}>
                      {order.order_number} - {order.supplier.name} - ${order.total}
                    </option>
                  ))}
                </select>
                {errors.purchase_order && (
                  <span className="text-xs text-red-500">{errors.purchase_order}</span>
                )}
              </div>

              {/* Venta */}
              <div>
                <Label htmlFor="sale" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Venta
                </Label>
                <select
                  id="sale"
                  name="sale"
                  value={formData.sale}
                  onChange={handleInputChange}
                  disabled={loadingSales || !formData.branch}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.sale ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Seleccionar venta...</option>
                  {sales.map(sale => (
                    <option key={sale.id} value={sale.id}>
                      {sale.sale_number} - {sale.customer?.name || sale.customer_name} - ${sale.total}
                    </option>
                  ))}
                </select>
                {errors.sale && (
                  <span className="text-xs text-red-500">{errors.sale}</span>
                )}
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Nota:</strong> Debe seleccionar al menos una orden de compra o una venta como origen de la factura.
              </p>
            </div>
          </div>

          {/* Items de la Factura */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Items de la Factura
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                + Agregar Item
              </button>
            </div>

            {errors.items && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <span className="text-sm text-red-600 dark:text-red-400">{errors.items}</span>
              </div>
            )}

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Item #{index + 1}
                    </h3>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Producto */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Producto
                      </Label>
                      <select
                        value={item.product}
                        onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                        disabled={loadingProducts}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          itemErrors[index]?.product ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <option value="">Seleccionar producto...</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      {itemErrors[index]?.product && (
                        <span className="text-xs text-red-500">{itemErrors[index].product}</span>
                      )}
                    </div>

                    {/* Descripción */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Descripción *
                      </Label>
                      <Input
                        type="text"
                        value={item.descripcion}
                        onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                        placeholder="Descripción del item"
                        error={!!itemErrors[index]?.descripcion}
                      />
                      {itemErrors[index]?.descripcion && (
                        <span className="text-xs text-red-500">{itemErrors[index].descripcion}</span>
                      )}
                    </div>

                    {/* Cantidad */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cantidad *
                      </Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={item.cantidad}
                        onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)}
                        placeholder="1"
                        error={!!itemErrors[index]?.cantidad}
                      />
                      {itemErrors[index]?.cantidad && (
                        <span className="text-xs text-red-500">{itemErrors[index].cantidad}</span>
                      )}
                    </div>

                    {/* Precio Unitario */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Precio Unitario *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.precio_unitario}
                        onChange={(e) => handleItemChange(index, 'precio_unitario', e.target.value)}
                        placeholder="0.00"
                        error={!!itemErrors[index]?.precio_unitario}
                      />
                      {itemErrors[index]?.precio_unitario && (
                        <span className="text-xs text-red-500">{itemErrors[index].precio_unitario}</span>
                      )}
                    </div>

                    {/* Alícuota IVA */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        IVA (%) *
                      </Label>
                      <select
                        value={item.alicuota_iva}
                        onChange={(e) => handleItemChange(index, 'alicuota_iva', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          itemErrors[index]?.alicuota_iva ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <option value="0">0%</option>
                        <option value="10.5">10.5%</option>
                        <option value="21">21%</option>
                        <option value="27">27%</option>
                      </select>
                      {itemErrors[index]?.alicuota_iva && (
                        <span className="text-xs text-red-500">{itemErrors[index].alicuota_iva}</span>
                      )}
                    </div>
                  </div>

                  {/* Totales del item */}
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          ${(parseFloat(item.cantidad || '0') * parseFloat(item.precio_unitario || '0')).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">IVA:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          ${((parseFloat(item.cantidad || '0') * parseFloat(item.precio_unitario || '0')) * (parseFloat(item.alicuota_iva || '0') / 100)).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Total:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          ${((parseFloat(item.cantidad || '0') * parseFloat(item.precio_unitario || '0')) * (1 + parseFloat(item.alicuota_iva || '0') / 100)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total General */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900 dark:text-white">
                  Total General:
                </span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  ${items.reduce((total, item) => {
                    const subtotal = parseFloat(item.cantidad || '0') * parseFloat(item.precio_unitario || '0');
                    const iva = subtotal * (parseFloat(item.alicuota_iva || '0') / 100);
                    return total + subtotal + iva;
                  }, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end space-x-4 pt-6">
            <Link
              href="/arca"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creando...
                </>
              ) : (
                'Crear Factura AFIP'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAFIPInvoicePage;