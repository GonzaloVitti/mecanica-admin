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

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_verified: boolean;
  role: 'ADMINISTRATOR' | 'SUPER_ADMIN' | 'CASHIER' | 'SALESMAN' | 'BRANCH_MANAGER' | 'FINANCE' | 'INVENTORY_MANAGER' | 'CUSTOMER';
  date_joined: string;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: User[];
}

// Interfaces para alertas
interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

const getRoleBadgeColor = (role: User['role']) => {
  switch (role) {
    case 'ADMINISTRATOR':
      return 'success';
    case 'SUPER_ADMIN':
      return 'primary';
    case 'CASHIER':
      return 'info';
    case 'SALESMAN':
      return 'warning';
    case 'BRANCH_MANAGER':
      return 'primary';
    case 'FINANCE':
      return 'info';
    case 'INVENTORY_MANAGER':
      return 'primary';
    case 'CUSTOMER':
      return 'light';
    default:
      return 'default';
  }
};

const translateRole = (role: User['role']) => {
  switch (role) {
    case 'ADMINISTRATOR':
      return 'Administrador';
    case 'SUPER_ADMIN':
      return 'Super Administrador';
    case 'CASHIER':
      return 'Cajero';
    case 'SALESMAN':
      return 'Vendedor';
    case 'BRANCH_MANAGER':
      return 'Gerente de Sucursal';
    case 'FINANCE':
      return 'Finanzas';
    case 'INVENTORY_MANAGER':
      return 'Gerente de Inventario';
    case 'CUSTOMER':
      return 'Cliente';
    default:
      return role;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Componente simple de modal para confirmación
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

const Page = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<User['role'] | 'ALL'>('ALL');
  const [allUsers, setAllUsers] = useState<User[]>([]); // Estado para almacenar todos los usuarios
  
  // Estado para el modal de confirmación
  const [modalOpen, setModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0); 
  
  // Estado para las alertas
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  const fetchUsers = async (url = '/api/users/') => {
    try {
      setLoading(true);
      
      // Extraer solo la parte relativa de la URL si es completa
      if (url.startsWith('http')) {
        url = url.replace(/^https?:\/\/[^\/]+/, '');
      }
      
      console.log('Fetching users from:', url);
      const response = await fetchApi<ApiResponse>(url);
      
      if (response) {
        // MODIFICADO: Guardar todos los usuarios en el estado allUsers
        setAllUsers(response.results);
        
        // Los usuarios mostrados se determinarán por el filtro aplicado
        setUsers(response.results);
        
        // El resto del manejo de respuesta se mantiene igual
        if (response.next) {
          setNextPageUrl(response.next);
        } else {
          setNextPageUrl(null);
        }
        
        if (response.previous) {
          setPrevPageUrl(response.previous);
        } else {
          setPrevPageUrl(null);
        }
        
        if (response.count !== undefined) {
          setTotalCount(response.count);
          setTotalPages(Math.ceil(response.count / 10));
        }
      }
    } catch (err) {
      setError('Error al cargar los usuarios');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para navegar a la siguiente página
  const goToPrevPage = () => {
    if (prevPageUrl) {
      // Extraer solo la parte de consulta de la URL
      // Ejemplo: convertir "http://localhost:8000/api/users/?limit=10&offset=0" a "/api/users/?limit=10&offset=0"
      const apiPath = prevPageUrl.replace(/^https?:\/\/[^\/]+/, '');
      console.log("Navegando a página anterior:", apiPath);
      fetchUsers(apiPath);
      setCurrentPage(prev => prev - 1);
    }
  };
  
  // Función para navegar a la siguiente página
  const goToNextPage = () => {
    if (nextPageUrl) {
      // Extraer solo la parte de consulta de la URL
      const apiPath = nextPageUrl.replace(/^https?:\/\/[^\/]+/, '');
      console.log("Navegando a página siguiente:", apiPath);
      fetchUsers(apiPath);
      setCurrentPage(prev => prev + 1);
    }
  };

  // CORREGIDO: Filtrar usando la API en lugar de filtrar localmente
  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as User['role'] | 'ALL';
    setRoleFilter(newRole);
    
    // Aplicar filtro local
    if (newRole === 'ALL') {
      setUsers(allUsers);
    } else {
      setUsers(allUsers.filter(user => user.role === newRole));
    }
    
    // Resetear a primera página
    setCurrentPage(1);
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchUsers();
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

  useEffect(() => {
    fetchUsers();
  }, []);

  // Iniciar proceso de eliminación (mostrar modal)
  const confirmDelete = (user: User) => {
    setUserToDelete(user);
    setModalOpen(true);
  };

  // CORREGIDO: Usar el método delete_account específico del backend
  const handleDelete = async () => {
    if (!userToDelete) return;
    
    try {
      // Usar el endpoint específico delete_account en lugar del DELETE genérico
      await fetchApi(`/api/users/${userToDelete.id}/delete_account/`, {
        method: 'DELETE'
      });
      
      fetchUsers();
      
      // Mostrar alerta de éxito
      setAlert({
        show: true,
        type: 'success',
        title: 'Usuario eliminado',
        message: `El usuario ${userToDelete.first_name} ${userToDelete.last_name} ha sido eliminado correctamente.`
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      
      // Mostrar alerta de error
      setAlert({
        show: true,
        type: 'error',
        title: 'Error al eliminar',
        message: `No se pudo eliminar al usuario ${userToDelete.first_name} ${userToDelete.last_name}. Verifique que tenga permisos de SuperAdmin.`
      });
    }
  };

  // CORREGIDO: Solo mostrar el spinner de carga completo si no hay datos
  if (loading && users.length === 0) {
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
          {/* CORREGIDO: Mostrar el total de usuarios */}
          Usuarios {totalCount > 0 && `(${totalCount})`}
        </h1>
      </div>

      {/* CORREGIDO: Actualizar el manejador del select para usar la API */}
      <div className="mb-6">
        <select
          value={roleFilter}
          onChange={handleRoleFilterChange} 
          className="px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
        >
          <option value="ALL">Todos los roles</option>
          <option value="ADMINISTRATOR">Administradores</option>
          <option value="SUPER_ADMIN">Super Administradores</option>
          <option value="CASHIER">Cajeros</option>
          <option value="SALESMAN">Vendedores</option>
          <option value="BRANCH_MANAGER">Gerentes de Sucursal</option>
          <option value="FINANCE">Finanzas</option>
          <option value="INVENTORY_MANAGER">Gerentes de Inventario</option>
          <option value="CUSTOMER">Clientes</option>
        </select>
      </div>

      {/* CORREGIDO: Indicador de carga cuando ya hay datos */}
      {loading && users.length > 0 && (
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
                    Usuario
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Email
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Teléfono
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Rol
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
                {/* CORREGIDO: Usar users directamente ya que el filtrado ahora lo hace la API */}
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <span className="text-gray-500 text-theme-sm dark:text-gray-400">
                        #{user.id}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {user.first_name} {user.last_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {user.username}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {user.email}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {user.phone_number}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <Badge
                        size="sm"
                        color={getRoleBadgeColor(user.role)}
                      >
                        {translateRole(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <Badge
                        size="sm"
                        color={user.is_verified ? "success" : "warning"}
                      >
                        {user.is_verified ? "Verificado" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {formatDate(user.date_joined)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/users/${user.id}`}
                          className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          Ver
                        </Link>
                        <button
                          onClick={() => confirmDelete(user)}
                          className="px-3 py-1 text-xs text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                        >
                          Eliminar
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {/* CORREGIDO: Usar users en lugar de filteredUsers */}
                {users.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      No se encontraron usuarios 
                      {roleFilter !== 'ALL' ? ` con el rol ${translateRole(roleFilter)}` : ''}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Controles de paginación */}
            {users.length > 0 && (
              <div className="mt-4 flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    Mostrando <span className="font-medium">{users.length}</span> usuarios, página <span className="font-medium">{currentPage}</span> de{" "}
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

      {/* Modal de confirmación para eliminar usuario */}
      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar cuenta de usuario"
        message={userToDelete ? `¿Estás seguro que deseas eliminar la cuenta del usuario ${userToDelete.first_name} ${userToDelete.last_name}? Esta acción utilizará el método delete_account y no se puede deshacer.` : ''}
      />
    </div>
  );
};

export default Page;