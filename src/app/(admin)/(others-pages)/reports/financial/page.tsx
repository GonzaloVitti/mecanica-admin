'use client'
import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Badge from '@/components/ui/badge/Badge';
import { fetchApi } from '@/app/lib/data';
import Alert from '@/components/ui/alert/Alert';

// Interfaces para los reportes financieros
interface FinancialMetrics {
  total_sales: number;
  total_revenue: number;
  current_month: {
    sales: number;
    revenue: number;
    orders: number;
    daily_average: number;
    comparison_with_previous: {
      previous_month_sales: number;
      previous_month_revenue: number;
      previous_month_orders: number;
      difference_percentage: number;
      is_increase: boolean;
    };
  };
  today_sales: number;
  today_orders: number;
  time_series: {
    monthly: Array<{
      month: string;
      sales: number;
      revenue: number;
    }>;
    quarterly: Array<{
      quarter: string;
      sales: number;
      revenue: number;
    }>;
    yearly: Array<{
      year: string;
      sales: number;
      revenue: number;
    }>;
  };
  sales_states: Record<string, {
    name: string;
    count: number;
  }>;
}

interface Sale {
  id: string;
  sale_number: string;
  customer: {
    id: string;
    name: string;
    email: string;
    tax_id: string;
  } | null;
  customer_name: string;
  customer_display_name: string;
  branch: {
    id: number;
    name: string;
  };
  branch_name: string;
  status: 'DRAFT' | 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  payment_method: 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK';
  sale_date: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total: string;
  created_at: string;
  updated_at: string;
}

// Respuesta paginada de la API
interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Sale[];
}

// Interfaces para alertas
interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

const FinancialReportsPage = () => {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Cargar métricas del dashboard
  const fetchDashboardMetrics = async () => {
    try {
      const response = await fetchApi<FinancialMetrics>('/api/sales/dashboard_metrics/');
      if (response) {
        setMetrics(response);
      }
    } catch (err) {
      console.error('Error al cargar métricas:', err);
    }
  };

  // Cargar ventas recientes
  const fetchRecentSales = async () => {
    try {
      const response = await fetchApi<ApiResponse>('/api/sales/');
      if (response && response.results) {
        setRecentSales(response.results.slice(0, 10)); // Solo las primeras 10 ventas
      }
    } catch (err) {
      console.error('Error al cargar ventas recientes:', err);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchDashboardMetrics(),
          fetchRecentSales()
        ]);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los reportes financieros. Inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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

  // Funciones auxiliares
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      case 'REFUNDED':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completada';
      case 'PENDING':
        return 'Pendiente';
      case 'CANCELLED':
        return 'Cancelada';
      case 'REFUNDED':
        return 'Reembolsada';
      case 'DRAFT':
        return 'Borrador';
      default:
        return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'Efectivo';
      case 'CARD':
        return 'Tarjeta';
      case 'TRANSFER':
        return 'Transferencia';
      case 'CHECK':
        return 'Cheque';
      default:
        return method;
    }
  };

  // Mostrar loading
  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Mostrar error si lo hay
  if (error) {
    return (
      <div className="p-4">
        <Alert
          variant="error"
          title="Error"
          message={error}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Alertas de estado */}
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
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Reportes Financieros
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Análisis completo de ingresos, ventas y métricas financieras
          </p>
        </div>
      </div>

      {/* Métricas Principales */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Ventas</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics.total_sales}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ingresos Totales</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatCurrency(metrics.total_revenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ventas del Mes</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics.current_month.sales}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Promedio Diario</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics.current_month.daily_average}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparación con Mes Anterior */}
      {metrics && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Comparación con Mes Anterior
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Ventas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.current_month.sales}</p>
              <div className={`flex items-center justify-center mt-2 ${metrics.current_month.comparison_with_previous.is_increase ? 'text-green-600' : 'text-red-600'}`}>
                <svg className={`w-4 h-4 mr-1 ${metrics.current_month.comparison_with_previous.is_increase ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span className="text-sm font-medium">
                  {Math.abs(metrics.current_month.comparison_with_previous.difference_percentage).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(metrics.current_month.revenue)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Ventas de Hoy</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.today_sales}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Ventas Recientes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Ventas Recientes
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Últimas 10 ventas del sistema
          </p>
        </div>

        <div className="overflow-hidden">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1200px]">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Número de Venta
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Cliente
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Sucursal
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Estado
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Método de Pago
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Total
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Fecha
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {recentSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                        No se encontraron ventas recientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {sale.sale_number}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              #{sale.id.slice(0, 8)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {sale.customer?.name || sale.customer_name || 'Cliente no registrado'}
                            </span>
                            {sale.customer?.email && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {sale.customer.email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <span className="text-sm">
                            {sale.branch_name}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <Badge
                            color={getStatusBadgeColor(sale.status)}
                            size="sm"
                          >
                            {getStatusText(sale.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <span className="text-sm">
                            {getPaymentMethodText(sale.payment_method)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(sale.total)}
                            </span>
                            {parseFloat(sale.discount_amount) > 0 && (
                              <span className="text-xs text-green-600 dark:text-green-400">
                                -{formatCurrency(sale.discount_amount)} desc.
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {formatDate(sale.sale_date)}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDate(sale.created_at)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialReportsPage;
