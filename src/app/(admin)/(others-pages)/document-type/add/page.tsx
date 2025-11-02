'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Alert from '@/components/ui/alert/Alert';
import { fetchApi } from '@/app/lib/data';
import Link from 'next/link';

interface FormData {
  name: string;
  code: string;
  description: string;
  required: boolean;
  expirable: boolean;
  verification_required: boolean;
  active: boolean;
}

interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

const DocumentTypeAdd = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    description: '',
    required: true,
    expirable: true,
    verification_required: true,
    active: true
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Estado para alertas
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Función para mostrar alertas
  const showAlert = (type: AlertState['type'], title: string, message: string) => {
    setAlert({
      show: true,
      type,
      title,
      message
    });
  };

  // Ocultar alertas después de 5 segundos
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [alert.show]);

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

    // Limpiar error cuando el usuario escribe
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name) newErrors.name = 'El nombre es requerido';
    if (!formData.code) newErrors.code = 'El código es requerido';
    
    // Validar que el código no tenga espacios
    if (formData.code && formData.code.includes(' ')) {
      newErrors.code = 'El código no debe contener espacios';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      const documentTypeData = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        required: formData.required,
        expirable: formData.expirable,
        verification_required: formData.verification_required,
        active: formData.active
      };

      console.log('Enviando datos del tipo de documento:', documentTypeData);

      // Enviar datos a la API
      const response = await fetchApi('/api/document-types/', {
        method: 'POST',
        body: documentTypeData
      });

      console.log('Tipo de documento creado:', response);
      showAlert('success', 'Éxito', 'Tipo de documento creado correctamente');

      // Redirigir después de un breve retraso para que el usuario vea la alerta
      setTimeout(() => {
        router.push('/document-type');
      }, 1500);

    } catch (error: any) {
      console.error('Error al crear tipo de documento:', error);
      
      let errorMessage = 'No se pudo crear el tipo de documento. Por favor intente nuevamente.';
      
      // Si el error es por código duplicado
      if (error.response && error.response.status === 400) {
        try {
          const errorData = await error.response.json();
          if (errorData.code && errorData.code.includes('ya existe')) {
            errorMessage = 'El código ya está en uso. Por favor utilice otro código.';
            setErrors(prev => ({ ...prev, code: 'El código ya está en uso' }));
          }
        } catch {
          // Si no se puede parsear la respuesta, usar mensaje general
        }
      }
      
      showAlert('error', 'Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/document-type');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
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
          Crear Nuevo Tipo de Documento
        </h1>
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
          <span>Volver</span>
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Información Básica</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ej: Licencia de Conducir, SOAT, Tarjeta de Propiedad"
                error={!!errors.name}
              />
              {errors.name && (
                <span className="text-xs text-red-500">{errors.name}</span>
              )}
            </div>

            <div>
              <Label htmlFor="code">Código *</Label>
              <Input
                type="text"
                name="code"
                id="code"
                value={formData.code}
                onChange={handleInputChange}
                placeholder="Ej: LICENSE, SOAT, PROPERTY_CARD"
                error={!!errors.code}
              />
              {errors.code && (
                <span className="text-xs text-red-500">{errors.code}</span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Código único sin espacios, preferiblemente en mayúsculas
              </span>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea
                name="description"
                id="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Descripción detallada del tipo de documento"
                className="mt-1 block w-full rounded-md border-gray-300 bg-transparent px-4 py-2 outline-none transition focus:border-primary active:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-primary"
              ></textarea>
            </div>
          </div>

          <h3 className="text-lg font-medium text-gray-900 dark:text-white pt-4">Configuración</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <div className="flex items-center space-x-2 py-2">
                <input
                  id="required"
                  name="required"
                  type="checkbox"
                  checked={formData.required}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                />
                <Label htmlFor="required" className="!mb-0">Documento Obligatorio</Label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (Requerido para cumplimiento normativo)
                </span>
              </div>
              
              <div className="flex items-center space-x-2 py-2">
                <input
                  id="expirable"
                  name="expirable"
                  type="checkbox"
                  checked={formData.expirable}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                />
                <Label htmlFor="expirable" className="!mb-0">Tiene Fecha de Vencimiento</Label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (El documento requiere renovación periódica)
                </span>
              </div>
            </div>
            
            <div>
              <div className="flex items-center space-x-2 py-2">
                <input
                  id="verification_required"
                  name="verification_required"
                  type="checkbox"
                  checked={formData.verification_required}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                />
                <Label htmlFor="verification_required" className="!mb-0">Requiere Verificación</Label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (Debe ser validado por un administrador)
                </span>
              </div>
              
              <div className="flex items-center space-x-2 py-2">
                <input
                  id="active"
                  name="active"
                  type="checkbox"
                  checked={formData.active}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                />
                <Label htmlFor="active" className="!mb-0">Tipo de Documento Activo</Label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (Disponible para uso en el sistema)
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 mt-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Importante</h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
                  <p>
                    Los tipos de documento son fundamentales para el cumplimiento normativo. Al crear un tipo asegúrese de que:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>El código sea único y descriptivo</li>
                    <li>La configuración de obligatoriedad sea correcta</li>
                    <li>Si requiere fecha de vencimiento esté correctamente marcado</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="inline animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentTypeAdd;