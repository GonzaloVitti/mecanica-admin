import Cookies from "js-cookie";
import { useStore } from "@/store/useStore";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  exp: number;
  user_id: number;
  jti: string;
  token_type: string;
}

interface LoginPayload {
  username: string;
  password: string;
  device_id: string;
  device_type: string;
  email: string;
}

interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    email: string;
    role: string;
    is_verified: boolean;
  };
  session: {
    device_id: string;
    device_type: string;
  };
}

interface LoginError {
  error: string;
  message: string;
}

// Duración de las cookies con sesión mantenida (30 días)
const EXTENDED_COOKIE_DURATION = 30;

/**
 * Inicia sesión en el sistema
 * @param username Email o nombre de usuario
 * @param password Contraseña del usuario
 * @param keepSession Si debe mantener la sesión activa por largo tiempo
 * @returns Datos del login o null si falla
 */
export const login = async (username: string, password: string, keepSession = false): Promise<LoginResponse | LoginError | null> => {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pontsolutionsdev.cloud';
    // Crear payload con todos los campos requeridos
    const payload: LoginPayload = {
      username,
      password,
      device_id: username + "-web-browser",
      device_type: 'WEB',
      email: username,
    };

    const response = await fetch(
      `${API_URL}/api/auth/login/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (response.ok) {
      const data = await response.json() as LoginResponse;
      
      // Verificar si el usuario tiene permisos para acceder al panel de administración
      const allowedRoles = ['ADMINISTRATOR', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'FINANCE', 'INVENTORY_MANAGER', 'CASHIER', 'SALESMAN'];
      if (!allowedRoles.includes(data.user.role)) {
        // El usuario no tiene los permisos necesarios
        console.log("Acceso denegado: se requiere uno de los roles permitidos:", allowedRoles);
        return { error: "access_denied", message: "No tienes permisos para acceder al panel de administración" };
      }
      
      // Continuar con el proceso normal de login si es admin
      if (keepSession) {
        const options = { expires: EXTENDED_COOKIE_DURATION };
        Cookies.set('token', data.access, options);
        Cookies.set('refresh', data.refresh, options);
        localStorage.setItem('keepSession', 'true');
      } else {
        // Sin expiración extendida, las cookies expiran al cerrar el navegador
        Cookies.set('token', data.access);
        Cookies.set('refresh', data.refresh);
        localStorage.removeItem('keepSession');
      }
      
      // Almacenar en localStorage siempre (como respaldo)
      localStorage.setItem('token', data.access);
      localStorage.setItem('refresh', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Guardar la última hora de login
      localStorage.setItem('lastLoginTime', Date.now().toString());
      localStorage.setItem('lastTokenRefresh', Date.now().toString());
      
      // Guardar en el store
      useStore.getState().setAuth(data.access, data.refresh, data.user);
      
      // Limpiar flag de redirección si existe
      sessionStorage.removeItem('redirectingToLogin');
      
      return data;
    } else {
      //const errorData = await response.json();
      //console.error("Error en el login:", errorData);
      return null;
    }
  } catch { // CORRECCIÓN: Eliminar 'error' no utilizado
    //console.error("Error en la solicitud:", error);
    return null;
  }
};

/**
 * Configura actualizaciones periódicas de actividad del dispositivo
 * @returns Una función para detener las actualizaciones
 */
export const setupActivityUpdater = () => {
  // Actualizar inmediatamente
  updateDeviceActivity();
  
  // Actualizar cada 5 minutos (300000 ms)
  const intervalId = setInterval(async () => {
    await updateDeviceActivity();
  }, 300000); // 5 minutos
  
  return () => clearInterval(intervalId);
};

/**
 * Refresca el token de acceso usando el refresh token
 * @returns Nuevo token de acceso o null si falla
 */
export const refreshToken = async () => {
  // Si ya tenemos una redirección pendiente, no intentamos refrescar
  if (sessionStorage.getItem('redirectingToLogin') === 'true') {
    return null;
  }
  
  try {
    // Obtener tokens
    const refreshToken = Cookies.get('refresh') || localStorage.getItem('refresh');
    const accessToken = Cookies.get('token') || localStorage.getItem('token');
    
    // Verificar silenciosamente sin mostrar errores
    if (!refreshToken || !accessToken) {
      prepareForLoginRedirect();
      return null;
    }
    
    try {
      // Estrategia 1: Probar con token de acceso en header (aunque esté expirado)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            refresh: refreshToken,
            device_id: getUserDeviceId(),
          }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const newToken = data.access;
        
        // Verificar si debemos usar almacenamiento persistente
        const keepSession = localStorage.getItem('keepSession') === 'true';
        
        if (keepSession) {
          const options = { expires: EXTENDED_COOKIE_DURATION };
          Cookies.set('token', newToken, options);
          localStorage.setItem('token', newToken);
        } else {
          Cookies.set('token', newToken);
          localStorage.setItem('token', newToken);
        }
        
        // Actualizar el token en el store
        useStore.getState().updateToken(newToken);
        
        // Actualizar timestamp de último refresh
        localStorage.setItem('lastTokenRefresh', Date.now().toString());
        
        return newToken;
      } else {
        // En caso de error, preparar para redirección sin mostrar error en consola
        prepareForLoginRedirect();
        return null;
      }
    } catch { // CORRECCIÓN: Eliminar 'error' no utilizado
      // Error silencioso, preparar para redirección
      prepareForLoginRedirect();
      return null;
    }
  } catch { // CORRECCIÓN: Eliminar 'error' no utilizado
    // Cualquier otro error inesperado, también preparamos redirección
    prepareForLoginRedirect();
    return null;
  }
};

/**
 * Prepara una redirección suave al login
 */
export const prepareForLoginRedirect = () => {
  // Evitar múltiples redirecciones usando sessionStorage
  if (sessionStorage.getItem('redirectingToLogin') !== 'true') {
    sessionStorage.setItem('redirectingToLogin', 'true');
    
    // Limpiar sesión pero sin mostrar mensajes
    logout(false);
    
    // Redirigir después de un breve retraso para evitar loops
    setTimeout(() => {
      window.location.href = '/signin';
      // Limpia el flag después de un tiempo para permitir intentos futuros
      setTimeout(() => {
        sessionStorage.removeItem('redirectingToLogin');
      }, 5000);
    }, 100);
  }
};

/**
 * Verifica si un token está por expirar pronto
 * @param token El token JWT a verificar
 * @param minutesThreshold Minutos antes de expiración para considerar que expira pronto
 * @returns true si el token expira pronto o es inválido
 */
export const isTokenExpiringSoon = (token: string | null, minutesThreshold = 5): boolean => {
  try {
    if (!token) return true;
    
    const decodedToken = jwtDecode<TokenPayload>(token);
    console.log(`Verificando sesión para usuario ID: ${decodedToken.user_id}`);
    const expirationTime = decodedToken.exp * 1000; // Convertir a milisegundos
    const currentTime = Date.now();
    
    // Verificar si expira en menos de X minutos
    return expirationTime - currentTime < minutesThreshold * 60 * 1000;
  } catch { // CORRECCIÓN: Eliminar 'error' no utilizado
    // Si hay error al decodificar, considerarlo como expirado
    return true;
  } 
};

/**
 * Verifica si un token ya ha expirado
 * @param token El token JWT a verificar
 * @returns true si el token ya expiró
 */
export const isTokenExpired = (token: string | null): boolean => {
  try {
    if (!token) return true;
    
    const decodedToken = jwtDecode<TokenPayload>(token);
    const expirationTime = decodedToken.exp * 1000; // Convertir a milisegundos
    const currentTime = Date.now();
    
    return expirationTime <= currentTime;
  } catch { // CORRECCIÓN: Eliminar 'error' no utilizado
    // Si hay error al decodificar, considerarlo como expirado
    return true;
  } 
};

/**
 * Cierra la sesión del usuario actual
 * @param showLogs Mostrar mensajes en consola (true por defecto)
 */
export const logout = (showLogs = true) => {
  // Eliminar tokens
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
  localStorage.removeItem('user');
  localStorage.removeItem('keepSession');
  localStorage.removeItem('lastTokenRefresh');
  localStorage.removeItem('lastLoginTime');
  localStorage.removeItem('lastActivityUpdate');
  Cookies.remove('token');
  Cookies.remove('refresh');
  
  // Limpiar el store
  useStore.getState().logout();
  
  if (showLogs) {
    console.log("Sesión cerrada correctamente");
  }
};

/**
 * Obtiene el ID de dispositivo del usuario actual
 * @returns ID de dispositivo formateado como username-web-browser
 */
const getUserDeviceId = (): string => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.email + "-web-browser";
    }
  } catch {} // CORRECCIÓN: Eliminar 'e' no utilizado
  
  // Valor por defecto si no podemos obtener el email
  return "web-browser";
};

/**
 * Actualiza el último acceso del dispositivo
 * @returns true si la operación fue exitosa
 */
export const updateDeviceActivity = async () => {
  try {
    const token = Cookies.get('token') || localStorage.getItem('token');
    if (!token) return false;
    
    // Si el token ya expiró, no intentar actualizar
    if (isTokenExpired(token)) {
      return false;
    }
    
    // Usar el endpoint de refresh en lugar de session/update
    const refreshToken = Cookies.get('refresh') || localStorage.getItem('refresh');
    if (!refreshToken) return false;
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh/`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh: refreshToken,
          device_id: getUserDeviceId(),
        }),
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      
      // Actualizar el token en las cookies y localStorage
      const keepSession = localStorage.getItem('keepSession') === 'true';
      if (keepSession) {
        const options = { expires: EXTENDED_COOKIE_DURATION };
        Cookies.set('token', data.access, options);
      } else {
        Cookies.set('token', data.access);
      }
      
      localStorage.setItem('token', data.access);
      localStorage.setItem('lastActivityUpdate', Date.now().toString());
      
      // Actualizar el token en el store
      useStore.getState().updateToken(data.access);
      
      return true;
    }
    
    return false;
  } catch { // CORRECCIÓN: Eliminar 'error' no utilizado
    // Error silencioso
    return false;
  }
};

/**
 * Verifica si la sesión sigue siendo válida
 * @returns Promise que resuelve a true si la sesión es válida
 */
export const checkSessionValidity = async (): Promise<boolean> => {
  const token = Cookies.get('token') || localStorage.getItem('token');
  
  // Si no hay token, definitivamente no es válida
  if (!token) {
    prepareForLoginRedirect();
    return false;
  }
  
  try {
    // Intentar decodificar el token para ver si es válido
    // CORRECCIÓN: Usar decodedToken en lugar de decoded para usar la variable
    const decodedToken = jwtDecode<TokenPayload>(token);
    console.log(`Verificando token para usuario: ${decodedToken.user_id}`);
    
    // Opcional: Usar decodedToken para algo (para evitar error de variable no utilizada)
    // console.log("Verificando token para usuario:", decodedToken.user_id);
    
    // Si el token está próximo a expirar, intentar refrescarlo
    if (isTokenExpiringSoon(token)) {
      const newToken = await refreshToken();
      return !!newToken;
    }
    
    // El token parece válido
    return true;
  } catch { // CORRECCIÓN: Eliminar 'error' no utilizado
    // Si hay error al decodificar, el token ha sido manipulado o es inválido
    console.log("Token inválido o manipulado, redirigiendo al login...");
    prepareForLoginRedirect();
    return false;
  }
};

/**
 * Configura una verificación continua de la sesión
 * @returns Una función para detener la verificación
 */
export const setupSessionChecker = () => {
  // Verificar inmediatamente
  checkSessionValidity();
  
  // Verificar cada segundo sin sobrecargar con logs
  const intervalId = setInterval(async () => {
    await checkSessionValidity();
  }, 30000);
  
  return () => clearInterval(intervalId);
};