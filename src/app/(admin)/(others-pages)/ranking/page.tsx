"use client";
import React, { useEffect, useState } from 'react';
import ComponentCard from "@/components/common/ComponentCard";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { CalenderIcon, ChevronDownIcon } from "@/icons";
import { fetchApi } from '@/app/lib/data';
import Alert from '@/components/ui/alert/Alert';

// Interfaces para el response del endpoint admin_wallet_stats
interface PodiumEntry {
  position: number;
  driver_id?: number;
  passenger_id?: number;
  name: string;
  email: string;
  phone: string;
  trips_count: number;
  total_earnings?: number;
  total_spent?: number;
  rating?: number;
}

interface Podiums {
  top_spenders: PodiumEntry[];
  top_frequent_passengers: PodiumEntry[];
  top_earning_drivers: PodiumEntry[];
  top_frequent_drivers: PodiumEntry[];
  top_rated_drivers: PodiumEntry[];
}

interface WalletResponseFilters {
  start_date: string;
  end_date: string;
  driver_id: number | null;
  passenger_id: number | null;
  mode_id: number | null;
  period: string;
}

interface WalletStatsResponse {
  podiums: Podiums;
  filters: WalletResponseFilters;
}

// Períodos para el filtro
const periodos = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "year", label: "Año" },
  { value: "all", label: "Todo" },
];

const RankingPage = () => {
  // Estados
  const [data, setData] = useState<WalletStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para filtros
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [period, setPeriod] = useState("month");

  // Estado para alertas
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [alertMessage, setAlertMessage] = useState('');

  // Función para obtener los datos de ranking
  const fetchRankingData = async () => {
    try {
      setLoading(true);
      
      // Construir la URL con los parámetros de filtro - CORREGIDA para usar /api/users/ en lugar de /api/drivers/
      let queryParams = '?include_podium=true';
      
      if (startDate) {
        queryParams += `&start_date=${startDate}`;
      }
      
      if (endDate) {
        queryParams += `&end_date=${endDate}`;
      }
      
      queryParams += `&period=${period}`;
      
      const response = await fetchApi<WalletStatsResponse>(`/api/users/admin_wallet_stats${queryParams}`);
      
      if (response) {
        setData(response);
        showSuccessAlert('Datos de ranking actualizados correctamente');
      }
    } catch (error) {
      console.error('Error al cargar datos del ranking:', error);
      setError('Error al cargar los datos del ranking');
      showErrorAlert('Error al cargar los datos del ranking');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al inicio
  useEffect(() => {
    // Establecer fecha de hoy como fecha final por defecto
    const today = new Date().toISOString().split('T')[0];
    setEndDate(today);
    
    // Establecer fecha de hace 30 días como fecha inicial por defecto
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    
    fetchRankingData();
  }, []);

  const handleFilter = () => {
    fetchRankingData();
  };

  const handleClearFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(today);
    setPeriod("month");
    
    // Esperar un momento para que los valores se actualicen antes de hacer la consulta
    setTimeout(() => {
      fetchRankingData();
    }, 100);
  };

  // Funciones para mostrar alertas
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

  // Ocultar alerta después de 5 segundos
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  // Formatear valores de moneda
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'ARS',
      currencyDisplay: 'symbol'
    }).format(amount);
  };

  // Renderizar iconos de medalla para los tres primeros
  const renderMedal = (position: number) => {
    if (position === 0) {
      return <span className="inline-flex items-center justify-center text-yellow-500 text-xl">🥇</span>;
    } else if (position === 1) {
      return <span className="inline-flex items-center justify-center text-gray-400 text-xl">🥈</span>;
    } else if (position === 2) {
      return <span className="inline-flex items-center justify-center text-amber-700 text-xl">🥉</span>;
    }
    return <span className="inline-flex items-center justify-center text-gray-500">{position + 1}</span>;
  };

  // Mostrar loading
  if (loading && !data) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Mostrar error
  if (error && !data) {
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
    <div className="space-y-6 p-6">
      <ComponentCard>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Ranking de Usuarios
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Clasificación de conductores y pasajeros destacados
          </p>
        </div>

        {showAlert && (
          <div className="mb-6">
            <Alert
              variant={alertType}
              title={alertType === 'success' ? "Éxito" : "Error"}
              message={alertMessage}
            />
          </div>
        )}

        {/* Filtros */}
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
          <div>
            <Label>Fecha Inicio</Label>
            <div className="relative">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                <CalenderIcon />
              </span>
            </div>
          </div>

          <div>
            <Label>Período</Label>
            <div className="relative">
              <Select
                options={periodos}
                value={period}
                onChange={(value) => setPeriod(value)}
                className="dark:bg-dark-900"
              />
              <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                <ChevronDownIcon />
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            Filtrar
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>

        {/* Conductores con Mejores Ganancias */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Top Conductores por Ganancias
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Posición
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    ID
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Conductor
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Total Viajes
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Ganancias
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.podiums?.top_earning_drivers?.length ? (
                  data.podiums.top_earning_drivers.map((driver, index) => (
                    <tr
                      key={driver.driver_id || index}
                      className={`border-b border-gray-200 dark:border-gray-700 ${
                        index < 3 ? "bg-gray-50 dark:bg-gray-800/50" : ""
                      }`}
                    >
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        {renderMedal(index)}
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        #{driver.driver_id}
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {driver.name}
                      </td>
                      <td className="p-4 text-sm text-blue-500">
                        {driver.trips_count}
                      </td>
                      <td className="p-4 text-sm text-green-500 font-medium">
                        {formatCurrency(driver.total_earnings)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No hay datos suficientes para mostrar el ranking
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Conductores con Más Viajes */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Top Conductores por Cantidad de Viajes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Posición
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    ID
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Conductor
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Total Viajes
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Ganancias
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.podiums?.top_frequent_drivers?.length ? (
                  data.podiums.top_frequent_drivers.map((driver, index) => (
                    <tr
                      key={driver.driver_id || index}
                      className={`border-b border-gray-200 dark:border-gray-700 ${
                        index < 3 ? "bg-gray-50 dark:bg-gray-800/50" : ""
                      }`}
                    >
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        {renderMedal(index)}
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        #{driver.driver_id}
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {driver.name}
                      </td>
                      <td className="p-4 text-sm text-blue-500 font-medium">
                        {driver.trips_count}
                      </td>
                      <td className="p-4 text-sm text-green-500">
                        {formatCurrency(driver.total_earnings)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No hay datos suficientes para mostrar el ranking
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Conductores Mejor Valorados */}
        {/* <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Top Conductores por Calificación
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Posición
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    ID
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Conductor
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Calificación Promedio
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Total de Calificaciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.podiums?.top_rated_drivers?.length ? (
                  data.podiums.top_rated_drivers.map((driver, index) => (
                    <tr
                      key={driver.driver_id || index}
                      className={`border-b border-gray-200 dark:border-gray-700 ${
                        index < 3 ? "bg-gray-50 dark:bg-gray-800/50" : ""
                      }`}
                    >
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        {renderMedal(index)}
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        #{driver.driver_id}
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {driver.name}
                      </td>
                      <td className="p-4 text-sm text-yellow-500 font-medium">
                        {(driver.rating || 0).toFixed(1)} ⭐
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        {driver.trips_count}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No hay datos suficientes para mostrar el ranking
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div> */}

        {/* Pasajeros que Más Gastan */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Top Pasajeros por Gasto
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Posición
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    ID
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Pasajero
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Total Viajes
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Total Gastado
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.podiums?.top_spenders?.length ? (
                  data.podiums.top_spenders.map((passenger, index) => (
                    <tr
                      key={passenger.passenger_id || index}
                      className={`border-b border-gray-200 dark:border-gray-700 ${
                        index < 3 ? "bg-gray-50 dark:bg-gray-800/50" : ""
                      }`}
                    >
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        {renderMedal(index)}
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        #{passenger.passenger_id}
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {passenger.name}
                      </td>
                      <td className="p-4 text-sm text-blue-500">
                        {passenger.trips_count}
                      </td>
                      <td className="p-4 text-sm text-green-500 font-medium">
                        {formatCurrency(passenger.total_spent)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No hay datos suficientes para mostrar el ranking
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pasajeros con Más Viajes */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Top Pasajeros por Cantidad de Viajes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Posición
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    ID
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Pasajero
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Total Viajes
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Total Gastado
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.podiums?.top_frequent_passengers?.length ? (
                  data.podiums.top_frequent_passengers.map((passenger, index) => (
                    <tr
                      key={passenger.passenger_id || index}
                      className={`border-b border-gray-200 dark:border-gray-700 ${
                        index < 3 ? "bg-gray-50 dark:bg-gray-800/50" : ""
                      }`}
                    >
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        {renderMedal(index)}
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        #{passenger.passenger_id}
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {passenger.name}
                      </td>
                      <td className="p-4 text-sm text-blue-500 font-medium">
                        {passenger.trips_count}
                      </td>
                      <td className="p-4 text-sm text-green-500">
                        {formatCurrency(passenger.total_spent)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No hay datos suficientes para mostrar el ranking
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Parámetros de consulta aplicados */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filtros aplicados
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium">Período:</span> {data?.filters.period === 'day' ? 'Día' : 
                data?.filters.period === 'week' ? 'Semana' : 
                data?.filters.period === 'month' ? 'Mes' : 
                data?.filters.period === 'year' ? 'Año' : 'Todo'}
            </div>
            <div>
              <span className="font-medium">Fecha inicio:</span> {data?.filters.start_date ? new Date(data.filters.start_date).toLocaleDateString() : 'No definida'}
            </div>
            <div>
              <span className="font-medium">Fecha fin:</span> {data?.filters.end_date ? new Date(data.filters.end_date).toLocaleDateString() : 'No definida'}
            </div>
          </div>
        </div>
      </ComponentCard>
    </div>
  );
};

export default RankingPage;