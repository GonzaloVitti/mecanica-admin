import { prepareForLoginRedirect } from './auth';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface FetchOptions {
  method?: HttpMethod;
  body?: object;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

export const fetchApi = async <T>(endpoint: string, options: FetchOptions = {}): Promise<T | null> => {
  try {
    const jwt_token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    const defaultHeaders: Record<string, string> = {
      "Authorization": `Bearer ${jwt_token}`,
    };

    // Solo añadir Content-Type si no es FormData
    if (!options.isFormData) {
      defaultHeaders["Content-Type"] = "application/json";
    }

    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    };

    // Manejar FormData y JSON de manera diferente
    if (options.body) {
      if (options.isFormData) {
        fetchOptions.body = options.body as unknown as FormData;
      } else {
        fetchOptions.body = JSON.stringify(options.body);
      }
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);

    // Manejar errores 401 directamente (problema de autenticación)
    if (response.status === 401) {
      // Silencioso, sin log en consola
      prepareForLoginRedirect();
      return null;
    }
    
    if (!response.ok) {
      // Si no es OK, lanzamos el error con la respuesta para que pueda ser manejado
      const errorData = await response.json().catch(() => ({}));
      const error = new Error('API Error');
      (error as any).response = { status: response.status, data: errorData };
      throw error;
    }

    // Si es DELETE y la respuesta es exitosa, retornamos null
    if (options.method === 'DELETE' && response.status === 204) {
      return null;
    }

    // Para otros métodos o si hay contenido, intentamos parsear el JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return data as T;
    }

    return null;

  } catch (error) {
    // Manejo especial para errores 401
    if (error instanceof Error && error.message.includes('401')) {
      prepareForLoginRedirect();
      return null;
    }
    
    // Propagamos el resto de errores para que puedan ser manejados por el componente
    console.error('Error en fetchApi:', error);
    throw error;
  }
};