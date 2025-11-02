"use client";
import React, { useState, useEffect } from "react";
import { fetchApi } from '@/app/lib/data';

interface ApiResponse {
  success: boolean;
  data: ExchangeRate;
  message: string;
}

interface ExchangeRate {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

interface DollarRates {
  oficial: ExchangeRate | null;
  blue: ExchangeRate | null;
}

const DollarExchangeRate: React.FC = () => {
  const [rates, setRates] = useState<DollarRates>({ oficial: null, blue: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchExchangeRates = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both official and blue rates
      const [oficialResponse, blueResponse] = await Promise.all([
        fetchApi<ApiResponse>('/api/dolar/oficial/'),
        fetchApi<ApiResponse>('/api/dolar/blue/')
      ]);

      console.log('Oficial Response:', oficialResponse);
      console.log('Blue Response:', blueResponse);

      if (!oficialResponse?.success || !blueResponse?.success || !oficialResponse?.data || !blueResponse?.data) {
        throw new Error('Error al obtener las cotizaciones');
      }

      setRates({
        oficial: oficialResponse.data,
        blue: blueResponse.data
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRates();
    
    // Refresh rates every 5 minutes
    const interval = setInterval(fetchExchangeRates, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        <span>Cargando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 dark:text-red-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span>Error USD</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 transition-colors rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
        <div className="flex flex-col items-start">
          <span className="text-xs text-gray-500 dark:text-gray-400">USD</span>
          <div className="flex gap-3">
            {rates.oficial && (
              <span className="text-xs">
                Oficial: {formatCurrency(rates.oficial.venta)}
              </span>
            )}
            {rates.blue && (
              <span className="text-xs">
                Blue: {formatCurrency(rates.blue.venta)}
              </span>
            )}
          </div>
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="absolute right-0 z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg w-80 dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Cotización del Dólar
              </h3>
              <button
                onClick={fetchExchangeRates}
                className="p-1 text-gray-500 transition-colors rounded hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Actualizar cotizaciones"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {rates.oficial && (
                <div className="p-3 bg-gray-50 rounded-lg dark:bg-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Dólar Oficial
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(rates.oficial.fechaActualizacion)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-300">Compra:</span>
                      <div className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(rates.oficial.compra)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-300">Venta:</span>
                      <div className="font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(rates.oficial.venta)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {rates.blue && (
                <div className="p-3 bg-gray-50 rounded-lg dark:bg-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Dólar Blue
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(rates.blue.fechaActualizacion)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-300">Compra:</span>
                      <div className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(rates.blue.compra)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-300">Venta:</span>
                      <div className="font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(rates.blue.venta)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Datos proporcionados por DolarApi.com
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DollarExchangeRate;