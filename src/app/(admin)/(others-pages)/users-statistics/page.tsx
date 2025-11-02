'use client'
import React, { useEffect, useState } from 'react';
import ComponentCard from "@/components/common/ComponentCard";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { CalenderIcon } from "@/icons";
import { fetchApi } from '@/app/lib/data';
import Alert from '@/components/ui/alert/Alert';

// Interfaces para el response del endpoint all-stats
interface PassengerSpendingStats {
  passenger_id: number;
  name: string;
  email: string;
  trips: number;
  spent: number;
  kilometers?: number;
}

interface PassengerTripStats {
  passenger_id: number;
  name: string;
  email: string;
  trips: number;
  spent: number;
}

interface MonthlyStats {
  trips: number;
  spending: number;
}

interface PassengerSummary {
  total_trips: number;
  total_spending: number;
  average_per_trip: number;
  total_passengers: number;
  current_month: MonthlyStats;
}

interface PassengerFilters {
  start_date: string;
  end_date: string;
  top_count: number;
}

interface AllStatsResponse {
  summary: PassengerSummary;
  top_by_spending: PassengerSpendingStats[];
  top_by_trips: PassengerTripStats[];
  filters: PassengerFilters;
}

// Interfaces para el endpoint admin_wallet_stats
interface PodiumDriver {
  position: number;
  driver_id: number;
  name: string;
  email: string;
  phone: string;
  total_earnings: number;
  trips_count: number;
  rating?: number;
}

interface PodiumPassenger {
  position: number;
  passenger_id: number;
  name: string;
  email: string;
  phone: string;
  total_spent: number;
  trips_count: number;
}

interface WalletStatsResponse {
  podiums?: {
    top_spenders: PodiumPassenger[];
    top_frequent_passengers: PodiumPassenger[];
    top_earning_drivers: PodiumDriver[];
    top_frequent_drivers: PodiumDriver[];
    top_rated_drivers: PodiumDriver[];
  };
}

export default function PassengerStatsPage() {
  // Estados para datos y filtros
  const [passengerData, setPassengerData] = useState<AllStatsResponse | null>(null);
  const [walletData, setWalletData] = useState<WalletStatsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'passengers' | 'wallet'>('passengers');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para filtros
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [topCount, setTopCount] = useState(10);
  const [includePodium, setIncludePodium] = useState(true);

  // Estado para alertas
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [alertMessage, setAlertMessage] = useState('');

  // Cargar datos del backend
  useEffect(() => {
    // Establecer fecha de hoy como fecha final por defecto
    const today = new Date().toISOString().split('T')[0];
    setEndDate(today);
    
    // Establecer fecha de hace 6 meses como fecha inicial por defecto
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    setStartDate(sixMonthsAgo.toISOString().split('T')[0]);
    
    fetchPassengerStats();
    fetchWalletStats();
  }, []);

  const fetchPassengerStats = async () => {
    try {
      setLoading(true);
      const response = await fetchApi<AllStatsResponse>('/api/users/all-stats');
      
      if (response) {
        setPassengerData(response);
        
        // Actualizar los filtros con los valores que devolvió el API
        if (response.filters) {
          if (response.filters.start_date) {
            setStartDate(response.filters.start_date.split('T')[0]);
          }
          if (response.filters.end_date) {
            setEndDate(response.filters.end_date.split('T')[0]);
          }
          setTopCount(response.filters.top_count);
        }
      }
    } catch (error) {
      console.error('Error al cargar estadísticas de pasajeros:', error);
      setError('Error al cargar los datos de estadísticas de pasajeros');
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletStats = async () => {
    try {
      setLoading(true);
      const response = await fetchApi<WalletStatsResponse>('/api/users/admin_wallet_stats?include_podium=true');
      
      if (response) {
        setWalletData(response);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas de billetera:', error);
      setError('Error al cargar los datos de estadísticas de billetera');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'passengers') {
        // Filtrar datos para la pestaña de estadísticas de pasajeros
        let queryParams = '?';
        
        if (startDate) {
          queryParams += `start_date=${startDate}`;
        }
        
        if (endDate) {
          if (queryParams.length > 1) queryParams += '&';
          queryParams += `end_date=${endDate}`;
        }
        
        if (topCount) {
          if (queryParams.length > 1) queryParams += '&';
          queryParams += `top=${topCount}`;
        }
        
        const response = await fetchApi<AllStatsResponse>(`/api/users/all-stats${queryParams}`);
        
        if (response) {
          setPassengerData(response);
          showSuccessAlert('Datos de pasajeros actualizados correctamente');
        }
      } else {
        // Filtrar datos para la pestaña de billetera
        let queryParams = '?';
        
        if (startDate) {
          queryParams += `start_date=${startDate}`;
        }
        
        if (endDate) {
          if (queryParams.length > 1) queryParams += '&';
          queryParams += `end_date=${endDate}`;
        }
        
        // Parámetro para incluir podio
        if (queryParams.length > 1) queryParams += '&';
        queryParams += `include_podium=${includePodium}`;
        
        const response = await fetchApi<WalletStatsResponse>(`/api/users/admin_wallet_stats${queryParams}`);
        
        if (response) {
          setWalletData(response);
          showSuccessAlert('Datos de billetera actualizados correctamente');
        }
      }
    } catch (error) {
      console.error('Error al filtrar datos:', error);
      setError('Error al cargar los datos de estadísticas');
      showErrorAlert('Error al cargar los datos de estadísticas');
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
    setTopCount(10);
    setIncludePodium(true);
    
    // Esperar un momento para que los valores se actualicen antes de hacer la consulta
    setTimeout(() => {
      handleFilter();
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

  // Mostrar loading
  if (loading && !passengerData && !walletData) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  // Mostrar error
  if (error && !passengerData && !walletData) {
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
        {/* Encabezado y pestañas */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            {activeTab === 'passengers' ? 'Estadísticas de Pasajeros' : 'Estadísticas de Billetera y Podio'}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {activeTab === 'passengers' ? 'Análisis del comportamiento y gasto de los pasajeros' : 'Análisis de rendimiento y ganancias'}
          </p>
        </div>

        {/* Selector de pestañas */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
          <button
            onClick={() => setActiveTab('passengers')}
            className={`py-2 px-4 ${activeTab === 'passengers' 
              ? 'border-b-2 border-brand-500 text-brand-500' 
              : 'text-gray-500 dark:text-gray-400'}`}
          >
            Estadísticas de Pasajeros
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`py-2 px-4 ${activeTab === 'wallet' 
              ? 'border-b-2 border-brand-500 text-brand-500' 
              : 'text-gray-500 dark:text-gray-400'}`}
          >
            Estadísticas de Conductores
          </button>
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

        {activeTab === 'passengers' ? (
          // CONTENIDO DE ESTADÍSTICAS DE PASAJEROS
          <>
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
                <Label>Cantidad Top</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={5}
                    max={50}
                    value={topCount}
                    onChange={(e) => setTopCount(parseInt(e.target.value) || 10)}
                  />
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

            {/* Resumen */}
            {passengerData?.summary && (
              <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-5">
                <div className="p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                  <h3 className="text-sm text-gray-500 dark:text-gray-400">
                    Total Viajes
                  </h3>
                  <p className="text-2xl font-semibold text-blue-500">
                    {passengerData.summary.total_trips.toLocaleString() || 0}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                  <h3 className="text-sm text-gray-500 dark:text-gray-400">
                    Total Pasajeros
                  </h3>
                  <p className="text-2xl font-semibold text-purple-500">
                    {passengerData.summary.total_passengers.toLocaleString() || 0}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                  <h3 className="text-sm text-gray-500 dark:text-gray-400">
                    Total Gastos
                  </h3>
                  <p className="text-2xl font-semibold text-green-500">
                    {formatCurrency(passengerData.summary.total_spending || 0)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                  <h3 className="text-sm text-gray-500 dark:text-gray-400">
                    Promedio por Viaje
                  </h3>
                  <p className="text-2xl font-semibold text-brand-500">
                    {formatCurrency(passengerData.summary.average_per_trip || 0)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                  <h3 className="text-sm text-gray-500 dark:text-gray-400">
                    Mes actual
                  </h3>
                  <p className="text-xl font-semibold text-orange-500">
                    {passengerData.summary.current_month.trips || 0} viajes
                  </p>
                  <p className="text-sm text-orange-400">
                    {formatCurrency(passengerData.summary.current_month.spending || 0)}
                  </p>
                </div>
              </div>
            )}

            {/* Top pasajeros por gasto */}
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
                Top Pasajeros por Gasto
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Pasajero
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Email
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Viajes
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Gasto Total
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Kilómetros
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {passengerData?.top_by_spending && passengerData.top_by_spending.length > 0 ? (
                      passengerData.top_by_spending.map((passenger, index) => (
                        <tr
                          key={`spending-${passenger.passenger_id}-${index}`}
                          className="border-b border-gray-200 dark:border-gray-700"
                        >
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
                                <span className="font-semibold text-xs text-gray-600 dark:text-gray-300">
                                  {index + 1}
                                </span>
                              </div>
                              {passenger.name}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            {passenger.email}
                          </td>
                          <td className="p-4 text-sm text-blue-500">
                            {passenger.trips}
                          </td>
                          <td className="p-4 text-sm text-green-500">
                            {formatCurrency(passenger.spent)}
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            {passenger.kilometers?.toLocaleString(undefined, { 
                              minimumFractionDigits: 1, 
                              maximumFractionDigits: 1 
                            })} km
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          No hay datos suficientes para mostrar los pasajeros
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top pasajeros por cantidad de viajes */}
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
                Top Pasajeros por Cantidad de Viajes
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Pasajero
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Email
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Viajes
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Gasto Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {passengerData?.top_by_trips && passengerData.top_by_trips.length > 0 ? (
                      passengerData.top_by_trips.map((passenger, index) => (
                        <tr
                          key={`trips-${passenger.passenger_id}-${index}`}
                          className="border-b border-gray-200 dark:border-gray-700"
                        >
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
                                <span className="font-semibold text-xs text-gray-600 dark:text-gray-300">
                                  {index + 1}
                                </span>
                              </div>
                              {passenger.name}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            {passenger.email}
                          </td>
                          <td className="p-4 text-sm text-blue-500 font-semibold">
                            {passenger.trips}
                          </td>
                          <td className="p-4 text-sm text-green-500">
                            {formatCurrency(passenger.spent)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          No hay datos suficientes para mostrar los pasajeros
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
                  <span className="font-medium">Fecha inicio:</span> {passengerData?.filters.start_date ? new Date(passengerData.filters.start_date).toLocaleDateString() : 'No definida'}
                </div>
                <div>
                  <span className="font-medium">Fecha fin:</span> {passengerData?.filters.end_date ? new Date(passengerData.filters.end_date).toLocaleDateString() : 'No definida'}
                </div>
                <div>
                  <span className="font-medium">Cantidad top:</span> {passengerData?.filters.top_count || 10} pasajeros
                </div>
              </div>
            </div>
          </>
        ) : (
          // CONTENIDO DE BILLETERA Y PODIO
          <>
            {/* Filtros para billetera */}
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

              <div className="flex items-center">
                <input
                  id="includePodium"
                  type="checkbox"
                  checked={includePodium}
                  onChange={(e) => setIncludePodium(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="includePodium" className="ml-2">
                  Incluir podio
                </Label>
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

            {/* Podio Top Conductores Mejor Calificados */}
            {walletData?.podiums?.top_rated_drivers && walletData.podiums.top_rated_drivers.length > 0 && (
              <div className="mb-8">
                <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
                  Top Conductores Mejor Calificados
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                          Posición
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                          Conductor
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                          Email
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                          Calificación
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                          Viajes
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                          Ganancias
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {walletData.podiums.top_rated_drivers.map((driver) => (
                        <tr
                          key={`rated-${driver.driver_id}`}
                          className="border-b border-gray-200 dark:border-gray-700"
                        >
                          <td className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                            {driver.position}
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            {driver.name}
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            {driver.email}
                          </td>
                          <td className="p-4 text-sm text-yellow-500 font-bold">
                            {driver.rating?.toFixed(1)} ★
                          </td>
                          <td className="p-4 text-sm text-blue-500">
                            {driver.trips_count}
                          </td>
                          <td className="p-4 text-sm text-green-500">
                            {formatCurrency(driver.total_earnings)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Podio Top Conductores por Ganancias */}
            {walletData?.podiums?.top_earning_drivers && walletData.podiums.top_earning_drivers.length > 0 && (
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
                          Conductor
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                          Email
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                          Teléfono
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                          Viajes
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                          Ganancias
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {walletData.podiums.top_earning_drivers.map((driver) => (
                        <tr
                          key={`earning-${driver.driver_id}`}
                          className="border-b border-gray-200 dark:border-gray-700"
                        >
                          <td className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                            {driver.position}
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            {driver.name}
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            {driver.email}
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            {driver.phone}
                          </td>
                          <td className="p-4 text-sm text-blue-500">
                            {driver.trips_count}
                          </td>
                          <td className="p-4 text-sm text-green-500 font-bold">
                            {formatCurrency(driver.total_earnings)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Podio Top Pasajeros que más Gastaron */}
            {walletData?.podiums?.top_spenders && walletData.podiums.top_spenders.length > 0 && (
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
                          Pasajero
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                          Email
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                          Teléfono
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                          Viajes
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                          Gasto Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {walletData.podiums.top_spenders.map((passenger) => (
                        <tr
                          key={`spender-${passenger.passenger_id}`}
                          className="border-b border-gray-200 dark:border-gray-700"
                        >
                          <td className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                            {passenger.position}
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            {passenger.name}
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            {passenger.email}
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            {passenger.phone}
                          </td>
                          <td className="p-4 text-sm text-blue-500">
                            {passenger.trips_count}
                          </td>
                          <td className="p-4 text-sm text-green-500 font-bold">
                            {formatCurrency(passenger.total_spent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(!walletData?.podiums || 
              (!walletData.podiums.top_rated_drivers?.length && 
               !walletData.podiums.top_earning_drivers?.length && 
               !walletData.podiums.top_spenders?.length)) && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
                No hay datos de podio disponibles para el período seleccionado o es necesario activar la opción "Incluir podio".
              </div>
            )}

            {/* Parámetros de consulta aplicados */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtros aplicados
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-medium">Fecha inicio:</span> {startDate ? new Date(startDate).toLocaleDateString() : 'No definida'}
                </div>
                <div>
                  <span className="font-medium">Fecha fin:</span> {endDate ? new Date(endDate).toLocaleDateString() : 'No definida'}
                </div>
                <div>
                  <span className="font-medium">Incluir podio:</span> {includePodium ? 'Sí' : 'No'}
                </div>
              </div>
            </div>
          </>
        )}
      </ComponentCard>
    </div>
  );
}