'use client'
import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/app/lib/data';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Alert from '@/components/ui/alert/Alert';

interface PhoneContact {
  id: number;
  sales_number: string;
  support_number: string;
  updated_at: string;
}

const ContactPhonePage = () => {
  const [phoneContact, setPhoneContact] = useState<PhoneContact | null>(null);
  const [formData, setFormData] = useState({
    sales_number: '', // Mantenemos en el estado pero no lo mostraremos
    support_number: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  }>({
    show: false,
    type: 'info',
    message: ''
  });

  // Formatear fecha para mostrarla de manera amigable
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Cargar datos actuales
  useEffect(() => {
    const fetchContactPhone = async () => {
      try {
        setLoading(true);
        const response = await fetchApi<PhoneContact>('/api/contacts/current/');
        if (response) {
          setPhoneContact(response);
          setFormData({
            sales_number: response.sales_number,
            support_number: response.support_number
          });
        }
      } catch (err) {
        console.error('Error al cargar teléfonos de contacto:', err);
        setError('No fue posible cargar la información de contacto.');
      } finally {
        setLoading(false);
      }
    };

    fetchContactPhone();
  }, []);

  // Ocultar alerta después de 3 segundos
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alert.show]);

  // Manejar cambios en los campos del formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Validar que solo se ingresen números y caracteres especiales permitidos (+, -, espacio)
    const sanitizedValue = value.replace(/[^\d+\-\s]/g, '');
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
  };

  // Guardar cambios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneContact) return;
  
    // Crear una copia del formData con un valor predeterminado para sales_number si está vacío
    const dataToSubmit = {
      ...formData,
      // Si sales_number está vacío, usar el valor original del phoneContact o un valor por defecto
      sales_number: formData.sales_number.trim() || phoneContact.sales_number || 'No disponible'
    };
  
    // Validación básica solo para el número de soporte
    if (!formData.support_number.trim()) {
      setAlert({
        show: true,
        type: 'error',
        message: 'Debe ingresar un número de teléfono de soporte.'
      });
      return;
    }
  
    try {
      setSaving(true);
      const response = await fetchApi<PhoneContact>(`/api/contacts/${phoneContact.id}/`, {
        method: 'PATCH',
        body: dataToSubmit // Enviar la versión modificada con sales_number garantizado
      });
  
      if (response) {
        setPhoneContact(response);
        setAlert({
          show: true,
          type: 'success',
          message: 'Información de contacto actualizada correctamente.'
        });
      }
    } catch (err) {
      console.error('Error al actualizar teléfonos de contacto:', err);
      setAlert({
        show: true,
        type: 'error',
        message: 'Error al actualizar la información de contacto.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
      {alert.show && (
        <div className="mb-6">
          <Alert
            variant={alert.type}
            title={alert.type === 'success' ? 'Éxito' : 'Error'}
            message={alert.message}
          />
        </div>
      )}
      
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Teléfono de Contacto
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Actualice el número de teléfono que se mostrará en la aplicación para ayuda y soporte.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Solo mostramos el campo de soporte, ocultamos ventas */}
          <div>
            <Label htmlFor="support_number">Teléfono de Soporte</Label>
            <Input
              type="tel"
              id="support_number"
              name="support_number"
              value={formData.support_number}
              onChange={handleInputChange}
              placeholder="Ej. +52 1 55 1234 5678"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Este número aparecerá en la sección de ayuda y soporte de la aplicación.
            </p>
          </div>

          {phoneContact && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Última actualización: {formatDate(phoneContact.updated_at)}
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="inline-block mr-2 animate-spin">⟳</span>
                  Guardando...
                </>
              ) : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* Sección de Vista Previa - Solo mostramos soporte */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Vista Previa
        </h2>
        <div className="p-6 border border-gray-200 rounded-lg dark:border-gray-700">
          <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">
            Soporte
          </h3>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.997 3.997 0 00.078-2.183l1.562-1.562C15.802 8.249 16 9.1 16 10zm-5.165 3.913l1.58 1.58A5.98 5.98 0 0110 16a5.976 5.976 0 01-2.516-.552l1.562-1.562a4.006 4.006 0 001.789.027zm-4.677-2.796a4.002 4.002 0 01-.041-2.08l-.08.08-1.53-1.533A5.98 5.98 0 004 10c0 .954.223 1.856.619 2.657l1.54-1.54zm1.088-6.45A5.974 5.974 0 0110 4c.954 0 1.856.223 2.657.619l-1.54 1.54a4.002 4.002 0 00-2.346.033L7.246 4.668zM12 10a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
            </svg>
            <a href={`tel:${formData.support_number}`} className="text-lg hover:underline">
              {formData.support_number || 'No configurado'}
            </a>
          </div>
        </div>
      </div>

      {/* Comentado: Sección de ventas
      <div className="p-6 border border-gray-200 rounded-lg dark:border-gray-700">
        <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">
          Ventas
        </h3>
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          <a href={`tel:${formData.sales_number}`} className="text-lg hover:underline">
            {formData.sales_number || 'No configurado'}
          </a>
        </div>
      </div>
      */}
    </div>
  );
};

export default ContactPhonePage;