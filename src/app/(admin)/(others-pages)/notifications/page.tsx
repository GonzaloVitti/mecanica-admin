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
import Link from 'next/link';

interface Notification {
  id: string;
  user: number | null;
  trip: number | null;
  title: string;
  message: string;
  mode: string;
  type: string;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, unknown>;
  send_push: boolean;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}

const getNotificationType = (type: string) => {
  const types: Record<string, string> = {
    'SYSTEM': 'Sistema',
    'SUPPORT': 'Soporte',
    'TRIP': 'Viaje',
    'PAYMENT': 'Pago',
    'USER': 'Usuario',
    'AUTHORIZATION': 'Autorización'
  };
  return types[type] || type;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getNotificationStatus = (isRead: boolean) => {
  return {
    color: isRead ? 'success' : 'warning',
    text: isRead ? 'Leída' : 'No leída'
  };
};

const Page = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);

  // Estado para alertas
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [alertMessage, setAlertMessage] = useState('');

  const fetchNotifications = async (url?: string) => {
    try {
      setLoading(true);
      let apiUrl = url || '/api/notifications/';

      // Asegurar que la URL es relativa (no tiene protocolo/host)
      if (apiUrl.startsWith('http')) {
        apiUrl = apiUrl.replace(/^https?:\/\/[^\/]+/, '');
      }

      const response = await fetchApi<ApiResponse>(apiUrl);

      if (response && response.results) {
        setNotifications(response.results);
        setTotalCount(response.count);
        setTotalPages(Math.ceil(response.count / 10));
        setNextPageUrl(response.next);
        setPrevPageUrl(response.previous);

        if (url?.includes('offset=')) {
          const match = url.match(/offset=(\d+)/);
          if (match) {
            setCurrentPage(Math.floor(parseInt(match[1], 10) / 10) + 1);
          }
        } else {
          setCurrentPage(1);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Error al cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetchApi(`/api/notifications/${id}/mark_read/`, {
        method: 'POST'
      });

      setNotifications(notifications.map(notification =>
        notification.id === id ? { ...notification, is_read: true } : notification
      ));

      setAlertType('success');
      setAlertMessage('Notificación marcada como leída');
      setShowAlert(true);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setAlertType('error');
      setAlertMessage('Error al marcar la notificación como leída');
      setShowAlert(true);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetchApi('/api/notifications/mark_all_read/', {
        method: 'POST'
      });

      setNotifications(notifications.map(notification => ({
        ...notification,
        is_read: true
      })));

      setAlertType('success');
      setAlertMessage('Todas las notificaciones marcadas como leídas');
      setShowAlert(true);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setAlertType('error');
      setAlertMessage('Error al marcar todas las notificaciones como leídas');
      setShowAlert(true);
    }
  };

  // Funciones de navegación
  const goToNextPage = () => {
    if (nextPageUrl) {
      const apiPath = nextPageUrl.replace(/^https?:\/\/[^\/]+/, '');
      fetchNotifications(apiPath);
    }
  };

  const goToPrevPage = () => {
    if (prevPageUrl) {
      const apiPath = prevPageUrl.replace(/^https?:\/\/[^\/]+/, '');
      fetchNotifications(apiPath);
    }
  };

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Ocultar alerta después de 5 segundos
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  // Mostrar loading
  if (loading && notifications.length === 0) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Notificaciones {totalCount > 0 && `(${totalCount})`}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Visualice y gestione todas las notificaciones de la plataforma
          </p>
        </div>
        
        <div className="flex gap-3">
          {/* Botón para añadir notificación */}
          <Link
            href="/notifications/add"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Nueva Notificación
          </Link>
          
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            Marcar todas como leídas
          </button>
        </div>
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

      {/* Contador de notificaciones */}
      <div className="mb-6">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Mostrando {notifications.length} de {totalCount} notificaciones
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1102px]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    ID
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Título
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Mensaje
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Tipo
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Estado
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Fecha
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {notification.id.substring(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {notification.title}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {notification.message}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {getNotificationType(notification.type)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          size="sm"
                          color={getNotificationStatus(notification.is_read).color as any}
                        >
                          {getNotificationStatus(notification.is_read).text}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {formatDate(notification.created_at)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                          >
                            Marcar como leída
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No se encontraron notificaciones
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Paginación */}
      {notifications.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex flex-col lg:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={goToPrevPage}
              disabled={!prevPageUrl}
              className={`px-4 py-2 text-sm font-medium rounded-md
                ${prevPageUrl
                  ? 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-800'
                  : 'text-gray-300 cursor-not-allowed dark:text-gray-600'
                }`}
            >
              Anterior
            </button>
            <button
              onClick={goToNextPage}
              disabled={!nextPageUrl}
              className={`px-4 py-2 text-sm font-medium rounded-md
                ${nextPageUrl
                  ? 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-800'
                  : 'text-gray-300 cursor-not-allowed dark:text-gray-600'
                }`}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;