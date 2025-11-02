'use client'
import React, { useEffect, useState, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Badge from '@/components/ui/badge/Badge';
import Button from "@/components/ui/button/Button";
import Link from 'next/link';
import { fetchApi } from '@/app/lib/data';
import Alert from '@/components/ui/alert/Alert';

// Interfaz para el usuario anidado dentro del conductor
interface UserData {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_verified: boolean;
  role: 'DRIVER';
  date_joined: string;
  is_active: boolean;
  profile_picture?: string; // Agregar campo para la imagen de perfil
}

// Interfaz para el conductor
interface Driver {
  id: number;
  user: UserData;
  profile_picture_url: string | null;
  personal_id_front_url: string | null;
  personal_id_back_url: string | null;
  driver_license_front_url: string | null;
  driver_license_back_url: string | null;
  push_token: string;
  working: boolean;
  has_trip: boolean;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  rating: string;
  switch: number;
}

// Respuesta paginada de la API
interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Driver[];
}

// Interfaz para las alertas
interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// Componente modal para confirmación
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Efecto para manejar clicks fuera del modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);


  // Efecto para manejar la tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        ref={modalRef}
        className="w-full max-w-md p-6 mx-auto bg-white rounded-xl shadow-lg dark:bg-gray-800 animate-fadeIn"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
          {title}
        </h3>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
};

// Componente para el avatar del conductor con imagen de perfil o iniciales
const DriverAvatar = ({ driver }: { driver: Driver }) => {
  // Verificar primero si hay una imagen de perfil en user.profile_picture
  if (driver.user.profile_picture) {
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden">
        <img
          src={driver.user.profile_picture}
          alt={`${driver.user.first_name} ${driver.user.last_name}`}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Verificar la imagen de perfil en profile_picture_url (como antes)
  if (driver.profile_picture_url) {
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden">
        <img
          src={driver.profile_picture_url}
          alt={`${driver.user.first_name} ${driver.user.last_name}`}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Si no hay imagen de perfil, mostrar iniciales
  const initials = `${driver.user.first_name.charAt(0)}${driver.user.last_name.charAt(0)}`;

  return (
    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
      {initials}
    </div>
  );
};

const DriversPage = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WORKING' | 'NOT_WORKING'>('ALL');
  const [isDriverActive, setIsDriverActive] = useState(driver?.user.is_active || false);
  // Estado para el modal de confirmación
  const [modalOpen, setModalOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);

  // Estado para las alertas
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Filtrar conductores según el estado seleccionado
  const filteredDrivers = drivers.filter(driver => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'WORKING') return driver.working;
    return !driver.working;
  });

  // Función mejorada para cambiar el estado del conductor
  const handleToggleDriverStatus = async (driver: Driver) => {
    console.log("Cambiando estado del conductor:", driver);


    // Cambiar el estado local inmediatamente para feedback visual
    setIsDriverActive(!isDriverActive);

    try {
      // Llamada a la API para cambiar el estado
      await fetchApi(`/api/users/${driver.user.id}/toggle_active_status/`, {
        method: 'POST',
        body: {}
      });

      // No es necesario recargar toda la página
      // window.location.reload();

      // Opcional: mostrar notificación de éxito
      console.log("Estado cambiado correctamente");
      window.location.reload();
    }
    catch (error) {
      console.error('Error al cambiar el estado del conductor:', error);

      // Si hay error, revertir el cambio visual
      setIsDriverActive(!isDriverActive);

      // Opcional: mostrar mensaje de error
    }
  };



  // Función para ocultar la alerta después de cierto tiempo
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (alert.show) {
      timeoutId = setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 5000);
    }
    return () => clearTimeout(timeoutId);
  }, [alert.show]);

  // Cargar datos de conductores
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoading(true);
        const response = await fetchApi<ApiResponse>('/api/drivers/');
        console.log('Response:', response);
        if (response && response.results) {
          setDrivers(response.results);
        }
      } catch {
        setError('Error al cargar los conductores');
        console.error('Error fetching drivers:');
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  // Iniciar proceso de eliminación (mostrar modal)
  const confirmDelete = (driver: Driver) => {
    setDriverToDelete(driver);
    setModalOpen(true);
  };

  // Manejar la eliminación después de la confirmación
  const handleDelete = async () => {
    if (!driverToDelete) return;

    try {
      // En lugar de llamar al endpoint del conductor, llamamos al endpoint de usuario para eliminar la cuenta completa
      await fetchApi(`/api/users/${driverToDelete.user.id}/delete_account/`, {
        method: 'DELETE'
      });

      // Actualizar la lista de conductores
      setDrivers(drivers.filter(driver => driver.id !== driverToDelete.id));

      // Mostrar alerta de éxito
      setAlert({
        show: true,
        type: 'success',
        title: 'Usuario eliminado',
        message: `El usuario ${driverToDelete.user.first_name} ${driverToDelete.user.last_name} ha sido eliminado correctamente.`
      });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);

      // Mostrar alerta de error
      setAlert({
        show: true,
        type: 'error',
        title: 'Error al eliminar',
        message: `No se pudo eliminar al usuario ${driverToDelete.user.first_name} ${driverToDelete.user.last_name}. Intente nuevamente.`
      });
    }
  };
  // Toggle del estado de trabajo del conductor
  const toggleDriverStatus = async (driver: Driver) => {
    try {
      const updatedDriver = await fetchApi(`/api/drivers/${driver.id}/`, {
        method: 'PATCH',
        body: { working: !driver.working }
      });

      // Actualizar el estado del conductor en la lista
      if (updatedDriver) {
        setDrivers(drivers.map(d =>
          d.id === driver.id ? { ...d, working: !d.working } : d
        ));
      }
    } catch {
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: `No se pudo actualizar el estado del conductor ${driver.user.first_name} ${driver.user.last_name}.`
      });
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

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
      {/* Alertas de estado */}
      {alert.show && (
        <div className="mb-6">
          <Alert
            variant={alert.type}
            title={alert.title}
            message={alert.message}
          />
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Conductores
        </h1>
        <Link
          href="/drivers/add"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Nuevo Conductor
        </Link>
      </div>

      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'WORKING' | 'NOT_WORKING')}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
        >
          <option value="ALL">Todos los conductores</option>
          <option value="WORKING">Disponibles para trabajar</option>
          <option value="NOT_WORKING">No disponibles</option>
        </select>
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
                    Conductor
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Email
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Teléfono
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Dirección
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Estado
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Activo
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Calificación
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {filteredDrivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <span className="text-gray-500 text-theme-sm dark:text-gray-400">
                        #{driver.id}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <DriverAvatar driver={driver} />
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {driver.user.first_name} {driver.user.last_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {driver.user.username}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {driver.user.email}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {driver.user.phone_number}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {driver.address}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Badge
                          size="sm"
                          color={driver.working ? "success" : "warning"}
                        >
                          {driver.working ? "Disponible" : "No disponible"}
                        </Badge>
                        <button
                          onClick={() => toggleDriverStatus(driver)}
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          Cambiar
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 ">
                      <div className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => handleToggleDriverStatus(driver)}
                            className={`cursor-pointer px-3 py-2 rounded-md ${driver.user.is_active
                              ? 'text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                              : 'text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                              }`}
                          >
                            {driver.user.is_active ? "Desactivar" : "Activar"}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span>{driver.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/drivers/${driver.id}`}
                          className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          Ver
                        </Link>
                        <button
                          onClick={() => confirmDelete(driver)}
                          className="px-3 py-1 text-xs text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                        >
                          Eliminar
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredDrivers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      No se encontraron conductores
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Modal de confirmación para eliminar conductor */}
      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar conductor"
        message={driverToDelete ? `¿Estás seguro que deseas eliminar al conductor ${driverToDelete.user.first_name} ${driverToDelete.user.last_name}? Esta acción no se puede deshacer.` : ''}
      />
    </div>
  );
};

export default DriversPage;