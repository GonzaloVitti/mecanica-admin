import { fetchApi } from './data';

// Interfaces para la respuesta de la API del dólar
interface DolarResponse {
  success: boolean;
  data: {
    moneda: string;
    casa: string;
    nombre: string;
    compra: number;
    venta: number;
    fechaActualizacion: string;
  };
  message: string;
}

export interface ExchangeRate {
  buy: number;
  sell: number;
  lastUpdate: string;
}

// Cache para evitar consultas repetidas
let dollarCache: {
  blue: ExchangeRate | null;
  oficial: ExchangeRate | null;
  lastFetch: number;
} = {
  blue: null,
  oficial: null,
  lastFetch: 0
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

/**
 * Obtiene la cotización del dólar blue desde la API
 */
export const getDollarBlueRate = async (): Promise<ExchangeRate | null> => {
  try {
    console.log('🔍 CURRENCY DEBUG - Iniciando getDollarBlueRate...');
    
    // Verificar cache
    const now = Date.now();
    if (dollarCache.blue && (now - dollarCache.lastFetch) < CACHE_DURATION) {
      console.log('🔍 CURRENCY DEBUG - Usando cache:', dollarCache.blue);
      return dollarCache.blue;
    }

    console.log('🔍 CURRENCY DEBUG - Haciendo petición a /api/dolar/blue/');
    const response = await fetchApi<DolarResponse>('/api/dolar/blue/');
    console.log('🔍 CURRENCY DEBUG - Respuesta completa:', response);
    
    if (response?.success && response.data) {
      console.log('🔍 CURRENCY DEBUG - Datos de la API:', response.data);
      const exchangeRate: ExchangeRate = {
        buy: response.data.compra,
        sell: response.data.venta,
        lastUpdate: response.data.fechaActualizacion
      };
      console.log('🔍 CURRENCY DEBUG - ExchangeRate creado:', exchangeRate);
      
      // Actualizar cache
      dollarCache.blue = exchangeRate;
      dollarCache.lastFetch = now;
      
      return exchangeRate;
    }
    
    console.log('🔍 CURRENCY DEBUG - Respuesta inválida o sin datos');
    return null;
  } catch (error) {
    console.error('🔍 CURRENCY DEBUG - Error fetching dollar blue rate:', error);
    return null;
  }
};

/**
 * Obtiene la cotización del dólar oficial desde la API
 */
export const getDollarOficialRate = async (): Promise<ExchangeRate | null> => {
  try {
    // Verificar cache
    const now = Date.now();
    if (dollarCache.oficial && (now - dollarCache.lastFetch) < CACHE_DURATION) {
      return dollarCache.oficial;
    }

    const response = await fetchApi<DolarResponse>('/api/dolar/oficial/');
    
    if (response?.success && response.data) {
      const exchangeRate: ExchangeRate = {
        buy: response.data.compra,
        sell: response.data.venta,
        lastUpdate: response.data.fechaActualizacion
      };
      
      // Actualizar cache
      dollarCache.oficial = exchangeRate;
      dollarCache.lastFetch = now;
      
      return exchangeRate;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching dollar oficial rate:', error);
    return null;
  }
};

/**
 * Convierte un precio de USD a ARS usando el dólar blue
 * @param usdPrice Precio en dólares
 * @param exchangeRate Tipo de cambio (opcional, si no se proporciona se consulta la API)
 * @returns Precio convertido a pesos argentinos con redondeo
 */
export const convertUsdToArs = async (
  usdPrice: number, 
  exchangeRate?: number
): Promise<{ arsPrice: number; exchangeRate: number } | null> => {
  try {
    let rate = exchangeRate;
    
    // Si no se proporciona el tipo de cambio, consultarlo
    if (!rate) {
      const dollarRate = await getDollarBlueRate();
      if (!dollarRate) {
        return null;
      }
      rate = dollarRate.sell; // Usar precio de venta
    }
    
    // Convertir USD a ARS
    const arsPrice = usdPrice * rate;
    
    // Aplicar redondeo argentino
    const roundedPrice = roundToArgentinePeso(arsPrice);
    
    return {
      arsPrice: roundedPrice,
      exchangeRate: rate
    };
  } catch (error) {
    console.error('Error converting USD to ARS:', error);
    return null;
  }
};

/**
 * Redondea un monto a centenas o miles según las prácticas argentinas
 * @param amount Monto a redondear
 * @returns Monto redondeado
 */
export const roundToArgentinePeso = (amount: number): number => {
  // Para montos mayores a $10,000 ARS, redondear a miles
  if (amount >= 10000) {
    return Math.round(amount / 1000) * 1000;
  }
  // Para montos mayores a $1,000 ARS, redondear a centenas
  else if (amount >= 1000) {
    return Math.round(amount / 100) * 100;
  }
  // Para montos menores, redondear a decenas
  else {
    return Math.round(amount / 10) * 10;
  }
};

/**
 * Formatea un precio en pesos argentinos
 * @param amount Monto a formatear
 * @returns String formateado con símbolo de peso
 */
export const formatArsPrice = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Formatea un precio en dólares
 * @param amount Monto a formatear
 * @returns String formateado con símbolo de dólar
 */
export const formatUsdPrice = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Limpia el cache de cotizaciones (útil para forzar una nueva consulta)
 */
export const clearDollarCache = (): void => {
  dollarCache = {
    blue: null,
    oficial: null,
    lastFetch: 0
  };
};