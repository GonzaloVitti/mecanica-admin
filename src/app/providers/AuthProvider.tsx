"use client";
import { useEffect, useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { 
  refreshToken, 
  isTokenExpiringSoon, 
  updateDeviceActivity, 
  setupSessionChecker,
  setupActivityUpdater
} from "@/app/lib/auth";
import Cookies from "js-cookie";

// Rutas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/signin',
  '/signup',
  '/reset-password',
  '/404',
  '/500',
];

// Rutas de autenticación donde redirigir a home si ya está autenticado
const AUTH_ROUTES = [
  '/signin',
  '/signup',
  '/reset-password',
];

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // Accede a cada valor del store con su propio selector
  const token = useStore(state => state.token);
  const initialized = useStore(state => state.initialized);

  // Verificar si la ruta actual requiere autenticación
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));
  
  // Verificar si estamos en una ruta de autenticación (login, registro, etc.)
  const isAuthRoute = AUTH_ROUTES.some(route => pathname?.startsWith(route));

  // Función para restaurar la sesión desde almacenamiento local
  const tryRestoreSession = useCallback(async () => {
    // Si ya hay un token en el store, no necesitamos restaurar
    if (useStore.getState().token) return true;
    
    // Intentar obtener token de cookies o localStorage
    const storedToken = Cookies.get('token') || localStorage.getItem('token');
    const storedRefresh = Cookies.get('refresh') || localStorage.getItem('refresh');
    
    // Si no hay tokens, no podemos restaurar
    if (!storedToken && !storedRefresh) return false;
    
    // Si hay un token válido, restaurarlo directamente
    if (storedToken && !isTokenExpiringSoon(storedToken)) {
      try {
        // Intentar obtener datos de usuario de localStorage
        let userData = null;
        const userDataStr = localStorage.getItem('user');
        
        if (userDataStr) {
          userData = JSON.parse(userDataStr);
        }
        
        useStore.getState().setAuth(storedToken, storedRefresh || "", userData);
        return true;
      } catch (error) {
        console.error("Error restaurando sesión:", error);
      }
    }
    
    // Si el token expiró pero tenemos refresh token, intentar renovar
    if (storedRefresh) {
      const newToken = await refreshToken();
      return !!newToken;
    }
    
    return false;
  }, []);

  // Verificar y refrescar token periódicamente
  const checkAndRefreshToken = useCallback(async () => {
    const currentToken = useStore.getState().token;
    
    // Si no hay token y estamos en una ruta protegida, intentar restaurar sesión
    if (!currentToken && !isPublicRoute) {
      const restored = await tryRestoreSession();
      if (!restored) {
        router.push('/signin');
        return;
      }
    }
    
    // Si hay token pero está por expirar, renovarlo silenciosamente
    if (currentToken && isTokenExpiringSoon(currentToken)) {
      await refreshToken();
    }
    
    // Actualizar actividad del dispositivo periódicamente (cada 30 min)
    const lastActivity = localStorage.getItem('lastActivityUpdate');
    const now = Date.now();
    if (!lastActivity || (now - parseInt(lastActivity)) > 30 * 60 * 1000) {
      if (currentToken) {
        await updateDeviceActivity();
        localStorage.setItem('lastActivityUpdate', now.toString());
      }
    }
  }, [isPublicRoute, router, tryRestoreSession]);

  // Verificación inicial de autenticación
  useEffect(() => {
    const initialAuthCheck = async () => {
      // Si ya hay un token y estamos en una ruta de auth, redirigir a home
      if (token && isAuthRoute) {
        router.push('/');
        setIsAuthChecking(false);
        return;
      }
      
      // Si es una ruta pública, no hacer más verificaciones
      if (isPublicRoute) {
        setIsAuthChecking(false);
        return;
      }
      
      // Si ya tenemos token, no hacer más verificaciones
      if (token) {
        setIsAuthChecking(false);
        return;
      }

      // Si no hay token, intentar restaurar la sesión
      const restored = await tryRestoreSession();
      
      // Si no se pudo restaurar y no es ruta pública, redirigir a login
      if (!restored && !isPublicRoute) {
        router.push('/signin');
      }
      
      setIsAuthChecking(false);
    };
    
    initialAuthCheck();
  }, [isPublicRoute, isAuthRoute, token, router, tryRestoreSession]);

  // Ejecutar verificación al cargar y configurar intervalos
  useEffect(() => {
    // Inicializar store si aún no se ha hecho
    if (!initialized) {
      tryRestoreSession().then(() => {
        useStore.getState().setInitialized(true);
      });
    }
    
    // Verificar inmediatamente
    checkAndRefreshToken();
    
    // Configurar verificación periódica estándar (cada 4 minutos)
    const standardCheckInterval = setInterval(() => {
      checkAndRefreshToken();
    }, 4 * 60 * 1000);
    
    // Configurar verificación de sesión más frecuente (cada segundo)
    const sessionCheckerStop = setupSessionChecker();
    
    // Añadir el actualizador de actividad
    const activityUpdaterStop = setupActivityUpdater();
  
    return () => {
      clearInterval(standardCheckInterval);
      sessionCheckerStop();
      activityUpdaterStop(); // Limpiar el intervalo al desmontar
    };
  }, [checkAndRefreshToken, initialized, tryRestoreSession]);

  // Proteger rutas que requieren autenticación
  useEffect(() => {
    if (initialized && !token && !isPublicRoute) {
      router.push('/signin');
    }
  }, [initialized, token, isPublicRoute, router]);

  // Redirigir a home si el usuario ya está autenticado y trata de acceder a login/register
  useEffect(() => {
    if (initialized && token && isAuthRoute) {
      router.push('/');
    }
  }, [initialized, token, isAuthRoute, router]);

  // Mostrar un spinner mientras se verifica la autenticación en rutas protegidas
  if (isAuthChecking && !isPublicRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}