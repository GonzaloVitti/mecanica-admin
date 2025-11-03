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
import { useStore } from '@/store/useStore';

// Interfaz para el mecánico
interface Mechanic {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_verified: boolean;
  role: 'MECHANIC';
  date_joined: string;
  is_active: boolean;
  profile_picture?: string;
}

// Respuesta paginada de la API
interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Mechanic[];
}

// Interfaz para las alertas
interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// Función para formatear fechas
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-200 dark:hover:text-gray-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-4 py-2"
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            className="px-4 py-2"
          >
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
};

const MechanicsPage = () => {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    mechanicId: '',
    mechanicName: '',
    action: '' as 'delete' | 'toggle_active' | 'toggle_verified'
  });

  const { user } = useStore();
  const itemsPerPage = 10;

  // Función para mostrar alertas
  const showAlert = (type: AlertState['type'], title: string, message: string) => {
    setAlert({ show: true, type, title, message });
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Función para cargar mecánicos
  const loadMechanics = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const offset = (page - 1) * itemsPerPage;
      let url = `/api/mechanics/?limit=${itemsPerPage}&offset=${offset}`;
      
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const data = await fetchApi<ApiResponse>(url, {
        method: 'GET',
      });

      if (data) {
        setMechanics(data.results);
        setTotalCount(data.count);
        setTotalPages(Math.ceil(data.count / itemsPerPage));
      } else {
        showAlert('error', 'Error', 'No se pudieron cargar los mecánicos');
      }
    } catch (error) {
      console.error('Error loading mechanics:', error);
      showAlert('error', 'Error', 'Error de conexión al cargar los mecánicos');
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar mecánico
  const deleteMechanic = async (mechanicId: string) => {
    try {
      const result = await fetchApi(`/api/users/${mechanicId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      // Para DELETE, fetchApi devuelve null si es exitoso
      if (result !== undefined) {
        showAlert('success', 'Éxito', 'Mecánico eliminado correctamente');
        loadMechanics(currentPage, searchTerm);
      } else {
        showAlert('error', 'Error', 'No se pudo eliminar el mecánico');
      }
    } catch (error) {
      console.error('Error deleting mechanic:', error);
      showAlert('error', 'Error', 'Error de conexión al eliminar el mecánico');
    }
  };

  // Función para cambiar estado activo
  const toggleActiveStatus = async (mechanicId: string) => {
    try {
      const data = await fetchApi(`/api/users/${mechanicId}/toggle_active_status/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (data) {
        showAlert('success', 'Éxito', 'Estado del mecánico actualizado correctamente');
        loadMechanics(currentPage, searchTerm);
      } else {
        showAlert('error', 'Error', 'No se pudo actualizar el estado del mecánico');
      }
    } catch (error) {
      console.error('Error toggling active status:', error);
      showAlert('error', 'Error', 'Error de conexión al actualizar el estado');
    }
  };

  // Función para cambiar estado verificado
  const toggleVerifiedStatus = async (mechanicId: string) => {
    try {
      const data = await fetchApi(`/api/users/${mechanicId}/toggle_verified_status/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (data) {
        showAlert('success', 'Éxito', 'Estado de verificación actualizado correctamente');
        loadMechanics(currentPage, searchTerm);
      } else {
        showAlert('error', 'Error', 'No se pudo actualizar el estado de verificación');
      }
    } catch (error) {
      console.error('Error toggling verified status:', error);
      showAlert('error', 'Error', 'Error de conexión al actualizar la verificación');
    }
  };

  // Manejar confirmación del modal
  const handleConfirmAction = () => {
    const { mechanicId, action } = confirmModal;
    
    switch (action) {
      case 'delete':
        deleteMechanic(mechanicId);
        break;
      case 'toggle_active':
        toggleActiveStatus(mechanicId);
        break;
      case 'toggle_verified':
        toggleVerifiedStatus(mechanicId);
        break;
    }
    
    setConfirmModal({
      isOpen: false,
      mechanicId: '',
      mechanicName: '',
      action: 'delete'
    });
  };

  // Manejar búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadMechanics(1, searchTerm);
  };

  // Efectos
  useEffect(() => {
    loadMechanics();
  }, []);

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6">
      {/* Alerta */}
      {alert.show && (
        <div className="mb-4">
          <Alert
            variant={alert.type}
            title={alert.title}
            message={alert.message}
            onClose={() => setAlert(prev => ({ ...prev, show: false }))}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Mecánicos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona los mecánicos del taller
          </p>
        </div>
        <Link href="/mechanics/add">
          <Button className="w-full sm:w-auto">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Agregar Mecánico
          </Button>
        </Link>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar mecánicos por nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button type="submit" variant="outline">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Buscar
          </Button>
        </form>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-600 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Mecánicos
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalCount}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Activos
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {mechanics.filter(m => m.is_active).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Verificados
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {mechanics.filter(m => m.is_verified).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
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
                    Mecánico
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Email
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Teléfono
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Estado
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Verificado
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Fecha de registro
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                        <span className="ml-2">Cargando mecánicos...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : mechanics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      No se encontraron mecánicos
                    </TableCell>
                  </TableRow>
                ) : (
                  mechanics.map((mechanic) => (
                    <TableRow key={mechanic.id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
                          #{mechanic.id}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                              {mechanic.first_name} {mechanic.last_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {mechanic.username}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {mechanic.email}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {mechanic.phone_number || 'No especificado'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          size="sm"
                          color={mechanic.is_active ? "success" : "error"}
                        >
                          {mechanic.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          size="sm"
                          color={mechanic.is_verified ? "success" : "warning"}
                        >
                          {mechanic.is_verified ? "Verificado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {formatDate(mechanic.date_joined)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/mechanics/${mechanic.id}`}
                            className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                          >
                            Ver
                          </Link>
                          <button
                            onClick={() => setConfirmModal({
                              isOpen: true,
                              mechanicId: mechanic.id,
                              mechanicName: `${mechanic.first_name} ${mechanic.last_name}`,
                              action: 'delete'
                            })}
                            className="px-3 py-1 text-xs text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                          >
                            Eliminar
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Controles de paginación */}
            {mechanics.length > 0 && (
              <div className="mt-4 flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    Mostrando <span className="font-medium">{mechanics.length}</span> mecánicos, página <span className="font-medium">{currentPage}</span> de{" "}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const newPage = currentPage - 1;
                      setCurrentPage(newPage);
                      loadMechanics(newPage, searchTerm);
                    }}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded ${
                      currentPage === 1 
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500" 
                        : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                    }`}
                  >
                    Anterior
                  </button>
                  
                  <button
                    onClick={() => {
                      const newPage = currentPage + 1;
                      setCurrentPage(newPage);
                      loadMechanics(newPage, searchTerm);
                    }}
                    disabled={currentPage >= totalPages}
                    className={`px-3 py-1 rounded ${
                      currentPage >= totalPages 
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500" 
                        : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                    }`}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({
          isOpen: false,
          mechanicId: '',
          mechanicName: '',
          action: 'delete'
        })}
        onConfirm={handleConfirmAction}
        title={
          confirmModal.action === 'delete' 
            ? 'Eliminar Mecánico'
            : confirmModal.action === 'toggle_active'
            ? 'Cambiar Estado'
            : 'Cambiar Verificación'
        }
        message={
          confirmModal.action === 'delete'
            ? `¿Estás seguro de que deseas eliminar al mecánico "${confirmModal.mechanicName}"? Esta acción no se puede deshacer.`
            : confirmModal.action === 'toggle_active'
            ? `¿Estás seguro de que deseas cambiar el estado del mecánico "${confirmModal.mechanicName}"?`
            : `¿Estás seguro de que deseas cambiar el estado de verificación del mecánico "${confirmModal.mechanicName}"?`
        }
      />
    </div>
  );
};

export default MechanicsPage;