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

interface DocumentType {
  id: number;
  name: string;
  code: string;
  description: string | null;
  required: boolean;
  expirable: boolean;
  verification_required: boolean;
  active: boolean;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DocumentType[];
}

// Interfaces para alertas
interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

type BadgeColor = 'success' | 'warning' | 'error' | 'default' | 'info' | 'primary';

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

const getBadgeStatus = (isActive: boolean): { color: BadgeColor; text: string } => {
  return isActive
    ? { color: 'success', text: 'Activo' }
    : { color: 'error', text: 'Inactivo' };
};

const Page = () => {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<string>('all');

  // Estado para el modal de confirmación
  const [modalOpen, setModalOpen] = useState(false);
  const [docTypeToDelete, setDocTypeToDelete] = useState<DocumentType | null>(null);

  // Estado para las alertas
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Función para cargar documentos
  const fetchDocumentTypes = async (url = '/api/document-types/') => {
    try {
      setLoading(true);
      
      // Extraer solo la parte relativa de la URL si es completa
      if (url.startsWith('http')) {
        url = url.replace(/^https?:\/\/[^\/]+/, '');
      }

      // Añadir parámetros de búsqueda y filtro
      let apiUrl = url;
      if (!apiUrl.includes('?')) {
        apiUrl += '?';
      } else {
        apiUrl += '&';
      }

      // Añadir página y tamaño de página siempre que no estén ya
      if (!apiUrl.includes('page=') && !apiUrl.includes('offset=')) {
        apiUrl += `page=${currentPage}&page_size=10`;
      }

      // Añadir término de búsqueda si existe
      if (searchTerm && !apiUrl.includes('search=')) {
        apiUrl += `&search=${encodeURIComponent(searchTerm)}`;
      }

      // Añadir filtro de activo si es distinto de 'all'
      if (filterActive !== 'all' && !apiUrl.includes('active=')) {
        apiUrl += `&active=${filterActive === 'active'}`;
      }

      console.log('Cargando documentos desde:', apiUrl);
      const response = await fetchApi<ApiResponse>(apiUrl);
      
      if (response) {
        setDocumentTypes(response.results);
        
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
      setError('Error al cargar los tipos de documento');
      console.error('Error al cargar documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para navegar a la página anterior
  const goToPrevPage = () => {
    if (prevPageUrl) {
      const apiPath = prevPageUrl.replace(/^https?:\/\/[^\/]+/, '');
      console.log("Navegando a página anterior:", apiPath);
      fetchDocumentTypes(apiPath);
      setCurrentPage(prev => prev - 1);
    }
  };
  
  // Función para navegar a la siguiente página
  const goToNextPage = () => {
    if (nextPageUrl) {
      const apiPath = nextPageUrl.replace(/^https?:\/\/[^\/]+/, '');
      console.log("Navegando a página siguiente:", apiPath);
      fetchDocumentTypes(apiPath);
      setCurrentPage(prev => prev + 1);
    }
  };

  // Manejar cambios en el filtro de activo
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterActive(e.target.value);
    setCurrentPage(1); // Volver a la primera página al cambiar el filtro
  };

  // Manejar búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Volver a la primera página al buscar
    fetchDocumentTypes();
  };

  // Cargar datos del backend al iniciar o cuando cambien los filtros
  useEffect(() => {
    fetchDocumentTypes();
  }, [filterActive]);

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

  // Iniciar proceso de eliminación (mostrar modal)
  const confirmDelete = (docType: DocumentType) => {
    setDocTypeToDelete(docType);
    setModalOpen(true);
  };

  // Manejar la eliminación después de la confirmación
  const handleDelete = async () => {
    if (!docTypeToDelete) return;

    try {
      await fetchApi(`/api/document-types/${docTypeToDelete.id}/`, {
        method: 'DELETE'
      });

      // Recargar la lista para ver los cambios
      fetchDocumentTypes();

      // Mostrar alerta de éxito
      setAlert({
        show: true,
        type: 'success',
        title: 'Tipo de documento eliminado',
        message: `El tipo de documento "${docTypeToDelete.name}" ha sido eliminado correctamente.`
      });
    } catch {
      // Mostrar alerta de error
      setAlert({
        show: true,
        type: 'error',
        title: 'Error al eliminar',
        message: `No se pudo eliminar el tipo de documento "${docTypeToDelete.name}". Puede estar en uso en el sistema.`
      });
    }
  };

  if (loading && documentTypes.length === 0) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-300"></div>
      </div>
    );
  }

  if (error && documentTypes.length === 0) {
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
          Tipos de Documentos {totalCount > 0 && `(${totalCount})`}
        </h1>
        <Link
          href="/document-type/add"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Nuevo Tipo de Documento
        </Link>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o código"
              className="px-4 py-2 border border-gray-300 rounded-l-md w-full dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors"
            >
              Buscar
            </button>
          </form>
        </div>
        
        <div>
          <select
            value={filterActive}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Indicador de carga cuando ya hay datos */}
      {loading && documentTypes.length > 0 && (
        <div className="mb-4 flex justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-gray-300"></div>
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
                    Nombre
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Código
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Obligatorio
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Expirable
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Requiere Verificación
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Estado
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {documentTypes.length > 0 ? (
                  documentTypes.map((docType) => (
                    <TableRow key={docType.id}>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {docType.id}
                      </TableCell>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {docType.name}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {docType.code}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          size="sm"
                          color={docType.required ? "primary" : "default"}
                        >
                          {docType.required ? "Sí" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          size="sm"
                          color={docType.expirable ? "info" : "default"}
                        >
                          {docType.expirable ? "Sí" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          size="sm"
                          color={docType.verification_required ? "warning" : "default"}
                        >
                          {docType.verification_required ? "Sí" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          size="sm"
                          color={getBadgeStatus(docType.active).color}
                        >
                          {getBadgeStatus(docType.active).text}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/document-type/${docType.id}`}
                            className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                          >
                            Ver
                          </Link>
                          <button
                            onClick={() => confirmDelete(docType)}
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
                    <TableCell colSpan={8} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm
                        ? `No se encontraron tipos de documentos que coincidan con "${searchTerm}"`
                        : filterActive !== 'all'
                          ? `No se encontraron tipos de documentos ${filterActive === 'active' ? 'activos' : 'inactivos'}`
                          : 'No se encontraron tipos de documentos registrados'
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Controles de paginación */}
            {documentTypes.length > 0 && (
              <div className="mt-4 flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    Mostrando <span className="font-medium">{documentTypes.length}</span> tipos, página <span className="font-medium">{currentPage}</span> de{" "}
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

      {/* Modal de confirmación para eliminar tipo de documento */}
      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar tipo de documento"
        message={docTypeToDelete ?
          `¿Estás seguro que deseas eliminar el tipo de documento "${docTypeToDelete.name}" (${docTypeToDelete.code})? Esta acción no se puede deshacer.`
          : ''}
      />
    </div>
  );
};

export default Page;