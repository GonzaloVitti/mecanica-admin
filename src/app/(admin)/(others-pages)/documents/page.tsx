'use client'
import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import Image from 'next/image';

interface Document {
  id: string;
  document_type: number;
  document_type_name: string;
  content_type_str: string;
  object_id: string;
  entity_name: string;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by_name: string;
  uploaded_at: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verified: boolean;
  verified_by_name?: string;
  verified_at?: string;
  issue_date?: string;
  expiry_date?: string;
  is_expired: boolean;
  is_expiring_soon: boolean;
  rejection_reason?: string;
  is_active: boolean;
  related_object?: {
    id: number;
    type: string;
    brand: string;
    line: string;
    model: string;
    license_plate: string;
    color: string;
    is_active: boolean;
    type_name: string;
    vehicle_type: string;
    transport_category: string;
  };
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Document[];
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
      window.document.addEventListener('mousedown', handleClickOutside);
      window.document.body.style.overflow = 'hidden';
    }

    return () => {
      window.document.removeEventListener('mousedown', handleClickOutside);
      window.document.body.style.overflow = 'auto';
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
      window.document.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.document.removeEventListener('keydown', handleEscape);
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

// Componente para vista previa de archivo
const FilePreviewModal = ({
  isOpen,
  onClose,
  document: documentData
}: {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
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
      window.document.addEventListener('mousedown', handleClickOutside);
      window.document.body.style.overflow = 'hidden';
    }

    return () => {
      window.document.removeEventListener('mousedown', handleClickOutside);
      window.document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !documentData) return null;

  const isImage = documentData.mime_type.startsWith('image/');
  const isPdf = documentData.mime_type === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-lg dark:bg-gray-800 overflow-hidden flex flex-col"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white truncate">
            {documentData.filename}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4 flex items-center justify-center">
          {isImage ? (
            <img
              src={documentData.file_url}
              alt={documentData.filename}
              className="max-w-full max-h-[70vh] object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={`${documentData.file_url}#view=FitH`}
              className="w-full h-[70vh]"
              title={documentData.filename}
            />
          ) : (
            <div className="text-center p-6">
              <svg className="w-20 h-20 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                Este tipo de archivo no puede previsulizarse en el navegador
              </p>
              <a
                href={documentData.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Descargar archivo
              </a>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex-1">
              <p className="text-gray-500 dark:text-gray-400">Tipo de documento</p>
              <p className="font-medium text-gray-900 dark:text-white">{documentData.document_type_name}</p>
            </div>
            <div className="flex-1">
              <p className="text-gray-500 dark:text-gray-400">Entidad asociada</p>
              <p className="font-medium text-gray-900 dark:text-white">{documentData.entity_name || documentData.content_type_str + " #" + documentData.object_id}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Estado</p>
              <Badge
                size="sm"
                color={
                  documentData.status === 'VERIFIED' ? 'success' :
                    documentData.status === 'REJECTED' ? 'error' : 'warning'
                }
              >
                {documentData.status === 'VERIFIED' ? 'Verificado' :
                  documentData.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}
              </Badge>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <a
              href={documentData.file_url}
              download
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Descargar
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para elegir la acción sobre un documento
const DocumentActionModal = ({
  isOpen,
  onClose,
  document: documentData,
  onVerify,
  onReject,
  onUnverify,
  isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  onVerify: () => void;
  onReject: (reason: string) => void;
  onUnverify: () => void;
  isLoading: boolean;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Efecto para manejar clicks fuera del modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      window.document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      window.document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      // Resetear el motivo de rechazo cuando se cierra el modal
      setRejectReason('');
    }
  }, [isOpen]);

  if (!isOpen || !documentData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        ref={modalRef}
        className="w-full max-w-md p-6 mx-auto bg-white rounded-xl shadow-lg dark:bg-gray-800 animate-fadeIn"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Acciones del documento
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-300">
            Documento: <span className="font-medium text-gray-800 dark:text-white">{documentData.document_type_name}</span>
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            Estado actual:
            <Badge
              size="sm"
              color={
                documentData.status === 'VERIFIED' ? 'success' :
                  documentData.status === 'REJECTED' ? 'error' : 'warning'
              }
            >
              {documentData.status === 'VERIFIED' ? 'Verificado' :
                documentData.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}
            </Badge>
          </p>
        </div>

        <div className="space-y-4">
          {documentData.status === 'PENDING' && (
            <>
              <button
                onClick={onVerify}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </span>
                ) : "Verificar y Aprobar"}
              </button>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Motivo del rechazo
                </label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Ingrese el motivo del rechazo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
                <button
                  onClick={() => rejectReason.trim() && onReject(rejectReason)}
                  disabled={!rejectReason.trim() || isLoading}
                  className="mt-2 w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? "Procesando..." : "Rechazar Documento"}
                </button>
              </div>
            </>
          )}

          {documentData.status === 'VERIFIED' && (
            <button
              onClick={onUnverify}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              {isLoading ? "Procesando..." : "Deshacer verificación"}
            </button>
          )}

          {documentData.status === 'REJECTED' && (
            <div>
              {documentData.rejection_reason && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md dark:bg-red-900/30 dark:border-red-800">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Motivo del rechazo:</p>
                  <p className="text-sm text-red-700 dark:text-red-200">{documentData.rejection_reason}</p>
                </div>
              )}

              <button
                onClick={onVerify}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? "Procesando..." : "Verificar y Aprobar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getStatusBadge = (doc: Document): { color: BadgeColor; text: string } => {
  if (doc.status === 'VERIFIED') {
    return { color: 'success', text: 'Verificado' };
  } else if (doc.status === 'REJECTED') {
    return { color: 'error', text: 'Rechazado' };
  } else {
    return { color: 'warning', text: 'Pendiente' };
  }
};

const getExpiryBadge = (doc: Document): { color: BadgeColor; text: string } | null => {
  if (!doc.expiry_date) return null;

  if (doc.is_expired) {
    return { color: 'error', text: 'Expirado' };
  } else if (doc.is_expiring_soon) {
    return { color: 'warning', text: 'Por expirar' };
  } else {
    return { color: 'success', text: 'Vigente' };
  }
};

// Componente para mostrar el tipo de entidad de forma más amigable
const getEntityTypeLabel = (contentTypeStr: string): string => {
  const mapping: Record<string, string> = {
    'vehicles.vehicle': 'Vehículo',
    'users.driver': 'Conductor',
    'trips.trip': 'Viaje',
    'company.company': 'Empresa'
    // Añadir más mapeos según sea necesario
  };

  return mapping[contentTypeStr] || contentTypeStr;
};

// Función para formatear el tamaño del archivo
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

// Función para obtener el ícono adecuado según el tipo de archivo
const FileIcon = ({ mimeType }: { mimeType: string }) => {
  if (mimeType.startsWith('image/')) {
    return (
      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  } else if (mimeType === 'application/pdf') {
    return (
      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    return (
      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
    return (
      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  } else {
    return (
      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
};

const Page = () => {
  // Estado para todos los documentos (sin filtrar)
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  // Estado para documentos filtrados (los que se muestran actualmente)
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Items por página para paginación local
  const itemsPerPage = 10;

  // Estado para los filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterExpiryStatus, setFilterExpiryStatus] = useState<string>('all');
  const [filterEntityType, setFilterEntityType] = useState<string>('all');

  // Estados para los modales
  const [modalOpen, setModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [documentToPreview, setDocumentToPreview] = useState<Document | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [documentToAction, setDocumentToAction] = useState<Document | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Estado para las alertas
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Función para cargar todos los documentos inicialmente
  const fetchAllDocuments = async () => {
    try {
      setLoading(true);
      // Cargar todos los documentos o el máximo posible
      const response = await fetchApi<ApiResponse>('/api/documents/?limit=100');

      if (response && response.results) {
        // Guardar todos los documentos sin filtrar
        setAllDocuments(response.results);
        console.log(`Cargados ${response.results.length} documentos`);

        // Actualizar el contador total
        setTotalCount(response.count || response.results.length);

        // Aplicar filtros iniciales
        applyFilters(response.results);
      }
    } catch (err) {
      setError('Error al cargar los documentos');
      console.error('Error al cargar documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para aplicar filtros localmente
  const applyFilters = useCallback((docs: Document[]) => {
    // Empezar con todos los documentos
    let filtered = [...docs];

    // Aplicar búsqueda por texto si hay término
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.document_type_name.toLowerCase().includes(searchLower) ||
        doc.filename.toLowerCase().includes(searchLower) ||
        (doc.entity_name && doc.entity_name.toLowerCase().includes(searchLower))
      );
    }

    // Aplicar filtro por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(doc => doc.status === filterStatus);
    }

    // Aplicar filtro por estado de expiración
    if (filterExpiryStatus !== 'all') {
      switch (filterExpiryStatus) {
        case 'expired':
          filtered = filtered.filter(doc => doc.is_expired);
          break;
        case 'expiring_soon':
          filtered = filtered.filter(doc => doc.is_expiring_soon && !doc.is_expired);
          break;
        case 'valid':
          filtered = filtered.filter(doc => !doc.is_expired && !doc.is_expiring_soon);
          break;
      }
    }

    // Aplicar filtro por tipo de entidad
    if (filterEntityType !== 'all') {
      filtered = filtered.filter(doc => doc.content_type_str === filterEntityType);
    }

    // Actualizar contadores para paginación
    const filteredCount = filtered.length;
    setTotalCount(filteredCount);
    const newTotalPages = Math.max(1, Math.ceil(filteredCount / itemsPerPage));
    setTotalPages(newTotalPages);

    // Asegurarse de que la página actual es válida
    const validCurrentPage = Math.min(currentPage, newTotalPages);
    if (validCurrentPage !== currentPage) {
      setCurrentPage(validCurrentPage);
    }

    // Aplicar paginación
    const startIndex = (validCurrentPage - 1) * itemsPerPage;
    const paginatedDocs = filtered.slice(startIndex, startIndex + itemsPerPage);

    console.log(`Filtro aplicado: Mostrando ${paginatedDocs.length} de ${filteredCount} documentos. Página ${validCurrentPage} de ${newTotalPages}`);

    // Actualizar documentos filtrados y paginados
    setDocuments(paginatedDocs);
  }, [searchTerm, filterStatus, filterExpiryStatus, filterEntityType, currentPage, itemsPerPage]);

  // Aplicar filtros cuando cambian
  useEffect(() => {
    if (allDocuments.length > 0) {
      applyFilters(allDocuments);
    }
  }, [searchTerm, filterStatus, filterExpiryStatus, filterEntityType, currentPage, applyFilters]);

  // Cargar documentos al iniciar
  useEffect(() => {
    fetchAllDocuments();
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

  // Manejadores de paginación
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Iniciar proceso de eliminación (mostrar modal)
  const confirmDelete = (doc: Document) => {
    setDocumentToDelete(doc);
    setModalOpen(true);
  };

  // Abrir vista previa del documento
  const openPreview = (doc: Document) => {
    setDocumentToPreview(doc);
    setPreviewOpen(true);
  };

  // Abrir modal de acciones
  const openActionModal = (doc: Document) => {
    setDocumentToAction(doc);
    setActionModalOpen(true);
  };

  // Manejar la eliminación después de la confirmación
  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      await fetchApi(`/api/documents/${documentToDelete.id}/`, {
        method: 'DELETE'
      });

      // Actualizar la lista de documentos
      const updatedAllDocs = allDocuments.filter(doc => doc.id !== documentToDelete.id);
      setAllDocuments(updatedAllDocs);

      // Re-aplicar filtros con el conjunto actualizado de documentos
      applyFilters(updatedAllDocs);

      // Mostrar alerta de éxito
      setAlert({
        show: true,
        type: 'success',
        title: 'Documento eliminado',
        message: `El documento ha sido eliminado correctamente.`
      });
    } catch {
      // Mostrar alerta de error
      setAlert({
        show: true,
        type: 'error',
        title: 'Error al eliminar',
        message: `No se pudo eliminar el documento. Intente nuevamente.`
      });
    }
  };

  // Manejar verificación de documento
  const handleVerify = async () => {
    if (!documentToAction) return;

    try {
      setActionLoading(true);
      await fetchApi(`/api/documents/${documentToAction.id}/verify/`, {
        method: 'POST'
      });

      // Actualizar el estado del documento tanto en la lista completa como en la filtrada
      const updatedAllDocs = allDocuments.map(doc => {
        if (doc.id === documentToAction.id) {
          return {
            ...doc,
            status: 'VERIFIED' as const,
            verified: true,
            verified_at: new Date().toISOString(),
            rejection_reason: undefined
          };
        }
        return doc;
      });

      setAllDocuments(updatedAllDocs);

      // Re-aplicar filtros para mostrar los cambios
      applyFilters(updatedAllDocs);

      setActionModalOpen(false);

      // Mostrar alerta de éxito
      setAlert({
        show: true,
        type: 'success',
        title: 'Documento verificado',
        message: `El documento ha sido verificado correctamente.`
      });
    } catch (error) {
      console.error("Error al verificar documento:", error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Error al verificar',
        message: `No se pudo verificar el documento. Intente nuevamente.`
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Manejar rechazo de documento
  const handleReject = async (reason: string) => {
    if (!documentToAction) return;

    try {
      setActionLoading(true);
      await fetchApi(`/api/documents/${documentToAction.id}/reject/`, {
        method: 'POST',
        body: { reason }
      });

      // Actualizar el estado del documento
      const updatedAllDocs = allDocuments.map(doc => {
        if (doc.id === documentToAction.id) {
          return {
            ...doc,
            status: 'REJECTED' as const,
            verified: false,
            verified_at: undefined,
            rejection_reason: reason
          };
        }
        return doc;
      });

      setAllDocuments(updatedAllDocs);

      // Re-aplicar filtros
      applyFilters(updatedAllDocs);

      setActionModalOpen(false);

      // Mostrar alerta de éxito
      setAlert({
        show: true,
        type: 'success',
        title: 'Documento rechazado',
        message: `El documento ha sido rechazado correctamente.`
      });
    } catch (error) {
      console.error("Error al rechazar documento:", error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Error al rechazar',
        message: `No se pudo rechazar el documento. Intente nuevamente.`
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Manejar desverificación de documento
  const handleUnverify = async () => {
    if (!documentToAction) return;

    try {
      setActionLoading(true);
      await fetchApi(`/api/documents/${documentToAction.id}/unverify/`, {
        method: 'POST'
      });

      // Actualizar el estado del documento
      const updatedAllDocs = allDocuments.map(doc => {
        if (doc.id === documentToAction.id) {
          return {
            ...doc,
            status: 'PENDING' as const,
            verified: false,
            verified_at: undefined
          };
        }
        return doc;
      });

      setAllDocuments(updatedAllDocs);

      // Re-aplicar filtros
      applyFilters(updatedAllDocs);

      setActionModalOpen(false);

      // Mostrar alerta de éxito
      setAlert({
        show: true,
        type: 'success',
        title: 'Verificación deshecha',
        message: `La verificación del documento ha sido deshecha correctamente.`
      });
    } catch (error) {
      console.error("Error al deshacer verificación:", error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: `No se pudo deshacer la verificación del documento. Intente nuevamente.`
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Manejar búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Volver a la primera página al buscar
    setCurrentPage(1);
    // Los filtros se aplicarán automáticamente por el useEffect
  };

  // Manejar cambio de filtros
  const handleFilterChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string
  ) => {
    setter(value);
    setCurrentPage(1); // Volver a la primera página al cambiar filtros
  };

  if (loading && documents.length === 0) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-300"></div>
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
          Documentos {totalCount > 0 && `(${totalCount})`}
        </h1>
      </div>

      {/* Filtros y búsqueda */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <div className="col-span-1 xl:col-span-2">
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o entidad"
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
            value={filterStatus}
            onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
          >
            <option value="all">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="VERIFIED">Verificados</option>
            <option value="REJECTED">Rechazados</option>
          </select>
        </div>

        <div>
          <select
            value={filterExpiryStatus}
            onChange={(e) => handleFilterChange(setFilterExpiryStatus, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
          >
            <option value="all">Todos (expiración)</option>
            <option value="expired">Expirados</option>
            <option value="expiring_soon">Por expirar</option>
            <option value="valid">Vigentes</option>
          </select>
        </div>

        <div>
          <select
            value={filterEntityType}
            onChange={(e) => handleFilterChange(setFilterEntityType, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
          >
            <option value="all">Todas las entidades</option>
            <option value="vehicles.vehicle">Vehículos</option>
            <option value="users.driver">Conductores</option>
            <option value="company.company">Empresas</option>
            {/* Añadir más opciones según las entidades del sistema */}
          </select>
        </div>
      </div>

      {/* Indicador de carga cuando ya hay datos */}
      {loading && documents.length > 0 && (
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
                    Tipo
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Archivo
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Entidad
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Subido por
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Fecha
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Estado
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Expiración
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="px-5 py-3 text-start">
                        <div className="flex items-center gap-2">
                          <FileIcon mimeType={doc.mime_type} />
                          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {doc.document_type_name}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <button
                          onClick={() => openPreview(doc)}
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span className="truncate max-w-[150px] inline-block">{doc.filename}</span>
                          <span className="text-xs text-gray-500">({formatFileSize(doc.file_size)})</span>
                        </button>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <div>
                          <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
                            {getEntityTypeLabel(doc.content_type_str)}
                          </span>
                          <div className="mt-1 text-sm">
                            {doc.content_type_str === "vehicles.vehicle" && doc.related_object ? (
                              <>
                                <div className="font-medium">{doc.related_object.license_plate}</div>
                                <div className="text-xs text-gray-500">
                                  {doc.related_object.brand} {doc.related_object.line} ({doc.related_object.model})
                                  <div>{doc.related_object.vehicle_type}</div>
                                </div>
                              </>
                            ) : (
                              doc.entity_name || `#${doc.object_id}`
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {doc.uploaded_by_name}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          size="sm"
                          color={getStatusBadge(doc).color}
                        >
                          {getStatusBadge(doc).text}
                        </Badge>
                        {doc.status === 'REJECTED' && doc.rejection_reason && (
                          <div className="mt-1">
                            <button
                              onClick={() => openActionModal(doc)}
                              className="text-xs text-red-600 hover:underline"
                              title={doc.rejection_reason}
                            >
                              Ver razón
                            </button>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {doc.expiry_date ? (
                          <div>
                            {getExpiryBadge(doc) && (
                              <Badge
                                size="sm"
                                color={getExpiryBadge(doc)!.color}
                              >
                                {getExpiryBadge(doc)!.text}
                              </Badge>
                            )}
                            <div className="mt-1 text-xs">
                              {new Date(doc.expiry_date).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openActionModal(doc)}
                            className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                          >
                            {doc.status === 'PENDING' ? 'Verificar' :
                              doc.status === 'VERIFIED' ? 'Deshacer' : 'Revisar'}
                          </button>
                          <button
                            onClick={() => confirmDelete(doc)}
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
                        ? `No se encontraron documentos que coincidan con "${searchTerm}"`
                        : filterStatus !== 'all' || filterExpiryStatus !== 'all' || filterEntityType !== 'all'
                          ? `No se encontraron documentos con los filtros seleccionados`
                          : 'No se encontraron documentos registrados'
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Controles de paginación */}
            {documents.length > 0 && (
              <div className="mt-4 flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    Mostrando <span className="font-medium">{documents.length}</span> documentos, página <span className="font-medium">{currentPage}</span> de{" "}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage <= 1}
                    className={`px-3 py-1 rounded ${currentPage <= 1
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                        : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                      }`}
                  >
                    Anterior
                  </button>

                  <button
                    onClick={goToNextPage}
                    disabled={currentPage >= totalPages}
                    className={`px-3 py-1 rounded ${currentPage >= totalPages
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

      {/* Modal de confirmación para eliminar documento */}
      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar documento"
        message={documentToDelete ?
          `¿Estás seguro que deseas eliminar el documento "${documentToDelete.document_type_name}"? Esta acción no se puede deshacer.`
          : ''}
      />

      {/* Modal para previsualizar documento */}
      <FilePreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        document={documentToPreview}
      />

      {/* Modal para acciones sobre documentos */}
      <DocumentActionModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        document={documentToAction}
        onVerify={handleVerify}
        onReject={handleReject}
        onUnverify={handleUnverify}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default Page;