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
import { useStore } from '@/store/useStore';

// Interfaces para ContactMessage
interface Branch {
  id: number;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
}

interface ContactMessage {
  id: number;
  name: string;
  lastname: string;
  phone: string;
  subject: string;
  message: string;
  branch?: Branch;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  admin_response?: string;
  responded_by?: User;
  full_name: string;
  status_display: string;
  created_at: string;
  updated_at: string;
  responded_at?: string;
}

interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// Interface para sucursales
interface BranchOption {
  id: string;
  name: string;
  code: string;
  address: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'maintenance';
}

// Interfaz para branch manager
interface BranchManager {
  id: string;
  user: string;
  branch: string;
  branch_name: string;
  management_level: string;
  is_active: boolean;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ContactMessage[];
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ContactPage = () => {
  const { user } = useStore();
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Estados para filtros
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'in_progress' | 'resolved'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para modal
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [selectedMessageText, setSelectedMessageText] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  
  // Estados para modal de respuesta
  const [responseModal, setResponseModal] = useState<{
    show: boolean;
    messageId: number | null;
    text: string;
    type: 'respond' | 'resolve';
  }>({ show: false, messageId: null, text: "", type: 'respond' });
  
  // Estado para alertas
  const [alertMessage, setAlertMessage] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }>({ show: false, type: 'info', message: '' });

  // Función para manejar el cambio de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchContactMessages(page);
  };

  // Función para manejar el cambio de filtro de sucursal
  const handleBranchFilterChange = (branchId: string) => {
    // Si es gerente de sucursal, no permitir cambios
    if (isBranchManager && userBranchId) {
      return;
    }
    setBranchFilter(branchId);
  };

  // Función para limpiar filtros
  const clearFilters = () => {
    // Si es gerente de sucursal, mantener su sucursal asignada
    if (!isBranchManager || !userBranchId) {
      setBranchFilter('ALL');
    }
    setStatusFilter('ALL');
    setSearchTerm('');
  };

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Estados para sucursales y control de roles
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);

  // Determinar si el usuario es gerente de sucursal
  const isBranchManager = user?.role === 'BRANCH_MANAGER' && userBranchId !== null;

  // Función para verificar si el usuario es gerente de sucursal
  const checkUserRole = async () => {
    if (user?.id) {
      try {
        // Verificar si el usuario tiene un perfil de gerente de sucursal
        const branchManagerResponse = await fetchApi<{count: number; next: string | null; previous: string | null; results: BranchManager[]}>(`/api/branch-managers/?user=${user.id}`);
        
        if (branchManagerResponse && branchManagerResponse.results && branchManagerResponse.results.length > 0) {
          const branchManager = branchManagerResponse.results[0];
          console.log('User confirmed as branch manager:', branchManager);
          setUserBranchId(branchManager.branch);
          setBranchFilter(branchManager.branch); // Auto-seleccionar la sucursal del gerente
          return true;
        } else {
          console.log('User is not a branch manager or no profile found');
          return false;
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        return false;
      }
    }
    return false;
  };

  // Cargar sucursales
  const fetchBranches = async () => {
    try {
      const response = await fetchApi<{count: number; next: string | null; previous: string | null; results: Branch[]}>('/api/branches/');
      if (response && response.results) {
        setBranches(response.results);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  // Cargar mensajes de contacto
  const fetchContactMessages = async (page?: number) => {
    try {
      setLoading(true);
      setError(null);

      let url = '/api/contact-messages/';
      const params = new URLSearchParams();

      if (page) {
        params.append('page', page.toString());
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }

      // Si es gerente de sucursal, no necesitamos filtrar por branch ya que el backend lo hace automáticamente
      if (branchFilter !== 'ALL' && !isBranchManager) {
        params.append('branch', branchFilter);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('Fetching contact messages from URL:', url);
      console.log('User role:', user?.role, 'IsBranchManager:', isBranchManager);

      const response = await fetchApi<ApiResponse>(url);
      console.log('Contact messages API response:', {
        count: response?.count,
        results: response?.results?.length,
        next: response?.next,
        previous: response?.previous
      });
      
      if (response) {
        setContactMessages(response.results);
        setTotalCount(response.count);
        
        // Calcular el total de páginas (asumiendo 10 items por página)
        const pageSize = 10;
        setTotalPages(Math.ceil(response.count / pageSize));
        
        // Si se especifica una página, actualizarla
        if (page) {
          setCurrentPage(page);
        }
      }
    } catch (err) {
      console.error('Error al cargar mensajes de contacto:', err);
      setError('Error al cargar los mensajes de contacto. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Función para mostrar el modal de respuesta
  const showResponseModal = (id: number, type: 'respond' | 'resolve') => {
    setResponseModal({
      show: true,
      messageId: id,
      text: "",
      type: type
    });
  };

  // Función para confirmar respuesta
  const confirmResponse = async () => {
    if (!responseModal.messageId || !responseModal.text.trim()) {
      setAlertMessage({
        show: true,
        type: 'error',
        message: 'La respuesta es requerida'
      });
      return;
    }
    
    try {
      const newStatus = responseModal.type === 'respond' ? 'IN_PROGRESS' : 'RESOLVED';
      
      // Optimistic UI update
      setContactMessages(prevMessages =>
        prevMessages.map(message => {
          if (message.id === responseModal.messageId) {
            return {
              ...message,
              status: newStatus,
              admin_response: responseModal.text,
              updated_at: new Date().toISOString(),
              responded_at: new Date().toISOString()
            };
          }
          return message;
        })
      );

      // Llamada a la API
      await fetchApi(`/api/contact-messages/${responseModal.messageId}/`, {
        method: 'PATCH',
        body: { 
          status: newStatus,
          admin_response: responseModal.text
        }
      });

      // Cerrar modal y mostrar mensaje de éxito
      setResponseModal({ show: false, messageId: null, text: "", type: 'respond' });
      setAlertMessage({
        show: true,
        type: 'success',
        message: responseModal.type === 'respond' ? 'Respuesta enviada correctamente' : 'Mensaje marcado como resuelto'
      });
    } catch (err) {
      console.error('Error al responder el mensaje:', err);
      fetchContactMessages();
      setAlertMessage({
        show: true,
        type: 'error',
        message: 'Error al procesar la respuesta'
      });
    }
  };



  // Cargar datos al montar el componente
  useEffect(() => {
    fetchContactMessages();
    fetchBranches();
    
    // Verificar el rol del usuario
    if (user?.id) {
      checkUserRole();
    }
  }, []);

  // Recargar mensajes cuando cambien los filtros
  useEffect(() => {
    if (!loading) { // Evitar llamadas múltiples durante la carga inicial
      fetchContactMessages(1);
      setCurrentPage(1);
    }
  }, [statusFilter, branchFilter, searchTerm, isBranchManager]);

  // Ocultar alerta después de 3 segundos
  useEffect(() => {
    if (alertMessage.show) {
      const timer = setTimeout(() => {
        setAlertMessage(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const handleReopen = async (id: number) => {
    try {
      // Optimistic UI update
      setContactMessages(prevMessages =>
        prevMessages.map(message => {
          if (message.id === id) {
            return {
              ...message,
              status: 'PENDING' as const,
              updated_at: new Date().toISOString()
            };
          }
          return message;
        })
      );

      // Llamada a la API
      await fetchApi(`/api/contact-messages/${id}/`, {
        method: 'PATCH',
        body: { status: 'PENDING' }
      });

      // Mostrar alerta de éxito
      setAlertMessage({
        show: true,
        type: 'success',
        message: 'Mensaje reabierto'
      });
    } catch (err) {
      console.error('Error al reabrir el mensaje:', err);
      fetchContactMessages();
      setAlertMessage({
        show: true,
        type: 'error',
        message: 'Error al reabrir el mensaje'
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      // Optimistic UI update
      setContactMessages(prevMessages =>
        prevMessages.filter(message => message.id !== id)
      );

      // Llamada a la API
      await fetchApi(`/api/contact-messages/${id}/`, {
        method: 'DELETE'
      });

      // Mostrar alerta de éxito
      setAlertMessage({
        show: true,
        type: 'success',
        message: 'Mensaje eliminado correctamente'
      });
    } catch (err) {
      console.error('Error al eliminar el mensaje:', err);
      fetchContactMessages();
      setAlertMessage({
        show: true,
        type: 'error',
        message: 'Error al eliminar el mensaje'
      });
    }
  };

  // Mostrar loading general
  if (loading && contactMessages.length === 0) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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
      {/* Mostrar alerta si es necesario */}
      {alertMessage.show && (
        <div className="mb-4">
          <Alert
            variant={alertMessage.type}
            title={alertMessage.type === 'success' ? 'Éxito' : 'Error'}
            message={alertMessage.message}
          />
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Mensajes de Contacto {contactMessages.length > 0 && `(${contactMessages.length})`}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Visualice y gestione todos los mensajes de contacto recibidos
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        {/* Filtro por estado */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'pending' | 'in_progress' | 'resolved')}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
        >
          <option value="ALL">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="in_progress">En Progreso</option>
          <option value="resolved">Resueltos</option>
        </select>

        {/* Filtro por sucursal - Solo mostrar si no es gerente de sucursal */}
        {!isBranchManager && (
          <select
            value={branchFilter}
            onChange={(e) => handleBranchFilterChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
          >
            <option value="ALL">Todas las sucursales</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name} ({branch.code})
              </option>
            ))}
          </select>
        )}

        {/* Campo de búsqueda */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Buscar por nombre, email o mensaje..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:placeholder-gray-500"
          />
        </div>

        {/* Botón para limpiar filtros */}
        <button
          onClick={clearFilters}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1200px]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    ID
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Nombre Completo
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Teléfono
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Asunto
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Sucursal
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Estado
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Mensaje
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Respuesta Admin
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Fecha de creación
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Última actualización
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {contactMessages.length > 0 ? (
                  contactMessages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
                          #{message.id}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {message.name} {message.lastname}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {message.phone}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <div className="max-w-[200px] truncate" title={message.subject}>
                          {message.subject}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {message.branch?.name || 'Sin sucursal'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          size="sm"
                          color={
                            message.status === 'PENDING' ? "warning" : 
                            message.status === 'IN_PROGRESS' ? "info" : "success"
                          }
                        >
                          {message.status === 'PENDING' ? "Pendiente" : 
                           message.status === 'IN_PROGRESS' ? "En Progreso" : "Resuelto"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 max-w-xs">
                        <div className="flex items-center">
                          <div className="truncate max-w-[200px]">
                            {message.message}
                          </div>
                          {message.message.length > 50 && (
                            <button
                              onClick={() => {
                                setSelectedMessage(message);
                                setSelectedMessageText(message.message);
                              }}
                              className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 max-w-xs">
                        {message.admin_response ? (
                          <div className="flex items-center">
                            <div className="truncate max-w-[200px]">
                              {message.admin_response}
                            </div>
                            {message.admin_response.length > 50 && (
                              <button
                                onClick={() => {
                                  setSelectedMessage(message);
                                  setSelectedMessageText(message.admin_response!);
                                }}
                                className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Sin respuesta</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {formatDate(message.created_at)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {formatDate(message.updated_at)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-2 flex-wrap">
                          {message.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => showResponseModal(message.id, 'respond')}
                                className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                              >
                                Responder
                              </button>
                              <button
                                onClick={() => showResponseModal(message.id, 'resolve')}
                                className="px-3 py-1 text-xs text-green-600 bg-green-100 rounded-md hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                              >
                                Resolver
                              </button>
                            </>
                          )}
                          {(message.status === 'IN_PROGRESS' || message.status === 'RESOLVED') && (
                            <button
                              onClick={() => handleReopen(message.id)}
                              className="px-3 py-1 text-xs text-yellow-600 bg-yellow-100 rounded-md hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                            >
                              Reabrir
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(message.id)}
                            className="px-3 py-1 text-xs text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                          >
                            Eliminar
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      {loading ? 'Cargando mensajes...' : 'No hay mensajes de contacto'}
                      {!loading && statusFilter !== 'ALL' && ` con estado ${
                        statusFilter === 'pending' ? 'pendiente' : 
                        statusFilter === 'in_progress' ? 'en progreso' : 'resuelto'
                      }`}
                      {!loading && branchFilter !== 'ALL' && !isBranchManager && ' en la sucursal seleccionada'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Modal para ver mensaje completo */}
            {selectedMessage && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Mensaje completo</h3>
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words">
                    {selectedMessageText}
                  </p>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedMessage(null);
                        setSelectedMessageText('');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal para responder/resolver */}
            {responseModal.show && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-2xl">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                    {responseModal.type === 'respond' ? 'Responder Mensaje' : 'Resolver Mensaje'}
                  </h3>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {responseModal.type === 'respond' ? 'Respuesta' : 'Comentario de resolución'}
                  </label>
                  <textarea
                    value={responseModal.text}
                    onChange={(e) => setResponseModal(prev => ({ ...prev, text: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    rows={5}
                    placeholder={
                      responseModal.type === 'respond' 
                        ? "Escriba su respuesta al cliente..." 
                        : "Explique cómo se resolvió el mensaje..."
                    }
                  />
                  <div className="mt-6 flex justify-end gap-2">
                    <button
                      onClick={() => setResponseModal({ show: false, messageId: null, text: "", type: 'respond' })}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmResponse}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      disabled={!responseModal.text.trim()}
                    >
                      {responseModal.type === 'respond' ? 'Enviar Respuesta' : 'Resolver'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-2 text-sm rounded-md ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
          
          <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
            Página {currentPage} de {totalPages} ({totalCount} mensajes)
          </span>
        </div>
      )}
    </div>
  );
};

export default ContactPage;