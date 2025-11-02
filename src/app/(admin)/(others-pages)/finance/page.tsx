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
import Link from 'next/link';
import { fetchApi } from '@/app/lib/data';
import Alert from '@/components/ui/alert/Alert';

// Interfaz para el usuario anidado dentro del empleado de finanzas
interface UserData {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_verified: boolean;
  role: 'FINANCE';
  date_joined: string;
  is_active: boolean;
  profile_picture?: string;
}

// Interfaz para la sucursal
interface BranchData {
  id: string;
  name: string;
  code: string;
}

// Interfaz para el empleado de finanzas
interface Finance {
  id: number;
  user: UserData | null;
  branch: BranchData;
  branch_name: string;
  finance_level: 'analyst' | 'supervisor' | 'manager';
  can_authorize_discounts: boolean;
  can_close_register: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Respuesta paginada de la API
interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Finance[];
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
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

const FinanceAvatar = ({ finance }: { finance: Finance }) => {
  const getInitials = () => {
    if (finance.user) {
      const firstName = finance.user.first_name || '';
      const lastName = finance.user.last_name || '';
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return 'FI';
  };

  const getRandomColor = () => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500'
    ];
    // Use the number directly for color selection
    const index = finance.id % colors.length;
    return colors[index];
  };

  return (
    <div className={`w-10 h-10 rounded-full ${getRandomColor()} flex items-center justify-center text-white font-semibold text-sm`}>
      {getInitials()}
    </div>
  );
};

const FinancePage = () => {
  const [financeStaff, setFinanceStaff] = useState<Finance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [financeToDelete, setFinanceToDelete] = useState<Finance | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);

  const handleToggleFinanceStatus = async (finance: Finance) => {
    try {
      const response = await fetchApi<Finance>(`/api/finance/${finance.id}/`, {
        method: 'PATCH',
        body: { is_active: !finance.is_active }
      });

      if (response) {
        setFinanceStaff(prev => prev.map(f => 
          f.id === finance.id 
            ? { ...f, is_active: !f.is_active }
            : f
        ));

        setAlert({
          show: true,
          type: 'success',
          title: 'Estado actualizado',
          message: `El empleado de finanzas ${finance.user?.first_name} ${finance.user?.last_name} ha sido ${!finance.is_active ? 'activado' : 'desactivado'} correctamente.`
        });
      }
    } catch {
      setAlert({
        show: true,
        type: 'error',
        title: 'Error al actualizar',
        message: `No se pudo actualizar el estado del empleado de finanzas ${finance.user?.first_name} ${finance.user?.last_name}. Intente nuevamente.`
      });
    }
  };

  const fetchFinanceStaff = async (url = '/api/finance/') => {
    try {
      setLoading(true);
      const response = await fetchApi<ApiResponse>(url);
      
      if (response) {
        setFinanceStaff(response.results);
        setTotalCount(response.count);
        setNextPageUrl(response.next);
        setPrevPageUrl(response.previous);
        
        // Calcular total de páginas
        const pageSize = response.results.length;
        if (pageSize > 0) {
          setTotalPages(Math.ceil(response.count / pageSize));
        }
      }
    } catch {
      setError('Error al cargar los empleados de finanzas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceStaff();
  }, []);

  // Función para ocultar la alerta después de cierto tiempo
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (alert.show) {
      timeoutId = setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 5000); // Ocultar después de 5 segundos
    }
    return () => clearTimeout(timeoutId);
  }, [alert.show]);

  const goToPrevPage = () => {
    if (prevPageUrl) {
      fetchFinanceStaff(prevPageUrl);
      setCurrentPage(prev => Math.max(prev - 1, 1));
    }
  };

  const goToNextPage = () => {
    if (nextPageUrl && currentPage < totalPages) {
      fetchFinanceStaff(nextPageUrl);
      setCurrentPage(prev => prev + 1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getFinanceLevelLabel = (level: string) => {
    const levels = {
      'analyst': 'Analista Financiero',
      'supervisor': 'Supervisor Financiero',
      'manager': 'Gerente Financiero'
    };
    return levels[level as keyof typeof levels] || level;
  };

  const confirmDelete = (finance: Finance) => {
    setFinanceToDelete(finance);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!financeToDelete) return;

    try {
      // NOTA: Usar delete_account para eliminar completamente el usuario
      // Esto elimina tanto la cuenta de usuario como todos sus perfiles (incluyendo el de finanzas)
      const response = await fetchApi(`/api/users/${financeToDelete.user?.id}/delete_account/`, {
        method: 'DELETE'
      });

      if (response === null) {
        // Recargar la lista completa para asegurar sincronización
        fetchFinanceStaff();
        
        setAlert({
          show: true,
          type: 'success',
          title: 'Usuario eliminado',
          message: `El usuario ${financeToDelete.user?.first_name} ${financeToDelete.user?.last_name} y todos sus perfiles han sido eliminados correctamente.`
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      
      setAlert({
        show: true,
        type: 'error',
        title: 'Error al eliminar',
        message: `No se pudo eliminar al usuario ${financeToDelete.user?.first_name} ${financeToDelete.user?.last_name}. Verifique que tenga permisos de SuperAdmin.`
      });
    } finally {
      setModalOpen(false);
      setFinanceToDelete(null);
    }
  };

  if (loading && financeStaff.length === 0) {
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
          Empleados de Finanzas {totalCount > 0 && `(${totalCount})`}
        </h1>
        <Link
          href="/finance/add"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Agregar Empleado de Finanzas
        </Link>
      </div>

      {/* Indicador de carga cuando ya hay datos */}
      {loading && financeStaff.length > 0 && (
        <div className="mb-4 flex justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
        </div>
      )}

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
                    Empleado
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Email
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Teléfono
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Sucursal
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Nivel
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Estado
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
                {financeStaff.map((finance) => (
                  <TableRow key={finance.id}>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <span className="text-gray-500 text-theme-sm dark:text-gray-400">
                        #{finance.id.toString().slice(0, 8)}...
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <FinanceAvatar finance={finance} />
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {finance.user ? `${finance.user.first_name} ${finance.user.last_name}` : 'N/A'}
                          </span>
                          {finance.user && (
                            <span className="text-xs text-gray-500">
                              {finance.user.username}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {finance.user?.email || 'N/A'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {finance.user?.phone_number || 'N/A'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {finance.branch_name ? finance.branch_name : 'N/A'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {getFinanceLevelLabel(finance.finance_level)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <Badge
                        size="sm"
                        color={finance.is_active ? "success" : "warning"}
                      >
                        {finance.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {formatDate(finance.created_at)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/finance/${finance.id}`}
                          className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          Ver
                        </Link>
                        <button
                          onClick={() => handleToggleFinanceStatus(finance)}
                          className={`px-3 py-1 text-xs rounded-md ${
                            finance.is_active
                              ? 'text-orange-600 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                          }`}
                        >
                          {finance.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => confirmDelete(finance)}
                          className="px-3 py-1 text-xs text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                        >
                          Eliminar
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {financeStaff.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      No se encontraron empleados de finanzas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Controles de paginación */}
            {financeStaff.length > 0 && (
              <div className="mt-4 flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    Mostrando <span className="font-medium">{financeStaff.length}</span> empleados de finanzas, página <span className="font-medium">{currentPage}</span> de{" "}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={goToPrevPage}
                    disabled={!prevPageUrl}
                    className={`px-3 py-1 rounded ${
                      !prevPageUrl 
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500" 
                        : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                    }`}
                  >
                    Anterior
                  </button>
                  
                  <button
                    onClick={goToNextPage}
                    disabled={!nextPageUrl || currentPage >= totalPages}
                    className={`px-3 py-1 rounded ${
                      !nextPageUrl || currentPage >= totalPages
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
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setFinanceToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Eliminar cuenta de usuario"
        message={`¿Está seguro de que desea eliminar completamente la cuenta del empleado de finanzas "${financeToDelete?.user?.first_name} ${financeToDelete?.user?.last_name}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
};

export default FinancePage;
