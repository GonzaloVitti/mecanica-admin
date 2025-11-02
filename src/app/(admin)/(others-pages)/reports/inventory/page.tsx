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

// Interfaces para los reportes de inventario
interface InventoryMetrics {
  total_products: number;
  active_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  on_promotion_products: number;
  products_with_barcode: number;
  average_profit_margin: number;
  products_by_category: Record<string, {
    name: string;
    count: number;
  }>;
  top_selling_products: Array<{
    product__name: string;
    total_sold: number;
    total_revenue: number;
  }>;
}

interface StockMovementMetrics {
  movements_today: number;
  movements_this_month: number;
  movements_by_type: Record<string, {
    name: string;
    count: number;
  }>;
  recent_movements: Array<{
    id: string;
    movement_type: string;
    product: {
      id: string;
      name: string;
    };
    branch: {
      id: string;
      name: string;
    };
    quantity: number;
    unit_price: string;
    total_amount: string;
    created_at: string;
    notes: string;
  }>;
}

interface LowStockProduct {
  id: string;
  product: string;
  product_name: string;
  branch: number;
  branch_name: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  minimum_stock: number;
  reorder_point: number;
  maximum_stock: number;
  stock_requested: number;
  is_stock_request_pending: boolean;
  last_stock_request_date: string | null;
  stock_in_transit: number;
  expected_arrival_date: string | null;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  needs_restock: boolean;
  last_updated: string;
  created_at: string;
}

// Respuesta paginada de la API
interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LowStockProduct[];
}

// Interfaces para alertas
interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

const InventoryReportsPage = () => {
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [stockMovementMetrics, setStockMovementMetrics] = useState<StockMovementMetrics | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });
  
  // Estado para el filtro de stock
  const [selectedStockFilter, setSelectedStockFilter] = useState<string>('all');
  const [filteredLowStockProducts, setFilteredLowStockProducts] = useState<LowStockProduct[]>([]);

  // Función para manejar cambios en el filtro de stock
  const handleStockFilterChange = (value: string) => {
    setSelectedStockFilter(value);
  };

  // Función para limpiar filtros
  const clearFilters = () => {
    setSelectedStockFilter('all');
  };

  // Cargar métricas del dashboard de productos
  const fetchProductMetrics = async () => {
    try {
      const response = await fetchApi<InventoryMetrics>('/api/products/dashboard_metrics/');
      if (response) {
        setMetrics(response);
      }
    } catch (err) {
      console.error('Error al cargar métricas de productos:', err);
    }
  };

  // Cargar métricas de movimientos de stock
  const fetchStockMovementMetrics = async () => {
    try {
      const response = await fetchApi<StockMovementMetrics>('/api/stock-movements/dashboard_metrics/');
      if (response) {
        setStockMovementMetrics(response);
      }
    } catch (err) {
      console.error('Error al cargar métricas de movimientos:', err);
    }
  };

  // Cargar productos con stock bajo
  const fetchLowStockProducts = async () => {
    try {
      // Usar el endpoint específico para productos con stock bajo
      const response = await fetchApi<LowStockProduct[]>('/api/inventory/low_stock/');
      if (response) {
        setLowStockProducts(response.slice(0, 10)); // Solo los primeros 10
      }
    } catch (err) {
      console.error('Error al cargar productos con stock bajo:', err);
    }
  };

  // Función para aplicar filtros de stock
  const applyStockFilter = (products: LowStockProduct[]) => {
    if (selectedStockFilter === 'all') {
      return products;
    }

    return products.filter(product => {
      switch (selectedStockFilter) {
        case 'out_of_stock':
          return product.is_out_of_stock || product.current_stock === 0;
        case 'low_stock':
          return product.is_low_stock && !product.is_out_of_stock;
        case 'normal_stock':
          return !product.is_low_stock && !product.is_out_of_stock && 
                 product.current_stock > product.reorder_point;
        case 'high_stock':
          return product.current_stock > (product.maximum_stock * 0.8);
        default:
          return true;
      }
    });
  };

  // useEffect para aplicar filtros cuando cambian los productos o el filtro
  useEffect(() => {
    const filtered = applyStockFilter(lowStockProducts);
    setFilteredLowStockProducts(filtered);
  }, [lowStockProducts, selectedStockFilter]);

  // Cargar datos al montar el componente
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchProductMetrics(),
          fetchStockMovementMetrics(),
          fetchLowStockProducts()
        ]);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los reportes de inventario. Inténtalo de nuevo.');
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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            Reportes de Inventario
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Análisis completo de inventario y métricas de stock
          </p>
        </div>
        
        {/* Filtros */}
        <div className="flex items-center gap-4">
          {/* Filtro de Stock */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filtro de Stock
            </label>
            <select
              value={selectedStockFilter}
              onChange={(e) => handleStockFilterChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los niveles</option>
              <option value="out_of_stock">Sin Stock</option>
              <option value="low_stock">Stock Bajo</option>
              <option value="normal_stock">Stock Normal</option>
              <option value="high_stock">Stock Alto</option>
            </select>
          </div>

          {/* Botón para limpiar filtros */}
          {selectedStockFilter !== 'all' && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Mostrar filtros activos */}
      {selectedStockFilter !== 'all' && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            Stock: {selectedStockFilter === 'out_of_stock' ? 'Sin Stock' : 
                    selectedStockFilter === 'low_stock' ? 'Stock Bajo' :
                    selectedStockFilter === 'normal_stock' ? 'Stock Normal' : 'Stock Alto'}
            <button
              onClick={() => setSelectedStockFilter('all')}
              className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              ×
            </button>
          </span>
        </div>
      )}
      {/* Métricas Principales */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Productos</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics.total_products}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Productos Activos</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics.active_products}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Stock Bajo</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics.low_stock_products}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sin Stock</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics.out_of_stock_products}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Métricas de Movimientos de Stock */}
      {stockMovementMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Movimientos Hoy</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stockMovementMetrics.movements_today}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Movimientos del Mes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stockMovementMetrics.movements_this_month}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Margen Promedio</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.average_profit_margin ? `${metrics.average_profit_margin}%` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Productos con Stock Bajo */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Productos con Stock Bajo
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Productos que requieren atención inmediata
          </p>
        </div>

        <div className="overflow-hidden">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1200px]">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-white/[0.02]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Producto
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Sucursal
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Estado
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Stock Actual
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Punto de Reorden
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Stock en Tránsito
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Última Actualización
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {filteredLowStockProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                        {selectedStockFilter === 'all' 
                          ? "No se encontraron productos con stock bajo"
                          : "No se encontraron productos que coincidan con el filtro seleccionado"
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLowStockProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {product.product_name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {product.product.slice(0, 8)}...
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {product.branch_name}
                            </span>
                            <span className="text-xs text-gray-400">
                              ID: {product.branch}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <div className="flex flex-col gap-1">
                            {product.is_low_stock && (
                              <Badge color="warning" size="sm">
                                Stock Bajo
                              </Badge>
                            )}
                            {product.is_out_of_stock && (
                              <Badge color="error" size="sm">
                                Sin Stock
                              </Badge>
                            )}
                            {product.needs_restock && (
                              <Badge color="info" size="sm">
                                Necesita Reposición
                              </Badge>
                            )}
                            {product.is_stock_request_pending && (
                              <Badge color="default" size="sm">
                                Solicitud Pendiente
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {product.current_stock}
                            </span>
                            <span className="text-xs text-gray-400">
                              Disponible: {product.available_stock}
                            </span>
                            {product.reserved_stock > 0 && (
                              <span className="text-xs text-yellow-600">
                                Reservado: {product.reserved_stock}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {product.reorder_point}
                            </span>
                            <span className="text-xs text-gray-400">
                              Mín: {product.minimum_stock}
                            </span>
                            <span className="text-xs text-gray-400">
                              Máx: {product.maximum_stock}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {product.stock_in_transit}
                            </span>
                            {product.stock_requested > 0 && (
                              <span className="text-xs text-blue-600">
                                Solicitado: {product.stock_requested}
                              </span>
                            )}
                            {product.expected_arrival_date && (
                              <span className="text-xs text-gray-400">
                                Llegada: {formatDate(product.expected_arrival_date)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {formatDate(product.last_updated)}
                            </span>
                            <span className="text-xs text-gray-400">
                              Creado: {formatDate(product.created_at)}
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

export default InventoryReportsPage;
