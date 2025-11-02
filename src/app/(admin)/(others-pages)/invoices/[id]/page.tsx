'use client'
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/app/lib/data';
import Badge from '@/components/ui/badge/Badge';
import Alert from '@/components/ui/alert/Alert';

// Interfaces para el modelo de Invoice
interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: 'SALE' | 'PURCHASE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  sale: {
    id: string;
    sale_number: string;
    customer: any;
    customer_type: string;
    customer_display_name: string;
    customer_tax_id: string;
    customer_email: string;
    customer_phone: string;
    customer_address: string;
    customer_name: string;
    items: Array<{
      id: string;
      product: {
        id: string;
        name: string;
        description: string;
        barcode: string;
        cost_price: string;
        retail_price: string;
        category: {
          id: string;
          name: string;
          description: string;
          image: string;
        };
        category_name: string;
        image: string;
      };
      product_name: string;
      quantity: number;
      unit_price: string;
      tax_rate: string;
      discount_rate: string;
      subtotal: string;
      tax_amount: string;
      discount_amount: string;
      total: string;
    }>;
  } | null;
  purchase_order: {
    id: string;
    order_number: string;
  } | null;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    tax_id: string;
    address: string;
  } | null;
  supplier: {
    id: string;
    name: string;
    email: string;
    phone: string;
    tax_id: string;
    address: string;
  } | null;
  customer_display_name: string;
  supplier_display_name: string;
  branch: {
    id: number;
    name: string;
    code: string;
    address: string;
    phone: string;
    email: string;
    status: string;
    status_display: string;
    latitude: string;
    longitude: string;
    manager: string | null;
    max_capacity: number;
    active_employees: number;
    available_capacity: number;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    schedules: Array<{
      id: number;
      branch: number;
      day_of_week: number;
      day_of_week_display: string;
      opening_time: string;
      closing_time: string;
      closed: boolean;
    }>;
  };
  branch_name: string;
  created_by: {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    is_verified: boolean;
    role: string;
    date_joined: string;
    is_active: boolean;
    profile_picture: string | null;
  };
  invoice_date: string;
  due_date: string | null;
  subtotal: string;
  tax_amount: string;
  total: string;
  notes: string;
  electronic_signature: string;
  created_at: string;
  updated_at: string;
}

// Interfaces para alertas
interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatCurrency = (amount: string) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(parseFloat(amount));
};

// Función para obtener el color del badge según el estado
const getStatusBadgeColor = (status: Invoice['status']) => {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'REJECTED':
      return 'error';
    case 'CANCELLED':
      return 'error';
    case 'DRAFT':
    default:
      return 'light';
  }
};

// Función para obtener el color del badge según el tipo
const getTypeBadgeColor = (type: Invoice['invoice_type']) => {
  switch (type) {
    case 'SALE':
      return 'success';
    case 'PURCHASE':
      return 'primary';
    case 'CREDIT_NOTE':
      return 'warning';
    case 'DEBIT_NOTE':
      return 'info';
    default:
      return 'light';
  }
};

// Función para obtener el texto del estado
const getStatusText = (status: Invoice['status']) => {
  switch (status) {
    case 'DRAFT':
      return 'Borrador';
    case 'PENDING':
      return 'Pendiente';
    case 'APPROVED':
      return 'Aprobada';
    case 'REJECTED':
      return 'Rechazada';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status;
  }
};

// Función para obtener el texto del tipo
const getTypeText = (type: Invoice['invoice_type']) => {
  switch (type) {
    case 'SALE':
      return 'Venta';
    case 'PURCHASE':
      return 'Compra';
    case 'CREDIT_NOTE':
      return 'Nota de Crédito';
    case 'DEBIT_NOTE':
      return 'Nota de Débito';
    default:
      return type;
  }
};

const InvoiceDetail = () => {
  const params = useParams();
  const invoiceId = params.id as string;
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Función para cambiar el estado de la factura
  const changeInvoiceStatus = async (newStatus: Invoice['status']) => {
    if (!invoice) return;

    try {
      const response = await fetchApi(`/api/invoices/${invoice.id}/`, {
        method: 'PATCH',
        body: { status: newStatus },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response) {
        setInvoice(prev => prev ? { ...prev, status: newStatus } : null);
        
        setAlert({
          show: true,
          type: 'success',
          title: 'Estado actualizado',
          message: `Factura ${getStatusText(newStatus).toLowerCase()} correctamente`
        });
      }
    } catch {
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudo actualizar el estado de la factura'
      });
    }
  };

  // Cargar factura desde la API
  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchApi<Invoice>(`/api/invoices/${invoiceId}/`);

      if (response) {
        setInvoice(response);
      } else {
        throw new Error('No se pudo cargar la factura');
      }
    } catch {
      console.error('Error al cargar la factura:', error);
      setError('Error al cargar la factura. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar factura al montar el componente
  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  // Función para ocultar la alerta después de cierto tiempo
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (alert.show) {
      timeoutId = setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 5000);
    }
    return () => clearTimeout(timeoutId);
  }, [alert.show]);

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-4 text-red-500">
        {error || 'Factura no encontrada'}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Alertas */}
      {alert.show && (
        <div className="mb-6">
          <Alert
            variant={alert.type}
            title={alert.title}
            message={alert.message}
          />
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <Link
          href="/invoices"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Volver a facturas</span>
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="p-5 lg:p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Detalle de Factura
            </h3>
            <div className="space-x-3">
              {invoice.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => changeInvoiceStatus('APPROVED')}
                    className="flex items-center justify-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 shadow-sm hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-800/30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Aprobar
                  </button>
                  <button
                    onClick={() => changeInvoiceStatus('REJECTED')}
                    className="flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-800/30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Rechazar
                  </button>
                </>
              )}
              {invoice.status === 'DRAFT' && (
                <button
                  onClick={() => changeInvoiceStatus('PENDING')}
                  className="flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-800/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Enviar para Aprobación
                </button>
              )}
              {invoice.status === 'APPROVED' && (
                <button
                  onClick={() => changeInvoiceStatus('CANCELLED')}
                  className="flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 shadow-sm hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-800/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
              )}
            </div>
          </div>

          {/* Perfil de la Factura */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
                {/* Avatar de la factura */}
                <div className="relative w-24 h-24 xl:w-28 xl:h-28">
                  <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-medium">
                    {invoice.invoice_number.charAt(0)}
                  </div>
                  <div className={`absolute -right-1 -bottom-1 h-6 w-6 rounded-full ${
                    invoice.status === 'APPROVED' ? 'bg-green-500' : 
                    invoice.status === 'PENDING' ? 'bg-yellow-500' : 
                    invoice.status === 'REJECTED' ? 'bg-red-500' : 
                    invoice.status === 'CANCELLED' ? 'bg-red-500' : 'bg-gray-500'
                  } border-2 border-white`}></div>
                </div>

                <div className="order-3 xl:order-2">
                  <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                    {invoice.invoice_number}
                  </h4>
                  <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {invoice.branch_name}
                    </span>
                    <span className="hidden xl:block text-gray-500 dark:text-gray-400">•</span>
                    <div className="flex items-center">
                      <Badge
                        size="sm"
                        color={getStatusBadgeColor(invoice.status)}
                      >
                        {getStatusText(invoice.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="hidden xl:block xl:ml-auto order-2 xl:order-3">
                  <Badge
                    size="md"
                    color={getStatusBadgeColor(invoice.status)}
                  >
                    {getStatusText(invoice.status)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Información Principal */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                Información Principal
              </h4>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Número de Factura
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.invoice_number}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Tipo de Factura
                  </p>
                  <div className="flex gap-2">
                    <Badge
                      size="sm"
                      color={getTypeBadgeColor(invoice.invoice_type)}
                    >
                      {getTypeText(invoice.invoice_type)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Estado
                  </p>
                  <div className="flex gap-2">
                    <Badge
                      size="sm"
                      color={getStatusBadgeColor(invoice.status)}
                    >
                      {getStatusText(invoice.status)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Fecha de Emisión
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {formatDate(invoice.invoice_date)}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Sucursal
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.branch_name}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Vendedor
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.created_by.first_name} {invoice.created_by.last_name}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Fecha de registro
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {formatDate(invoice.created_at)}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Última actualización
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {formatDate(invoice.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Información del Cliente/Proveedor */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                {invoice.invoice_type === 'SALE' || invoice.invoice_type === 'CREDIT_NOTE' ? 'Información del Cliente' : 'Información del Proveedor'}
              </h4>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Nombre
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.customer_display_name || invoice.supplier_display_name || invoice.customer?.name || invoice.supplier?.name || 'No disponible'}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Email
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.sale?.customer_email || invoice.customer?.email || invoice.supplier?.email || 'No disponible'}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Teléfono
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.sale?.customer_phone || invoice.customer?.phone || invoice.supplier?.phone || 'No disponible'}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    CUIT/DNI
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.sale?.customer_tax_id || invoice.customer?.tax_id || invoice.supplier?.tax_id || 'No disponible'}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Dirección
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.sale?.customer_address || invoice.customer?.address || invoice.supplier?.address || 'No disponible'}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Tipo de Cliente
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.sale?.customer_type === 'OCCASIONAL' ? 'Ocasional' : invoice.sale?.customer_type || 'No disponible'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Productos de la Venta */}
          {invoice.sale?.items && invoice.sale.items.length > 0 && (
            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                  Productos Vendidos
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Producto</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Cantidad</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Precio Unit.</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.sale.items.map((item, index) => (
                        <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              {item.product.image && (
                                <img 
                                  src={item.product.image} 
                                  alt={item.product_name}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                              )}
                              <div>
                                <p className="font-medium text-gray-800 dark:text-white/90">
                                  {item.product_name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {item.product.category_name}
                                </p>
                                {item.product.barcode && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Código: {item.product.barcode}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center font-medium text-gray-800 dark:text-white/90">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-2 text-right font-medium text-gray-800 dark:text-white/90">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="py-3 px-2 text-right font-medium text-gray-800 dark:text-white/90">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Información Financiera */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Información Financiera
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir
                </button>
                <button
                  onClick={async () => {
                    try {
                      const jwt_token = localStorage.getItem("token");
                      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
                      
                      const response = await fetch(`${baseUrl}/api/invoices/${invoice.id}/export_pdf/`, {
                         method: 'GET',
                         headers: {
                           "Authorization": `Bearer ${jwt_token}`,
                         }
                       });
                       
                       if (!response.ok) {
                         throw new Error('Error al exportar PDF');
                       }
                       
                       const blob = await response.blob();
                       
                       if (blob) {
                      
                      const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        a.download = `factura_${invoice.invoice_number}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        
                        setAlert({
                          show: true,
                          type: 'success',
                          title: 'PDF exportado',
                          message: 'El PDF se ha descargado correctamente'
                        });
                      }
                    } catch (error) {
                      console.error('Error al exportar PDF:', error);
                      setAlert({
                        show: true,
                        type: 'error',
                        title: 'Error',
                        message: 'No se pudo exportar el PDF'
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Subtotal
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {formatCurrency(invoice.subtotal)}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Impuestos (IVA)
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {formatCurrency(invoice.tax_amount)}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Total
                </p>
                <p className="text-lg font-bold text-gray-800 dark:text-white/90">
                  {formatCurrency(invoice.total)}
                </p>
              </div>

              {invoice.due_date && (
                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Fecha de Vencimiento
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {formatDate(invoice.due_date)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Información de Referencia */}
          {(invoice.sale || invoice.purchase_order) && (
            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                  Información de Referencia
                </h4>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                  {invoice.sale && (
                    <div>
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                        Venta Relacionada
                      </p>
                      <Link
                        href={`/sales/${invoice.sale.id}/`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {invoice.sale.sale_number}
                      </Link>
                    </div>
                  )}

                  {invoice.purchase_order && (
                    <div>
                      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                        Orden de Compra Relacionada
                      </p>
                      <Link
                        href={`/purchase-orders/${invoice.purchase_order.id}/`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {invoice.purchase_order.order_number}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Información de Firma Electrónica */}
          {invoice.electronic_signature && (
            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                  Firma Electrónica
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
                    {invoice.electronic_signature}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notas */}
          {invoice.notes && (
            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                  Notas
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {invoice.notes}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
