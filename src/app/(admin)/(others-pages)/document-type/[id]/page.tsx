'use client'
import React, { useEffect, useState } from 'react';
import Badge from '@/components/ui/badge/Badge';
import { useParams, useRouter } from 'next/navigation';
import { fetchApi } from '@/app/lib/data';
import Link from 'next/link';
import Alert from '@/components/ui/alert/Alert';
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';

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

interface FormData {
  name: string;
  code: string;
  description: string;
  required: boolean;
  expirable: boolean;
  verification_required: boolean;
  active: boolean;
}

type BadgeColor = 'success' | 'warning' | 'error' | 'default' | 'info' | 'primary';

// Función para obtener el estilo del badge según estado activo
const getActiveBadge = (isActive: boolean): { color: BadgeColor; text: string } => {
  return isActive
    ? { color: 'success', text: 'Activo' }
    : { color: 'error', text: 'Inactivo' };
};

// Función para obtener el estilo del badge según es requerido
const getRequiredBadge = (required: boolean): { color: BadgeColor; text: string } => {
  return required
    ? { color: 'warning', text: 'Obligatorio' }
    : { color: 'default', text: 'Opcional' };
};

// Función para obtener el estilo del badge según expirable
const getExpirableBadge = (expirable: boolean): { color: BadgeColor; text: string } => {
  return expirable
    ? { color: 'info', text: 'Con Vencimiento' }
    : { color: 'default', text: 'Sin Vencimiento' };
};

// Función para obtener el estilo del badge según verificación
const getVerificationBadge = (required: boolean): { color: BadgeColor; text: string } => {
  return required
    ? { color: 'primary', text: 'Requiere Verificación' }
    : { color: 'default', text: 'No Requiere Verificación' };
};

const DocumentTypeDetail = () => {
  const { isOpen, openModal, closeModal } = useModal();
  const params = useParams();
  const router = useRouter();
  const docTypeId = params.id;
  const [documentType, setDocumentType] = useState<DocumentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    type: 'success' as 'success' | 'error',
    message: ''
  });

  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    description: '',
    required: false,
    expirable: false,
    verification_required: false,
    active: false
  });

  useEffect(() => {
    const fetchDocumentTypeDetails = async () => {
      try {
        setLoading(true);
        const response = await fetchApi<DocumentType>(`/api/document-types/${docTypeId}/`);
        if (response) {
          console.log("Tipo de documento cargado:", response);
          setDocumentType(response);

          // Inicializar datos del formulario
          setFormData({
            name: response.name,
            code: response.code,
            description: response.description || '',
            required: response.required,
            expirable: response.expirable,
            verification_required: response.verification_required,
            active: response.active
          });
        }
      } catch (err) {
        setError('Error al cargar los detalles del tipo de documento');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (docTypeId) {
      fetchDocumentTypeDetails();
    }
  }, [docTypeId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Función para alternar el estado activo
  const handleToggleActive = async () => {
    if (!documentType) return;

    try {
      setUpdateLoading(true);
      const response = await fetchApi(`/api/document-types/${docTypeId}/`, {
        method: 'PATCH',
        body: {
          active: !documentType.active
        }
      });

      if (response) {
        setDocumentType(prev => ({
          ...prev!,
          active: !prev!.active
        }));
        
        setFormData(prev => ({
          ...prev,
          active: !documentType.active
        }));

        setAlert({
          show: true,
          type: 'success',
          message: `Tipo de documento ${!documentType.active ? 'activado' : 'desactivado'} correctamente`
        });
      }
    } catch (err) {
      console.error('Error al cambiar el estado del tipo de documento:', err);
      setAlert({
        show: true,
        type: 'error',
        message: 'Error al cambiar el estado del tipo de documento'
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    setError(null);

    try {
      const updatedData = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        required: formData.required,
        expirable: formData.expirable,
        verification_required: formData.verification_required,
        active: formData.active
      };

      // Actualizar tipo de documento
      const response = await fetchApi(`/api/document-types/${docTypeId}/`, {
        method: 'PUT',
        body: updatedData
      });

      if (response) {
        setDocumentType(response as DocumentType);
        closeModal();
        setAlert({
          show: true,
          type: 'success',
          message: 'Tipo de documento actualizado correctamente'
        });
      }
    } catch (err) {
      setError('Error al actualizar el tipo de documento');
      console.error('Error:', err);
    } finally {
      setUpdateLoading(false);
    }
  };

  // Manejar la ocultación de alertas después de 5 segundos
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert.show]);

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-300"></div>
      </div>
    );
  }

  if (error || !documentType) {
    return (
      <div className="p-4">
        <Alert
          variant="error"
          title="Error"
          message={error || "Tipo de documento no encontrado"}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <Link
          href="/document-type"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Volver a tipos de documentos</span>
        </Link>
      </div>

      {/* Alerta para mostrar mensajes */}
      {alert.show && (
        <div className="mb-6">
          <Alert
            variant={alert.type}
            title={alert.type === 'success' ? 'Éxito' : 'Error'}
            message={alert.message}
          />
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="p-5 lg:p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-0">
              Detalle del Tipo de Documento
            </h3>
            <div className="flex gap-2">
              {/* Botón para cambiar estado activo */}
              <button
                onClick={handleToggleActive}
                disabled={updateLoading}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm ${documentType.active
                  ? 'border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                  : 'border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                  }`}
              >
                {updateLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={documentType.active
                        ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        : "M5 13l4 4L19 7"
                      }
                    />
                  </svg>
                )}
                {documentType.active ? 'Desactivar' : 'Activar'}
              </button>

              <button
                onClick={openModal}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                </svg>
                Editar
              </button>
            </div>
          </div>

          {/* Info Principal */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
            <div className="flex flex-col gap-5">
              <div>
                <h4 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                  {documentType.name}
                </h4>
                <div className="mt-2 flex flex-wrap gap-4">
                  <Badge
                    size="sm"
                    color={getActiveBadge(documentType.active).color}
                  >
                    {getActiveBadge(documentType.active).text}
                  </Badge>
                  <Badge
                    size="sm"
                    color={getRequiredBadge(documentType.required).color}
                  >
                    {getRequiredBadge(documentType.required).text}
                  </Badge>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Código: {documentType.code}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Información General */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                Información General
              </h4>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Nombre
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {documentType.name}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Código
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {documentType.code}
                  </p>
                </div>

                <div className="lg:col-span-2">
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Descripción
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {documentType.description || 'Sin descripción'}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Obligatoriedad
                  </p>
                  <div className="flex items-center">
                    <Badge
                      size="sm"
                      color={getRequiredBadge(documentType.required).color}
                    >
                      {getRequiredBadge(documentType.required).text}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Vencimiento
                  </p>
                  <div className="flex items-center">
                    <Badge
                      size="sm"
                      color={getExpirableBadge(documentType.expirable).color}
                    >
                      {getExpirableBadge(documentType.expirable).text}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Verificación
                  </p>
                  <div className="flex items-center">
                    <Badge
                      size="sm"
                      color={getVerificationBadge(documentType.verification_required).color}
                    >
                      {getVerificationBadge(documentType.verification_required).text}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Estado
                  </p>
                  <div className="flex items-center">
                    <Badge
                      size="sm"
                      color={getActiveBadge(documentType.active).color}
                    >
                      {getActiveBadge(documentType.active).text}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Requisitos */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                Requisitos y Características
              </h4>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h5 className="font-medium text-gray-800 dark:text-white/90">Obligatoriedad</h5>
                    <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
                      {documentType.required 
                        ? 'Este documento es obligatorio para los vehículos que lo requieran.' 
                        : 'Este documento es opcional para los vehículos.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-orange-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h5 className="font-medium text-gray-800 dark:text-white/90">Vencimiento</h5>
                    <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
                      {documentType.expirable 
                        ? 'Este documento tiene fecha de vencimiento y debe renovarse.' 
                        : 'Este documento no tiene fecha de vencimiento.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h5 className="font-medium text-gray-800 dark:text-white/90">Verificación</h5>
                    <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
                      {documentType.verification_required 
                        ? 'Este documento requiere verificación administrativa.' 
                        : 'Este documento no requiere verificación adicional.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={closeModal}>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="relative w-full max-w-[700px] rounded-xl bg-white dark:bg-gray-800 p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                Editar Tipo de Documento
              </h4>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    type="text"
                    name="name"
                    id="name"
                    defaultValue={formData.name}
                    onChange={handleInputChange}
                    placeholder="Nombre del tipo de documento"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="code">Código</Label>
                  <Input
                    type="text"
                    name="code"
                    id="code"
                    defaultValue={formData.code}
                    onChange={handleInputChange}
                    placeholder="Código único"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descripción del tipo de documento"
                  className="mt-1 block w-full rounded-md border-gray-300 bg-transparent px-4 py-2 outline-none transition focus:border-primary active:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-primary"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="required">Obligatoriedad</Label>
                  <div className="flex items-center mt-1">
                    <input
                      type="checkbox"
                      name="required"
                      id="required"
                      checked={formData.required}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                    />
                    <label htmlFor="required" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Documento obligatorio
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="expirable">Vencimiento</Label>
                  <div className="flex items-center mt-1">
                    <input
                      type="checkbox"
                      name="expirable"
                      id="expirable"
                      checked={formData.expirable}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                    />
                    <label htmlFor="expirable" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Tiene fecha de vencimiento
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="verification_required">Verificación</Label>
                  <div className="flex items-center mt-1">
                    <input
                      type="checkbox"
                      name="verification_required"
                      id="verification_required"
                      checked={formData.verification_required}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                    />
                    <label htmlFor="verification_required" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Requiere verificación administrativa
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="active">Estado</Label>
                  <div className="flex items-center mt-1">
                    <input
                      type="checkbox"
                      name="active"
                      id="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                    />
                    <label htmlFor="active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Tipo de documento activo
                    </label>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={updateLoading}
                >
                  {updateLoading ? (
                    <>
                      <svg className="inline animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
              {error && (
                <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DocumentTypeDetail;