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
import { useStore } from '@/store/useStore';

// Interfaces para el modelo de Invoice
interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: 'SALE' | 'PURCHASE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  sale: {
    id: string;
    sale_number: string;
    customer_display_name?: string;
  } | null;
  purchase_order: {
    id: string;
    order_number: string;
  } | null;
  customer: {
    id: string;
    name: string;
    email: string;
  } | null;
  supplier: {
    id: string;
    name: string;
    email: string;
  } | null;
  branch: {
    id: string;
    name: string;
  };
  branch_name: string;
  created_by: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  invoice_date: string;
  due_date: string | null;
  subtotal: string;
  tax_amount: string;
  total: string;
  notes: string;
  electronic_signature: string;
  created_at: string;
  updated_at: string;
}

// Interfaces para gerentes de sucursal y cajeros
interface BranchManager {
  id: string;
  user: string;
  branch: string;
  branch_name: string;
  management_level: string;
  is_active: boolean;
}

interface Cashier {
  id: string;
  user: string;
  branch: string;
  branch_name: string;
  register_number: string;
  is_active: boolean;
}

interface Salesman {
  id: string;
  user: string;
  branch: string;
  branch_name: string;
  sales_target: string;
  commission_rate: string;
  is_active: boolean;
}

// Respuesta paginada de la API
interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Invoice[];
}

// Interfaces para alertas
interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// Componente modal para confirmación de eliminación
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

  // Efectos para manejo del modal
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
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 dark:bg-red-600 dark:border-red-600 dark:hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

const InvoicesPage = () => {
  const { user } = useStore();
  const isBranchManager = user?.role === 'BRANCH_MANAGER';
  const isCashier = user?.role === 'CASHIER';
  const isSalesman = user?.role === 'SALESMAN';

  // Estados para manejo de usuario y sucursales
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([]);

  // Función para verificar permisos basados en roles
  const hasPermission = (action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    if (!user) return false;
    
    // Super admin tiene todos los permisos
    if (user.is_superuser || user.role === 'SUPER_ADMIN') {
      return true;
    }
    
    if (!user.role) {
      return false;
    }
    
    switch (action) {
      case 'view':
        return ['ADMINISTRATOR', 'SUPER_ADMIN', 'CASHIER', 'BRANCH_MANAGER', 'FINANCE', 'SALESMAN'].includes(user.role);
      case 'create':
        return ['ADMINISTRATOR', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(user.role);
      case 'edit':
        return ['ADMINISTRATOR', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(user.role);
      case 'delete':
        return ['ADMINISTRATOR', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(user.role);
      default:
        return false;
    }
  };

  // Debug: Loguear información del usuario y permisos
  useEffect(() => {
    if (user) {
      console.log('👤 Usuario actual:', {
        id: user.id,
        username: user.username,
        role: user.role,
        is_superuser: user.is_superuser,
        isBranchManager,
        isCashier,
        isSalesman,
        userBranchId,
        permisos: {
          view: hasPermission('view'),
          create: hasPermission('create'),
          edit: hasPermission('edit'),
          delete: hasPermission('delete')
        }
      });
    }
  }, [user, userBranchId, isBranchManager, isCashier, isSalesman]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);

  // Estado para el modal de confirmación
  const [modalOpen, setModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // Estado para filtrado
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SALE' | 'PURCHASE' | 'CREDIT_NOTE' | 'DEBIT_NOTE'>('ALL');
  const [autoGeneratedFilter, setAutoGeneratedFilter] = useState<'ALL' | 'AUTO' | 'MANUAL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para las alertas
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Función para obtener información del usuario y su sucursal
  const fetchUserBranchInfo = async () => {
    if (!user?.id || (!isBranchManager && !isCashier && !isSalesman)) return;
    
    try {
      let endpoint = '';
      if (isBranchManager) {
        endpoint = `/api/branch-managers/?user=${user.id}`;
      } else if (isCashier) {
        endpoint = `/api/cashiers/?user=${user.id}`;
      } else if (isSalesman) {
        endpoint = `/api/salesmen/?user=${user.id}`;
      }
      
      const response = await fetchApi<{results: (BranchManager | Cashier | Salesman)[]}>(endpoint);
      if (response?.results && response.results.length > 0) {
        const userInfo = response.results[0];
        setUserBranchId(userInfo.branch);
        setSelectedBranch(userInfo.branch);
        console.log('✅ Información de sucursal cargada:', userInfo.branch);
      }
    } catch (error) {
      console.error('❌ Error al cargar información de sucursal:', error);
    }
  };

  // Función para obtener todas las sucursales
  const fetchBranches = async () => {
    try {
      const response = await fetchApi<{results: {id: string, name: string}[]}>('/api/branches/');
      if (response?.results) {
        setBranches(response.results);
      }
    } catch (error) {
      console.error('❌ Error al cargar sucursales:', error);
    }
  };

  // Función para manejar cambio de sucursal
  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
  };

  // Función para filtrar facturas según criterios seleccionados
  const getFilteredInvoices = () => {
    return invoices.filter(invoice => {
      // Filtrar por sucursal
      if (selectedBranch !== 'all') {
        if (invoice.branch.id !== selectedBranch) return false;
      }

      // Filtrar por estado
      if (statusFilter !== 'ALL') {
        if (invoice.status !== statusFilter) return false;
      }

      // Filtrar por tipo
      if (typeFilter !== 'ALL') {
        if (invoice.invoice_type !== typeFilter) return false;
      }

      // Filtrar por generación automática
      if (autoGeneratedFilter !== 'ALL') {
        const isAutoGenerated = invoice.notes && invoice.notes.includes('generada automáticamente');
        if (autoGeneratedFilter === 'AUTO' && !isAutoGenerated) return false;
        if (autoGeneratedFilter === 'MANUAL' && isAutoGenerated) return false;
      }

      // Filtrar por término de búsqueda
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        return (
          invoice.invoice_number.toLowerCase().includes(searchLower) ||
          (invoice.customer?.name && invoice.customer.name.toLowerCase().includes(searchLower)) ||
          (invoice.supplier?.name && invoice.supplier.name.toLowerCase().includes(searchLower)) ||
          (invoice.sale?.customer_display_name && invoice.sale.customer_display_name.toLowerCase().includes(searchLower)) ||
          (invoice.branch_name && invoice.branch_name.toLowerCase().includes(searchLower)) ||
          (invoice.notes && invoice.notes.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  };

  // Facturas filtradas según los criterios
  const filteredInvoices = getFilteredInvoices();

  // Funciones de navegación para paginación
  const goToNextPage = () => {
    if (nextPageUrl) {
      const apiPath = nextPageUrl.replace(/^https?:\/\/[^\/]+/, '');
      fetchInvoices(apiPath);
    }
  };

  const goToPrevPage = () => {
    if (prevPageUrl) {
      const apiPath = prevPageUrl.replace(/^https?:\/\/[^\/]+/, '');
      fetchInvoices(apiPath);
    }
  };

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



  // Cargar facturas desde la API
  const fetchInvoices = async (url: string = '/api/invoices/') => {
    setLoading(true);
    setError(null);

    try {
      // Normalizar URL si es completa (con dominio)
      if (url.startsWith('http')) {
        url = url.replace(/^https?:\/\/[^\/]+/, '');
      }

      let apiUrl = url;
      
      // Si es gerente de sucursal, cajero o vendedor, filtrar por su sucursal
      if ((isBranchManager || isCashier || isSalesman) && userBranchId) {
        const separator = apiUrl.includes('?') ? '&' : '?';
        apiUrl = `${apiUrl}${separator}branch=${userBranchId}`;
        console.log('🔒 Filtrando facturas por sucursal:', userBranchId, 'URL:', apiUrl);
      } else if (selectedBranch !== 'all') {
        const separator = apiUrl.includes('?') ? '&' : '?';
        apiUrl = `${apiUrl}${separator}branch=${selectedBranch}`;
        console.log('🔍 Filtrando facturas por sucursal seleccionada:', selectedBranch, 'URL:', apiUrl);
      } else {
        console.log('🌐 Sin filtro de sucursal - userBranchId:', userBranchId, 'selectedBranch:', selectedBranch);
      }

      const response = await fetchApi<ApiResponse>(apiUrl);

      if (response && response.results) {
        // Ordenar facturas por fecha de creación (más reciente primero)
        const sortedInvoices = [...response.results].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setInvoices(sortedInvoices);

        // Actualizar información de paginación
        setNextPageUrl(response.next);
        setPrevPageUrl(response.previous);

        if (response.count !== undefined) {
          setTotalCount(response.count);
          setTotalPages(Math.ceil(response.count / 10));
        }

        // Determinar la página actual basada en la URL
        if (url.includes('offset=')) {
          const match = url.match(/offset=(\d+)/);
          if (match) {
            const offset = parseInt(match[1], 10);
            setCurrentPage(Math.floor(offset / 10) + 1);
          }
        } else {
          setCurrentPage(1);
        }
      } else {
        throw new Error('No se pudo cargar las facturas');
      }
    } catch (err) {
      console.error('Error al cargar facturas:', err);
      setError('Error al cargar las facturas. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar información inicial al montar el componente
  useEffect(() => {
    const loadData = async () => {
      await fetchUserBranchInfo();
      await fetchBranches();
      fetchInvoices();
    };
    
    if (user) {
      loadData();
    }
  }, [user, isBranchManager, isCashier, isSalesman]);

  // Cargar facturas cuando cambia la información de la sucursal
  useEffect(() => {
    if (userBranchId || (!isBranchManager && !isCashier && !isSalesman)) {
      fetchInvoices();
    }
  }, [userBranchId, selectedBranch]);

  // Función para confirmar la eliminación de una factura
  const confirmDelete = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setModalOpen(true);
  };

  // Función para eliminar una factura
  const handleDelete = async () => {
    if (!invoiceToDelete) return;

    // Verificar permisos antes de eliminar
    if (!hasPermission('delete')) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Sin permisos',
        message: 'No tienes permisos para eliminar facturas'
      });
      setModalOpen(false);
      setInvoiceToDelete(null);
      return;
    }

    try {
      // Llamar a la API para eliminar la factura
      await fetchApi(`/api/invoices/${invoiceToDelete.id}/`, {
        method: 'DELETE'
      });

      // Actualizar el estado local eliminando la factura
      setInvoices(prevInvoices => prevInvoices.filter(i => i.id !== invoiceToDelete.id));

      // Mostrar alerta de éxito
      setAlert({
        show: true,
        type: 'success',
        title: 'Factura eliminada',
        message: `La factura "${invoiceToDelete.invoice_number}" ha sido eliminada correctamente`
      });
    } catch (err) {
      console.error('Error al eliminar la factura:', err);
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudo eliminar la factura'
      });
    } finally {
      setModalOpen(false);
      setInvoiceToDelete(null);
    }
  };

  // Función para limpiar filtros
  const clearFilters = () => {
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setAutoGeneratedFilter('ALL');
    setSearchTerm('');
    
    // Solo limpiar filtro de sucursal si no es gerente, cajero o vendedor
    if (!isBranchManager && !isCashier && !isSalesman) {
      setSelectedBranch('all');
    }
  };

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Función para formatear moneda
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(parseFloat(amount));
  };

  // Función para obtener el color del badge según el estado
  const getStatusBadgeColor = (status: Invoice['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
        return 'error';
      case 'CANCELLED':
        return 'error';
      case 'DRAFT':
      default:
        return 'light';
    }
  };

  // Función para obtener el color del badge según el tipo
  const getTypeBadgeColor = (type: Invoice['invoice_type']) => {
    switch (type) {
      case 'SALE':
        return 'success';
      case 'PURCHASE':
        return 'primary';
      case 'CREDIT_NOTE':
        return 'warning';
      case 'DEBIT_NOTE':
        return 'info';
      default:
        return 'light';
    }
  };

  // Función para obtener el texto del estado
  const getStatusText = (status: Invoice['status']) => {
    switch (status) {
      case 'DRAFT':
        return 'Borrador';
      case 'PENDING':
        return 'Pendiente';
      case 'APPROVED':
        return 'Aprobada';
      case 'REJECTED':
        return 'Rechazada';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  };

  // Función para obtener el texto del tipo
  const getTypeText = (type: Invoice['invoice_type']) => {
    switch (type) {
      case 'SALE':
        return 'Venta';
      case 'PURCHASE':
        return 'Compra';
      case 'CREDIT_NOTE':
        return 'Nota de Crédito';
      case 'DEBIT_NOTE':
        return 'Nota de Débito';
      default:
        return type;
    }
  };

  // Mostrar loading
  if (loading) {
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
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Facturas {totalCount > 0 && `(${totalCount})`}
          </h1>
          {/* Indicador de filtrado por sucursal */}
          {(isBranchManager || isCashier || isSalesman) && userBranchId && (
            <div className="mt-2 flex items-center text-sm text-blue-600 dark:text-blue-400">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>{isBranchManager ? 'Gerente de Sucursal' : isCashier ? 'Cajero' : 'Vendedor'} - Mostrando solo facturas de tu sucursal</span>
            </div>
          )}
        </div>

      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        {/* Búsqueda */}
        <div className="flex-1 min-w-[250px]">
          <input
            type="text"
            placeholder="Buscar por número de factura, cliente, proveedor, sucursal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
          />
        </div>

        {/* Filtro por estado */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED')}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
        >
          <option value="ALL">Todos los estados</option>
          <option value="DRAFT">Borrador</option>
          <option value="PENDING">Pendiente</option>
          <option value="APPROVED">Aprobada</option>
          <option value="REJECTED">Rechazada</option>
          <option value="CANCELLED">Cancelada</option>
        </select>

        {/* Filtro por tipo */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'SALE' | 'PURCHASE' | 'CREDIT_NOTE' | 'DEBIT_NOTE')}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
        >
          <option value="ALL">Todos los tipos</option>
          <option value="SALE">Venta</option>
          <option value="PURCHASE">Compra</option>
          <option value="CREDIT_NOTE">Nota de Crédito</option>
          <option value="DEBIT_NOTE">Nota de Débito</option>
        </select>

        {/* Filtro por generación automática */}
        <select
          value={autoGeneratedFilter}
          onChange={(e) => setAutoGeneratedFilter(e.target.value as 'ALL' | 'AUTO' | 'MANUAL')}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
        >
          <option value="ALL">Todas las facturas</option>
          <option value="AUTO">Generadas automáticamente</option>
          <option value="MANUAL">Creadas manualmente</option>
        </select>

        {/* Filtro por sucursal */}
        {isBranchManager || isCashier || isSalesman ? (
          <div className="px-4 py-2 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isBranchManager ? 'Gerente' : isCashier ? 'Cajero' : 'Vendedor'}: {branches.find(b => b.id === userBranchId)?.name || 'Cargando...'}
            </span>
          </div>
        ) : (
          <select
            value={selectedBranch}
            onChange={(e) => handleBranchChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
          >
            <option value="all">Todas las sucursales</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        )}

        {/* Botón para limpiar filtros */}
        {(!isBranchManager && !isCashier && !isSalesman) || (statusFilter !== 'ALL' || typeFilter !== 'ALL' || autoGeneratedFilter !== 'ALL' || searchTerm) ? (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Limpiar Filtros
          </button>
        ) : null}

        {/* Contador de facturas filtradas */}
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Mostrando {filteredInvoices.length} facturas
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1200px]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Número
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Tipo
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Estado
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Cliente/Proveedor
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Sucursal
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Fecha
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Total
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      No se encontraron facturas con los filtros seleccionados
                      {(isBranchManager || isCashier || isSalesman) && (
                        <span className="block mt-1 text-xs">
                          Sucursal: {branches.find(b => b.id === userBranchId)?.name || 'Cargando...'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {invoice.invoice_number}
                            </span>
                            {/* Indicador de factura automática */}
                            {invoice.notes && invoice.notes.includes('generada automáticamente') && (
                              <Badge color="success" size="sm">
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Auto
                                </span>
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            #{invoice.id.slice(0, 8)}
                          </span>
                          {/* Mostrar información de la venta asociada */}
                          {invoice.sale && (
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              Venta: {invoice.sale.sale_number}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          color={getTypeBadgeColor(invoice.invoice_type)}
                          size="sm"
                        >
                          {getTypeText(invoice.invoice_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          color={getStatusBadgeColor(invoice.status)}
                          size="sm"
                        >
                          {getStatusText(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {invoice.customer?.name || invoice.supplier?.name || invoice.sale?.customer_display_name || 'N/A'}
                          </span>
                          {(invoice.customer?.email || invoice.supplier?.email) && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {invoice.customer?.email || invoice.supplier?.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          color="primary"
                          size="sm"
                        >
                          {invoice.branch_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {formatDate(invoice.invoice_date)}
                          </span>
                          {invoice.due_date && (
                            <span className="text-xs text-gray-400">
                              Vence: {formatDate(invoice.due_date)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(invoice.total)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            IVA: {formatCurrency(invoice.tax_amount)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/invoices/${invoice.id}/`}
                            className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                          >
                            Ver
                          </Link>

                          {/* Solo mostrar botón eliminar si el usuario tiene permisos */}
                          {hasPermission('delete') && (
                            <button
                              onClick={() => confirmDelete(invoice)}
                              className="px-3 py-1 text-xs text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={goToPrevPage}
              disabled={!prevPageUrl}
              className={`px-4 py-2 border rounded-md ${prevPageUrl
                ? 'text-gray-800 border-gray-300 hover:bg-gray-100 dark:text-white dark:border-gray-600 dark:hover:bg-gray-800'
                : 'text-gray-400 border-gray-200 cursor-not-allowed dark:text-gray-600 dark:border-gray-700'
                }`}
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={!nextPageUrl}
              className={`px-4 py-2 border rounded-md ${nextPageUrl
                ? 'text-gray-800 border-gray-300 hover:bg-gray-100 dark:text-white dark:border-gray-600 dark:hover:bg-gray-800'
                : 'text-gray-400 border-gray-200 cursor-not-allowed dark:text-gray-600 dark:border-gray-700'
                }`}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      {modalOpen && invoiceToDelete && (
        <ConfirmModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleDelete}
          title="Eliminar factura"
          message={`¿Estás seguro de que deseas eliminar la factura "${invoiceToDelete.invoice_number}"? Esta acción no se puede deshacer.`}
        />
        )}
    </div>
  );
};

export default InvoicesPage;
