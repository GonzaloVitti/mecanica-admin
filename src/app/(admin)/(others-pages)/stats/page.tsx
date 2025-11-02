'use client'
import React, { useEffect, useState } from 'react';
import ComponentCard from "@/components/common/ComponentCard";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { ChevronDownIcon, DollarLineIcon, BoxIcon, GroupIcon } from "@/icons";
import { fetchApi } from '@/app/lib/data';
import Alert from '@/components/ui/alert/Alert';

// Interfaces para estadísticas de e-commerce
interface ChartData {
  period: string;
  sales: number;
  revenue: number;
  orders: number;
}

interface ProductStats {
  product_id: number;
  name: string;
  sales: number;
  revenue: number;
  stock: number;
}

interface CategoryStats {
  category_id: number;
  name: string;
  sales: number;
  revenue: number;
  products_count: number;
}

interface CustomerStats {
  customer_id: number;
  name: string;
  orders: number;
  total_spent: number;
}

interface EcommerceSummary {
  total_sales: number;
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  today_sales: number;
  today_revenue: number;
  today_orders: number;
  average_order_value: number;
  active_products: number;
  low_stock_products: number;
}

interface EcommerceResponseFilters {
  start_date: string;
  end_date: string;
  category_id: number | null;
  product_id: number | null;
  period: string;
  sort_by: string;
}

interface BranchFilterInfo {
  applied: boolean;
  branch_id: number | null;
  branch_name: string | null;
}

interface EcommerceStatsResponse {
  summary: EcommerceSummary;
  period_chart: {
    period: string;
    data: ChartData[];
  };
  top_products: ProductStats[];
  top_categories: CategoryStats[];
  top_customers: CustomerStats[];
  filters: EcommerceResponseFilters;
  branch_filter: BranchFilterInfo;
}

// Períodos para el filtro
const periodos = [
  { value: "month", label: "Mes" },
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "year", label: "Año" },
];

// Opciones de ordenamiento
const sortOptions = [
  { value: "quantity", label: "Mayor Cantidad Vendida" },
  { value: "revenue", label: "Mayor Valor de Ventas" },
];

interface CategoryOption {
  value: string;
  label: string;
}

interface ProductOption {
  value: string;
  label: string;
}

export default function EcommerceStats() {
  // Estados para datos y filtros
  const [data, setData] = useState<EcommerceStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  // Estados para filtros
    const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [productId, setProductId] = useState("");
  const [period, setPeriod] = useState("month");
  const [sortBy, setSortBy] = useState("quantity");

  // Estados para opciones de filtros
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);

  // Estados para alertas
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];
    
    setStartDate(sixMonthsAgoStr);
    setEndDate(today);
    
    fetchEcommerceStats();
    fetchCategories();
    fetchProducts();
  }, []);
  // Cargar datos del backend
  useEffect(() => {
    // Establecer fecha de hoy como fecha final por defecto
    const today = new Date().toISOString().split('T')[0];
    setEndDate(today);
    
    // Establecer fecha de hace 6 meses como fecha inicial por defecto
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    setStartDate(sixMonthsAgo.toISOString().split('T')[0]);
    
    fetchEcommerceStats();
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchEcommerceStats = async () => {
    try {
      setLoading(true);
      const response = await fetchApi<EcommerceStatsResponse>('/api/sales/ecommerce_stats');
      
      if (response) {
        setData(response);
        
        // Actualizar los filtros con los valores que devolvió el API
        if (response.filters) {
          // Solo actualizar las fechas si el backend devuelve valores válidos
          if (response.filters.start_date && response.filters.start_date !== null) {
            setStartDate(response.filters.start_date.split('T')[0]);
          }
          if (response.filters.end_date && response.filters.end_date !== null) {
            setEndDate(response.filters.end_date.split('T')[0]);
          }
          // Actualizar el período si está disponible
          if (response.filters.period) {
            setPeriod(response.filters.period);
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar estadísticas de e-commerce:', error);
      setError('Error al cargar los datos de estadísticas de e-commerce');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetchApi<{ 
        count: number; 
        next: string | null; 
        previous: string | null; 
        results: { id: string; name: string }[] 
      }>('/api/categories/');
      
      if (response && response.results) {
        const options: CategoryOption[] = [
          { value: "", label: "Todas las categorías" }
        ];
        response.results.forEach(category => {
          options.push({
            value: category.id,
            label: category.name
          });
        });
        setCategoryOptions(options);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetchApi<{ 
        count: number; 
        next: string | null; 
        previous: string | null; 
        results: { id: string; name: string }[] 
      }>('/api/products/');
      
      if (response && response.results) {
        const options: ProductOption[] = [
          { value: "", label: "Todos los productos" }
        ];
        response.results.forEach(product => {
          options.push({
            value: product.id,
            label: product.name
          });
        });
        setProductOptions(options);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const handleFilter = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Solo agregar parámetros si tienen valores válidos
      if (startDate) {
        params.append('start_date', startDate);
      }
      if (endDate) {
        params.append('end_date', endDate);
      }
      if (period) {
        params.append('period', period);
      }
      if (categoryId) {
        params.append('category_id', categoryId);
      }
      if (productId) {
        params.append('product_id', productId);
      }
      if (sortBy) {
        params.append('sort_by', sortBy);
      }


      const response = await fetchApi<EcommerceStatsResponse>(`/api/sales/ecommerce_stats?${params}`);
      
      if (response) {
        setData(response);
        showSuccessAlert('Filtros aplicados correctamente');
      }
    } catch (error) {
      console.error('Error al aplicar filtros:', error);
      showErrorAlert('Error al aplicar los filtros');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    setStartDate(sixMonthsAgo.toISOString().split('T')[0]);
    setEndDate(today);
    setCategoryId("");
    setProductId("");
    setPeriod("month");
    setSortBy("quantity");
    
    fetchEcommerceStats();
    showSuccessAlert('Filtros limpiados correctamente');
  };

  const showSuccessAlert = (message: string) => {
    setAlertType('success');
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const showErrorAlert = (message: string) => {
    setAlertType('error');
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0.00';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="error" title="Error" message={error} />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Cargando estadísticas...</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Estamos preparando tu dashboard de e-commerce.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Estadísticas de E-commerce
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Análisis completo de ventas, productos y clientes
          </p>
          {/* Indicador de filtrado por sucursal */}
          {data?.branch_filter.applied && data.branch_filter.branch_name && (
            <div className="mt-2 flex items-center text-sm text-blue-600 dark:text-blue-400">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>
                <strong>Filtrado por sucursal:</strong> {data.branch_filter.branch_name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Alertas */}
      {showAlert && (
        <Alert variant={alertType} title={alertType === 'success' ? "Éxito" : "Error"} message={alertMessage} />
      )}

      {/* Filtros */}
      <ComponentCard title="Filtros">
        {/* Indicador de filtrado por sucursal */}
        {data?.branch_filter.applied && data.branch_filter.branch_name && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center text-sm text-blue-700 dark:text-blue-300">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>
                <strong>Nota:</strong> Como gerente de sucursal, solo puedes ver estadísticas de tu sucursal asignada: <strong>{data.branch_filter.branch_name}</strong>. 
                El filtro de sucursal se aplica automáticamente.
              </span>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div>
    <Label 
      htmlFor="startDate" 
      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
    >
      Fecha Inicio
    </Label>
    <div className="relative">
    <input
  id="startDate"
  type="date"
  name="startDate"
  value={startDate}
  onChange={(e) => setStartDate(e.target.value)}
  onClick={(e) => e.currentTarget.showPicker?.()}
  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-pointer"
/>
    </div>
  </div>

  <div>
    <Label 
      htmlFor="endDate" 
      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
    >
      Fecha Fin
    </Label>
    <div className="relative">
    <input
  id="endDate"
  type="date"
  name="endDate"
  value={endDate}
  min={startDate}
  onChange={(e) => setEndDate(e.target.value)}
  onClick={(e) => e.currentTarget.showPicker?.()}
  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-pointer"
/>
    </div>
  </div>

          <div>
            <Label htmlFor="category">Categoría</Label>
            <div className="relative">
              <Select
                id="category"
                options={categoryOptions}
                value={categoryId}
                onChange={(value) => setCategoryId(value)}
                className="dark:bg-gray-700"
              />
              <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-white">
                <ChevronDownIcon />
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="product">Producto</Label>
            <div className="relative">
              <Select
                id="product"
                options={productOptions}
                value={productId}
                onChange={(value) => setProductId(value)}
                className="dark:bg-gray-700"
              />
              <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-white">
                <ChevronDownIcon />
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="period">Período</Label>
            <div className="relative">
              <Select
                id="period"
                options={periodos}
                value={period}
                onChange={(value) => setPeriod(value)}
                className="dark:bg-gray-700"
              />
              <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-white">
                <ChevronDownIcon />
              </span>
            </div>
          </div>
          <div>
            <Label htmlFor="sortBy">Ordenar Por</Label>
            <div className="relative">
              <Select
                id="sortBy"
                options={sortOptions}
                value={sortBy}
                onChange={(value) => setSortBy(value)}
                className="dark:bg-gray-700"
              />
              <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-white">
                <ChevronDownIcon />
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleFilter}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="inline animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Aplicando filtros...
              </div>
            ) : (
              'Aplicar Filtros'
            )}
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            disabled={loading}
          >
            Limpiar Filtros
          </button>
        </div>

        {/* Indicador de filtros activos */}
        {(startDate || endDate || categoryId || productId || period !== "month") && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center text-sm text-blue-700 dark:text-blue-300">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Filtros activos:</span>
              <span className="ml-2">
                {startDate && `Desde ${startDate}`}
                {endDate && `${startDate ? ' hasta ' : 'Hasta '}${endDate}`}
                {categoryId && ` • Categoría: ${categoryOptions.find(c => c.value === categoryId)?.label || categoryId}`}
                {productId && ` • Producto: ${productOptions.find(p => p.value === productId)?.label || productId}`}
                {period !== "month" && ` • Período: ${periodos.find(p => p.value === period)?.label || period}`}
              </span>
            </div>
          </div>
        )}
      </ComponentCard>

      {/* Estadísticas de filtrado por sucursal */}
      {data?.branch_filter.applied && data.branch_filter.branch_name && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between text-sm text-green-700 dark:text-green-300">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>
                <strong>Filtrado por sucursal activo:</strong> Solo se muestran estadísticas de la sucursal <strong>{data.branch_filter.branch_name}</strong>
              </span>
            </div>
            <div className="text-xs">
              Total de ventas: {data.summary.total_orders.toLocaleString()} • 
              Ingresos: {formatCurrency(data.summary.total_revenue)}
            </div>
          </div>
        </div>
      )}

      {/* Resumen - Tarjetas de indicadores clave */}
      <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Ingresos Totales
              </p>
              <h3 className="text-2xl font-semibold text-green-600 dark:text-green-400 mt-1">
                {formatCurrency(data?.summary.total_revenue || 0)}
              </h3>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
              <DollarLineIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Hoy: {formatCurrency(data?.summary.today_revenue || 0)}
          </p>
        </div>

        <div className="p-5 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Pedidos Totales
              </p>
              <h3 className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mt-1">
                {data?.summary.total_orders.toLocaleString() || 0}
              </h3>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <BoxIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Hoy: {data?.summary.today_orders || 0}
          </p>
        </div>

        <div className="p-5 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Productos Vendidos
              </p>
              <h3 className="text-2xl font-semibold text-purple-600 dark:text-purple-400 mt-1">
                {data?.summary.total_sales.toLocaleString() || 0}
              </h3>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <BoxIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Hoy: {data?.summary.today_sales || 0}
          </p>
        </div>

        <div className="p-5 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Clientes Totales
              </p>
              <h3 className="text-2xl font-semibold text-orange-600 dark:text-orange-400 mt-1">
                {data?.summary.total_customers.toLocaleString() || 0}
              </h3>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <GroupIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Promedio por pedido: {formatCurrency(data?.summary.average_order_value || 0)}
          </p>
        </div>
      </div>

      {/* Estadísticas de ventas por período */}
      <ComponentCard title="Histórico de Ventas y Pedidos">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {data?.period_chart.data && data.period_chart.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Período
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Productos Vendidos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Pedidos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Ingresos
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.period_chart.data.map((item, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600 dark:text-gray-300">
                        {item.period}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-purple-600 dark:text-purple-400">
                        {item.sales.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-blue-600 dark:text-blue-400">
                        {item.orders.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-green-600 dark:text-green-400">
                        {formatCurrency(item.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Sin datos de productos</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No hay datos de ventas por producto disponibles con los filtros actuales.
              </p>
            </div>
          )}
        </div>
      </ComponentCard>

      {/* Estadísticas por Categoría */}
      <ComponentCard title="Estadísticas por Categoría">
        {/* Indicador de filtrado por sucursal */}
        {data?.branch_filter.applied && data.branch_filter.branch_name && (
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center text-xs text-blue-700 dark:text-blue-300">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              <span>Filtrado automáticamente por sucursal: {data.branch_filter.branch_name}</span>
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {data?.top_categories && data.top_categories.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Productos Vendidos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Ingresos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Productos
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.top_categories.map((category) => (
                    <tr
                      key={category.category_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600 dark:text-gray-300">
                        {category.name}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-purple-600 dark:text-purple-400">
                        {category.sales.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-green-600 dark:text-green-400">
                        {formatCurrency(category.revenue)}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-blue-600 dark:text-blue-400">
                        {category.products_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <p>No hay datos de categorías disponibles</p>
            </div>
          )}
        </div>
      </ComponentCard>

      {/* Productos Más Vendidos */}
      <ComponentCard title="Productos Más Vendidos">
        {/* Indicador de filtrado por sucursal */}
        {data?.branch_filter.applied && data.branch_filter.branch_name && (
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center text-xs text-blue-700 dark:text-blue-300">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              <span>Filtrado automáticamente por sucursal: {data.branch_filter.branch_name}</span>
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {data?.top_products && data.top_products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Ventas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Ingresos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Stock
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.top_products.map((product) => (
                    <tr
                      key={product.product_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600 dark:text-gray-300">
                        {product.name}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-purple-600 dark:text-purple-400">
                        {product.sales.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-green-600 dark:text-green-400">
                        {formatCurrency(product.revenue)}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          product.stock > 10 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : product.stock > 0
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {product.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <p>No hay datos de productos disponibles</p>
            </div>
          )}
        </div>
      </ComponentCard>

      {/* Clientes Principales */}
      <ComponentCard title="Clientes Principales">
        {/* Indicador de filtrado por sucursal */}
        {data?.branch_filter.applied && data.branch_filter.branch_name && (
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center text-xs text-blue-700 dark:text-blue-300">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              <span>Filtrado automáticamente por sucursal: {data.branch_filter.branch_name}</span>
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {data?.top_customers && data.top_customers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Pedidos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Total Gastado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.top_customers.map((customer) => (
                    <tr
                      key={customer.customer_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600 dark:text-gray-300">
                        {customer.name}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-blue-600 dark:text-blue-400">
                        {customer.orders.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-green-600 dark:text-green-400">
                        {formatCurrency(customer.total_spent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Sin datos de clientes</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No hay datos de clientes principales disponibles con los filtros actuales.
              </p>
            </div>
          )}
        </div>
      </ComponentCard>
    </div>
  );
}