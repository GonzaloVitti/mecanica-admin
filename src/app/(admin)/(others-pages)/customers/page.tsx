'use client'
import React, { useEffect, useState, useRef, useMemo } from 'react';
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
import { useStore } from '@/store/useStore';

// Interfaz para el usuario anidado dentro del cliente
interface UserData {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_verified: boolean;
  role: 'CUSTOMER' | 'MECHANIC' | 'SUPER_ADMIN';
  date_joined: string;
  is_active: boolean;
  profile_picture?: string;
}

// Interfaz para el cliente
interface Customer {
  id: string;
  user: UserData | null;
  name: string;
  tax_id: string;
  email: string;
  phone: string;
  address: string;
  is_active: boolean;
  has_user_account: boolean;
  created_at: string;
  updated_at: string;
}

// Respuesta paginada de la API
type UsersApiResponse = UserData[];

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
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente para mostrar el avatar del cliente
const CustomerAvatar = ({ customer }: { customer: Customer }) => {
  const src = React.useMemo(() => {
    const url = customer.user?.profile_picture || ''
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
    const path = url.startsWith('/') ? url : `/${url}`
    return `${base}${path}`
  }, [customer.user?.profile_picture])
  if (src) {
    return (
      <img
        src={src}
        alt={customer.name}
        className="w-10 h-10 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
      <span className="text-white font-semibold text-sm">
        {customer.name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
};

const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { user } = useStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';


  // Función para cargar los clientes
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetchApi<UsersApiResponse>('/api/users/customers/');
      
      if (response) {
        const mapped = response.map((u) => ({
          id: String(u.id),
          user: u,
          name: `${u.first_name} ${u.last_name}`.trim() || u.email,
          tax_id: '',
          email: u.email,
          phone: u.phone_number,
          address: '',
          is_active: u.is_active,
          has_user_account: true,
          created_at: u.date_joined,
          updated_at: u.date_joined,
        }));

        setCustomers(mapped);
        setTotalCount(mapped.length);
        setNextPageUrl(null);
        setPrevPageUrl(null);
        const pageSize = 10;
        setTotalPages(Math.ceil(mapped.length / pageSize) || 1);
        setCurrentPage(1);
      }
    } catch (error) {
      setError('Error al cargar los clientes');
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para ir a la página anterior
  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  // Función para ir a la página siguiente
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  // Función para ir a una página específica
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Función para formatear la fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Actualizar totalPages cuando cambian el término de búsqueda o los clientes
  useEffect(() => {
    const pageSize = 10;
    const filteredLen = customers.filter(c => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      const name = (c.name || '').toLowerCase();
      const email = (c.email || c.user?.email || '').toLowerCase();
      const phone = (c.phone || c.user?.phone_number || '').toLowerCase();
      const tax = (c.tax_id || '').toLowerCase();
      return (
        name.includes(term) ||
        email.includes(term) ||
        phone.includes(term) ||
        tax.includes(term)
      );
    }).length;
    setTotalPages(Math.max(1, Math.ceil(filteredLen / pageSize)));
    setCurrentPage(1);
  }, [searchTerm, customers]);

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

  // Iniciar proceso de eliminación (mostrar modal)
  const confirmDelete = (customer: Customer) => {
    setCustomerToDelete(customer);
    setModalOpen(true);
  };

  // Búsqueda local
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const pageSize = 10;
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(c => {
      const name = (c.name || '').toLowerCase();
      const email = (c.email || c.user?.email || '').toLowerCase();
      const phone = (c.phone || c.user?.phone_number || '').toLowerCase();
      const tax = (c.tax_id || '').toLowerCase();
      return (
        name.includes(term) ||
        email.includes(term) ||
        phone.includes(term) ||
        tax.includes(term)
      );
    });
  }, [customers, searchTerm]);

  // Función para eliminar cliente
  const handleDelete = async () => {
    if (!customerToDelete) return;
    
    try {
      if (customerToDelete.user?.id) {
        await fetchApi(`/api/users/${customerToDelete.user.id}/delete_account/`, {
          method: 'DELETE'
        });

        fetchCustomers();
        
        setAlert({
          show: true,
          type: 'success',
          title: 'Usuario eliminado',
          message: `El cliente ${customerToDelete.name} y su cuenta de usuario han sido eliminados correctamente.`
        });
      } else {
        setAlert({
          show: true,
          type: 'error',
          title: 'Operación no disponible',
          message: `No se puede eliminar clientes sin cuenta mientras el backend de clientes no esté disponible.`
        });
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      
      setAlert({
        show: true,
        type: 'error',
        title: 'Error al eliminar',
        message: `No se pudo eliminar al cliente ${customerToDelete.name}. Verifique que tenga permisos de SuperAdmin.`
      });
    } finally {
      setModalOpen(false);
      setCustomerToDelete(null);
    }
  };

  if (loading && customers.length === 0) {
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
          Clientes {totalCount > 0 && `(${totalCount})`}
        </h1>
        {isSuperAdmin && (
          <Link
            href="/customers/add"
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
            Agregar Cliente
          </Link>
        )}
      </div>

      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, email, teléfono o CUIT/DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <button type="submit" className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md bg-white hover:bg-gray-50 dark:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800">
            Buscar
          </button>
        </form>
      </div>

      {/* Indicador de carga cuando ya hay datos */}
      {loading && customers.length > 0 && (
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
                    Cliente
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Email
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Teléfono
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    CUIT/DNI
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
                {filteredCustomers.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize).map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <span className="text-gray-500 text-theme-sm dark:text-gray-400">
                        #{customer.id.slice(0, 8)}...
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <CustomerAvatar customer={customer} />
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {customer.name}
                          </span>
                          {customer.user && (
                            <span className="text-xs text-gray-500">
                              {customer.user.first_name} {customer.user.last_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {customer.email || customer.user?.email || 'N/A'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {customer.phone || customer.user?.phone_number || 'N/A'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {customer.tax_id || 'N/A'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <Badge
                        size="sm"
                        color={customer.is_active ? "success" : "warning"}
                      >
                        {customer.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {formatDate(customer.created_at)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/customers/${customer.user?.id ?? customer.id}`}
                          className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          Ver
                        </Link>
                        
                        <button
                          onClick={() => confirmDelete(customer)}
                          className="px-3 py-1 text-xs text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                        >
                          Eliminar
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredCustomers.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      No se encontraron clientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Controles de paginación */}
            {filteredCustomers.length > 0 && (
              <div className="mt-4 flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    Mostrando <span className="font-medium">{Math.min(pageSize, Math.max(0, filteredCustomers.length - (currentPage - 1) * pageSize))}</span> clientes, página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage <= 1}
                    className={`px-3 py-1 rounded ${
                      currentPage <= 1 
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500" 
                        : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                    }`}
                  >
                    Anterior
                  </button>
                  
                  <button
                    onClick={goToNextPage}
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
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setCustomerToDelete(null);
        }}
        onConfirm={handleDelete}
        title={customerToDelete?.has_user_account ? "Eliminar cliente y cuenta de usuario" : "Confirmar eliminación"}
        message={
          customerToDelete?.has_user_account
            ? `¿Está seguro de que desea eliminar completamente al cliente "${customerToDelete?.name}" y su cuenta de usuario?. Esta acción no se puede deshacer.`
            : `¿Está seguro de que desea eliminar al cliente "${customerToDelete?.name}"? Esta acción no se puede deshacer.`
        }
      />
    </div>
  );
};

export default CustomersPage;
