'use client'
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ComponentCard from "@/components/common/ComponentCard";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { CalenderIcon, PlusIcon } from "@/icons";
import { fetchApi } from '@/app/lib/data';
import Alert from '@/components/ui/alert/Alert';

// Interfaces para los tipos de balances
interface Driver {
  id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  }
}

interface Balance {
  id: string;
  code: string;
  balance_type: 'DRIVER_PAYMENT';
  balance_type_display: string;
  driver_info?: Driver | null;
  period_start: string;
  period_end: string;
  total_trips: number;
  total_amount: number;
  commission_percentage: number;
  commission_amount: number;
  additional_discounts: number;
  bonuses: number;
  net_amount: number;
  status: 'DRAFT' | 'GENERATED' | 'APPROVED' | 'PAID' | 'CANCELLED';
  status_display: string;
  created_at: string;
  updated_at: string;
  can_approve: boolean;
  can_mark_as_paid: boolean;
  entity_name: string;
}

interface BalanceListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Balance[];
}

interface FilterOption {
  value: string;
  label: string;
}

const statusOptions: FilterOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'GENERATED', label: 'Generado' },
  { value: 'APPROVED', label: 'Aprobado' },
  { value: 'PAID', label: 'Pagado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

// Componente principal - Solo para pagos a conductores
export default function DriverPaymentsSystem() {
  const router = useRouter();

  // Estados para datos
  const [balances, setBalances] = useState<Balance[]>([]);

  // Estados para paginación
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Estados para filtros
  const [status, setStatus] = useState('');
  const [driverId, setDriverId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [search, setSearch] = useState('');

  // Estados UI
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [alertMessage, setAlertMessage] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    fetchBalances();
  }, []);

  // Efecto para gestión de alertas
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  // Función para obtener balances
  const fetchBalances = async (pageNum = 1) => {
    setLoading(true);
    try {
      let queryParams = `?page=${pageNum}&limit=${pageSize}&balance_type=DRIVER_PAYMENT`;

      if (status) queryParams += `&status=${status}`;
      if (driverId) queryParams += `&driver=${driverId}`;
      if (periodStart) queryParams += `&period_start=${periodStart}`;
      if (periodEnd) queryParams += `&period_end=${periodEnd}`;
      if (search) queryParams += `&search=${search}`;

      const response = await fetchApi<BalanceListResponse>(`/api/balances/${queryParams}`);

      if (response) {
        setBalances(response.results);
        setCount(response.count);
        setPage(pageNum);
      }
    } catch (error) {
      showErrorAlert('Error al cargar los pagos de conductores');
    } finally {
      setLoading(false);
    }
  };

  // Navegar al detalle del balance
  const goToBalanceDetail = (balanceId: string) => {
    router.push(`/operating-balance/${balanceId}`);
  };

  // Navegar a la pantalla de creación
  const goToCreateBalance = () => {
    router.push('/operating-balance/add');
  };

  // Helpers para el manejo de alertas
  const showSuccessAlert = (message: string) => {
    setAlertType('success');
    setAlertMessage(message);
    setShowAlert(true);
  };

  const showErrorAlert = (message: string) => {
    setAlertType('error');
    setAlertMessage(message);
    setShowAlert(true);
  };

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  // Format date helper
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';

    // Solo mostrar la fecha, sin la hora
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get balance status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'GENERATED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'APPROVED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'PAID': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <ComponentCard>
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Sistema de Pagos a Conductores
            </h2>
            <button
              onClick={goToCreateBalance}
              className="mt-2 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Crear Pago
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gestión de pagos a conductores y control de comisiones
          </p>
        </div>

        {showAlert && (
          <div className="mb-6">
            <Alert
              variant={alertType}
              title={alertType === 'success' ? 'Éxito' : 'Error'}
              message={alertMessage}
            />
          </div>
        )}

        {/* Filtros */}
        <div className="mb-6 p-4 border border-gray-200 rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Filtrar pagos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Estado</Label>
              <Select
                options={statusOptions}
                value={status}
                onChange={(value) => setStatus(value)}
              />
            </div>
            <div>
              <Label>Fecha Inicio</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
                <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                  <CalenderIcon />
                </span>
              </div>
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
                <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                  <CalenderIcon />
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                setStatus('');
                setDriverId('');
                setPeriodStart('');
                setPeriodEnd('');
                setSearch('');
                fetchBalances();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md dark:border-gray-600 text-gray-700 dark:text-gray-300 mr-2 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Limpiar
            </button>
            <button
              onClick={() => fetchBalances()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>

        {/* Tabla de balances de conductores */}
        <div className="overflow-x-auto border border-gray-200 rounded-xl dark:border-gray-700 bg-white dark:bg-gray-800/40">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Código
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Conductor
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Período
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Viajes
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Monto Neto
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {balances.length > 0 ? (
                balances.map((balance) => (
                  <tr key={balance.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/70">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {balance.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {balance.entity_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(balance.period_start)}
                      <br />
                      {formatDate(balance.period_end)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {balance.total_trips}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(balance.status)}`}>
                        {balance.status_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 font-medium">
                      {formatCurrency(balance.net_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => goToBalanceDetail(balance.id)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                ))
              ) : loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Cargando pagos...</p>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No se encontraron pagos de conductores con los filtros seleccionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {count > 0 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando <span className="font-medium">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, count)}</span> de <span className="font-medium">{count}</span> resultados
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => fetchBalances(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
              >
                Anterior
              </button>
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-md">
                {page}
              </span>
              <button
                onClick={() => fetchBalances(page + 1)}
                disabled={page * pageSize >= count}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </ComponentCard>
    </div>
  );
}