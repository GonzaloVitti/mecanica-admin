"use client";
import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useStore } from "@/store/useStore";
import { fetchApi } from "@/app/lib/data";



interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
}

interface Company {
  id: string;
  name: string;
}

interface Admin {
  id: number;
  company: Company;
}

interface Authorizer {
  id: number;
  company: Company;
}

interface NotificationResponse {
  results: Notification[];
  count: number;
}

export interface UserData {
  id?: number;
  email?: string;
  role?: string;
  is_verified?: boolean;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  username?: string;
  date_joined?: string;
  bio?: string;
  country?: string;
  city?: string;
  postal_code?: string;
  profile_image?: string;
  is_superuser?: boolean;
  admin?: Admin;
  authorizer?: Authorizer;
}

// Función auxiliar para formatear tiempo
const formatTimeAgo = (date: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' años';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' meses';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' días';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' horas';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutos';
  
  return Math.floor(seconds) + ' segundos';
};

const getNotificationType = (type: string): string => {
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

export default function NotificationDropdown() {
  // Estados
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previousNotificationCount, setPreviousNotificationCount] = useState(0);
  
  const user = useStore(state => state.user) as UserData;
  const isAdmin = user?.role === 'ADMINISTRATOR';
  const isAuthorizer = user?.role === 'BRANCH_MANAGER';
  const isSuperUser = user?.is_superuser;

  // Función para reproducir sonido de notificación
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/alert.mp3');
      audio.volume = 0.5; // Volumen al 50%
      audio.play().catch(error => {
        console.log('No se pudo reproducir el sonido de notificación:', error);
      });
    } catch (error) {
      console.log('Error al crear el audio:', error);
    }
  };


  useEffect(() => {
      // Configurar intervalo para cargar notificaciones cada 10 segundos
      const intervalId = setInterval(() => {
        console.log("Ejecutando funcionasdsa")
        fetchNotifications();
      }, 10000); // 10 segundos
      
      // Limpiar el intervalo cuando el dropdown se cierre o el componente se desmonte
      return () => {
        clearInterval(intervalId);
      };
    
  },); // Este efecto se ejecuta cuando cambia isOpen

  const fetchNotifications = async () => {
    console.log("Ejecutando")
    try {
      setLoading(true);
      let url = '/api/notifications/';

      const companyId = isAuthorizer
        ? user?.authorizer?.company?.id
        : (isAdmin && !isSuperUser) ? user?.admin?.company?.id : null;

      if (companyId) {
        url += `?company=${companyId}`;
      }

      const response = await fetchApi<NotificationResponse>(url);
      
      if (response && response.results) {
        const newNotifications = response.results;
        const newUnreadCount = newNotifications.filter(n => !n.is_read).length;
        
        // Verificar si hay nuevas notificaciones no leídas
        if (previousNotificationCount > 0 && newUnreadCount > unreadCount) {
          playNotificationSound();
        }
        
        setNotifications(newNotifications);
        setUnreadCount(newUnreadCount);
        setPreviousNotificationCount(newNotifications.length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetchApi(`/api/notifications/${id}/mark_read/`, {
        method: 'POST'
      });
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notificaciones {unreadCount > 0 && `(${unreadCount})`}
          </h5>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition dropdown-toggle dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <DropdownItem
                    onItemClick={() => markAsRead(notification.id)}
                    className={`flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 ${
                      !notification.is_read ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                    }`}
                  >
{/*                     <span className="relative block w-10 h-10 rounded-full">
                      <Image
                        width={40}
                        height={40}
                        src={notification.user?.avatar || "/images/user/default-avatar.png"}
                        alt={notification.user?.first_name || "Usuario"}
                        className="overflow-hidden rounded-full"
                      />
                    </span> */}

                    <span className="block">
                      <span className="mb-1.5 block text-sm text-gray-500 dark:text-gray-400">
                        {notification.message}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{getNotificationType(notification.type)}</span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span>{formatTimeAgo(notification.created_at)}</span>
                      </span>
                    </span>
                  </DropdownItem>
                </li>
              ))}
              {notifications.length === 0 && (
                <li className="p-4 text-center text-gray-500">
                  No hay notificaciones nuevas
                </li>
              )}
            </ul>
          </>
        )}
      </Dropdown>
    </div>
  );
}