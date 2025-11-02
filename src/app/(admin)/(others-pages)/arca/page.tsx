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
import Button from '@/components/ui/button/Button';
import Link from 'next/link';
import { fetchApi } from '@/app/lib/data';
import Alert from '@/components/ui/alert/Alert';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';

// Interfaces para el modelo de Factura AFIP
interface AFIPInvoice {
  id: string;
  numero_comprobante: string | null;
  tipo_comprobante: string;
  punto_venta: string;
  fecha_comprobante: string;
  fecha_vencimiento: string | null;
  documento_tipo: string;
  documento_numero: string;
  razon_social: string;
  domicilio: string;
  condicion_iva: string;
  importe_neto: string;
  importe_iva: string;
  importe_total: string;
  estado: 'BORRADOR' | 'PENDIENTE' | 'AUTORIZADA' | 'RECHAZADA' | 'ANULADA';
  cae: string | null;
  fecha_vencimiento_cae: string | null;
  observaciones: string;
  branch: {
    id: string;
    name: string;
  };
  afip_config: {
    id: string;
    cuit: string;
    punto_venta: string;
  };
  created_at: string;
  updated_at: string;
}

interface AFIPInvoiceItem {
  id: string;
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
  importe_neto: string;
  importe_iva: string;
  importe_total: string;
  alicuota_iva: string;
  product: {
    id: string;
    name: string;
  } | null;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AFIPInvoice[];
}

interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// Modal de confirmación
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {message}
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={onConfirm}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AFIPInvoicesPage = () => {
  const [invoices, setInvoices] = useState<AFIPInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const itemsPerPage = 10;
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Función para obtener facturas AFIP
  const fetchInvoices = async (page = 1, search = '', status = '', type = '') => {
    try {
      setLoading(true);
      const offset = (page - 1) * itemsPerPage;
      let url = `/api/afip-invoices/?limit=${itemsPerPage}&offset=${offset}`;
      
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (status) url += `&estado=${encodeURIComponent(status)}`;
      if (type) url += `&tipo_comprobante=${encodeURIComponent(type)}`;

      const response = await fetchApi<ApiResponse>(url);
      
      if (response) {
        setInvoices(response.results);
        setTotalCount(response.count);
        setTotalPages(Math.ceil(response.count / itemsPerPage));
      } else {
        throw new Error('Error al cargar las facturas AFIP');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      showAlert('error', 'Error', 'No se pudieron cargar las facturas AFIP');
    } finally {
      setLoading(false);
    }
  };

  // Función para mostrar alertas
  const showAlert = (type: AlertState['type'], title: string, message: string) => {
    setAlert({ show: true, type, title, message });
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Función para autorizar factura
  const authorizeInvoice = async (invoiceId: string) => {
    try {
      const response = await fetchApi(`/api/afip-invoices/${invoiceId}/authorize/`, {
        method: 'POST',
      });

      if (response !== null) {
        showAlert('success', 'Éxito', 'Factura autorizada correctamente');
        fetchInvoices(currentPage, searchTerm, statusFilter, typeFilter);
      } else {
        throw new Error('Error al autorizar la factura');
      }
    } catch (err) {
      showAlert('error', 'Error', 'No se pudo autorizar la factura');
    }
  };

  // Función para anular factura
  const cancelInvoice = async (invoiceId: string) => {
    try {
      const response = await fetchApi(`/api/afip-invoices/${invoiceId}/cancel/`, {
        method: 'POST',
      });

      if (response !== null) {
        showAlert('success', 'Éxito', 'Factura anulada correctamente');
        fetchInvoices(currentPage, searchTerm, statusFilter, typeFilter);
      } else {
        throw new Error('Error al anular la factura');
      }
    } catch (err) {
      showAlert('error', 'Error', 'No se pudo anular la factura');
    }
  };

  // Función para eliminar factura
  const deleteInvoice = async (invoiceId: string) => {
    try {
      const response = await fetchApi(`/api/afip-invoices/${invoiceId}/`, {
        method: 'DELETE',
      });

      if (response !== null) {
        showAlert('success', 'Éxito', 'Factura eliminada correctamente');
        fetchInvoices(currentPage, searchTerm, statusFilter, typeFilter);
      } else {
        throw new Error('Error al eliminar la factura');
      }
    } catch (err) {
      showAlert('error', 'Error', 'No se pudo eliminar la factura');
    }
  };

  // Manejo de búsqueda con debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchInvoices(1, value, statusFilter, typeFilter);
    }, 500);
  };

  // Manejo de filtros
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setStatusFilter(value);
    setCurrentPage(1);
    fetchInvoices(1, searchTerm, value, typeFilter);
  };

  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTypeFilter(value);
    setCurrentPage(1);
    fetchInvoices(1, searchTerm, statusFilter, value);
  };

  // Función para obtener el color del badge según el estado
  const getStatusBadgeColor = (status: string): "success" | "error" | "warning" | "info" | "light" => {
    switch (status) {
      case 'AUTORIZADA':
        return 'success';
      case 'RECHAZADA':
      case 'ANULADA':
        return 'error';
      case 'PENDIENTE':
        return 'warning';
      case 'BORRADOR':
        return 'info';
      default:
        return 'light';
    }
  };

  // Función para obtener el texto del estado
  const getStatusText = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'BORRADOR': 'Borrador',
      'PENDIENTE': 'Pendiente',
      'AUTORIZADA': 'Autorizada',
      'RECHAZADA': 'Rechazada',
      'ANULADA': 'Anulada'
    };
    return statusMap[status] || status;
  };

  // Función para obtener el texto del tipo de comprobante
  const getInvoiceTypeText = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'FA': 'Factura A',
      'FB': 'Factura B',
      'FC': 'Factura C',
      'NCA': 'Nota de Crédito A',
      'NCB': 'Nota de Crédito B',
      'NCC': 'Nota de Crédito C',
      'NDA': 'Nota de Débito A',
      'NDB': 'Nota de Débito B',
      'NDC': 'Nota de Débito C'
    };
    return typeMap[type] || type;
  };

  // Función para formatear fecha
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  // Función para formatear moneda
  const formatCurrency = (amount: string): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(parseFloat(amount));
  };

  // Efecto para cargar datos iniciales
  useEffect(() => {
    fetchInvoices();
  }, []);

  // Cleanup del timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Facturas AFIP" />

      {/* Alerta */}
      {alert.show && (
        <Alert
          variant={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert(prev => ({ ...prev, show: false }))}
        />
      )}

      {/* Header con filtros y acciones */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Facturas AFIP
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestiona las facturas electrónicas AFIP del sistema
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/arca/add">
              <Button variant="primary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Factura
              </Button>
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Buscar por número, razón social..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Todos los estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="AUTORIZADA">Autorizada</option>
              <option value="RECHAZADA">Rechazada</option>
              <option value="ANULADA">Anulada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo
            </label>
            <select
              value={typeFilter}
              onChange={handleTypeFilterChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Todos los tipos</option>
              <option value="FA">Factura A</option>
              <option value="FB">Factura B</option>
              <option value="FC">Factura C</option>
              <option value="NCA">Nota de Crédito A</option>
              <option value="NCB">Nota de Crédito B</option>
              <option value="NCC">Nota de Crédito C</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de facturas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando facturas...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Error al cargar</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={() => fetchInvoices(currentPage, searchTerm, statusFilter, typeFilter)}>
              Reintentar
            </Button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No hay facturas</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No se encontraron facturas AFIP con los filtros aplicados.
            </p>
            <Link href="/admin/arca/add">
              <Button variant="primary">
                Crear primera factura
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-700/50">
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Número
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tipo
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cliente
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    CAE
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {invoice.numero_comprobante || 'Sin número'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        PV: {invoice.punto_venta}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {getInvoiceTypeText(invoice.tipo_comprobante)}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {invoice.razon_social}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {invoice.documento_tipo} {invoice.documento_numero}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatDate(invoice.fecha_comprobante)}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(invoice.importe_total)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Neto: {formatCurrency(invoice.importe_neto)}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant="light"
                        color={getStatusBadgeColor(invoice.estado)}
                      >
                        {getStatusText(invoice.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {invoice.cae || 'Sin CAE'}
                      </div>
                      {invoice.fecha_vencimiento_cae && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Vence: {formatDate(invoice.fecha_vencimiento_cae)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link href={`/admin/arca/${invoice.id}`}>
                          <Button size="sm" variant="outline">
                            Ver
                          </Button>
                        </Link>
                        
                        {invoice.estado === 'BORRADOR' && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Autorizar Factura',
                                message: '¿Estás seguro de que deseas autorizar esta factura en AFIP?',
                                onConfirm: () => {
                                  authorizeInvoice(invoice.id);
                                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                }
                              });
                            }}
                          >
                            Autorizar
                          </Button>
                        )}

                        {invoice.estado === 'AUTORIZADA' && (
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Anular Factura',
                                message: '¿Estás seguro de que deseas anular esta factura?',
                                onConfirm: () => {
                                  cancelInvoice(invoice.id);
                                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                }
                              });
                            }}
                          >
                            Anular
                          </Button>
                        )}

                        {(invoice.estado === 'BORRADOR' || invoice.estado === 'RECHAZADA') && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Eliminar Factura',
                                message: '¿Estás seguro de que deseas eliminar esta factura? Esta acción no se puede deshacer.',
                                onConfirm: () => {
                                  deleteInvoice(invoice.id);
                                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                }
                              });
                            }}
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const newPage = Math.max(currentPage - 1, 1);
                        setCurrentPage(newPage);
                        fetchInvoices(newPage, searchTerm, statusFilter, typeFilter);
                      }}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const newPage = Math.min(currentPage + 1, totalPages);
                        setCurrentPage(newPage);
                        fetchInvoices(newPage, searchTerm, statusFilter, typeFilter);
                      }}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Mostrando{' '}
                        <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                        {' '}a{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * itemsPerPage, totalCount)}
                        </span>
                        {' '}de{' '}
                        <span className="font-medium">{totalCount}</span>
                        {' '}resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPage = Math.max(currentPage - 1, 1);
                            setCurrentPage(newPage);
                            fetchInvoices(newPage, searchTerm, statusFilter, typeFilter);
                          }}
                          disabled={currentPage === 1}
                          className="rounded-r-none"
                        >
                          Anterior
                        </Button>
                        
                        {/* Números de página */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNumber = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i));
                          return (
                            <Button
                              key={pageNumber}
                              variant={currentPage === pageNumber ? "primary" : "outline"}
                              size="sm"
                              onClick={() => {
                                setCurrentPage(pageNumber);
                                fetchInvoices(pageNumber, searchTerm, statusFilter, typeFilter);
                              }}
                              className="rounded-none"
                            >
                              {pageNumber}
                            </Button>
                          );
                        })}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPage = Math.min(currentPage + 1, totalPages);
                            setCurrentPage(newPage);
                            fetchInvoices(newPage, searchTerm, statusFilter, typeFilter);
                          }}
                          disabled={currentPage === totalPages}
                          className="rounded-l-none"
                        >
                          Siguiente
                        </Button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
};

export default AFIPInvoicesPage;