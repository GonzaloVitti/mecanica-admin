'use client'
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Button from "@/components/ui/button/Button";
import Badge from '@/components/ui/badge/Badge';
import Alert from '@/components/ui/alert/Alert';
import { fetchApi } from '@/app/lib/data';
import { useStore } from '@/store/useStore';

// Interfaz para el mecánico
interface Mechanic {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_verified: boolean;
  role: 'MECHANIC';
  date_joined: string;
  is_active: boolean;
  profile_picture?: string;
}

// Interfaz para las alertas
interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// Interfaz para el formulario de edición
interface EditFormData {
  first_name: string;
  last_name: string;
  phone_number: string;
  profile_picture?: File | null;
}

const MechanicDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const { user } = useStore();
  const mechanicId = params.id as string;

  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  const [editFormData, setEditFormData] = useState<EditFormData>({
    first_name: '',
    last_name: '',
    phone_number: '',
    profile_picture: null
  });

  const [errors, setErrors] = useState<Partial<EditFormData>>({});

  // Función para mostrar alertas
  const showAlert = (type: AlertState['type'], title: string, message: string) => {
    setAlert({ show: true, type, title, message });
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Cargar datos del mecánico
  const loadMechanic = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<Mechanic>(`/users/${mechanicId}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (data) {
        if (data.role !== 'MECHANIC') {
          showAlert('error', 'Error', 'El usuario seleccionado no es un mecánico');
          router.push('/mechanics');
          return;
        }
        setMechanic(data);
        setEditFormData({
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number || '',
          profile_picture: null
        });
      } else {
        showAlert('error', 'Error', 'No se pudo cargar la información del mecánico');
        router.push('/mechanics');
      }
    } catch (error) {
      console.error('Error loading mechanic:', error);
      showAlert('error', 'Error', 'Error de conexión al cargar el mecánico');
    } finally {
      setLoading(false);
    }
  };

  // Validar formulario de edición
  const validateEditForm = (): boolean => {
    const newErrors: Partial<EditFormData> = {};

    if (!editFormData.first_name.trim()) {
      newErrors.first_name = 'El nombre es requerido';
    }

    if (!editFormData.last_name.trim()) {
      newErrors.last_name = 'El apellido es requerido';
    }

    if (editFormData.phone_number && !/^\+?[\d\s\-\(\)]+$/.test(editFormData.phone_number)) {
      newErrors.phone_number = 'El número de teléfono no es válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name as keyof EditFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // Manejar cambio de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEditFormData(prev => ({
      ...prev,
      profile_picture: file
    }));
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!validateEditForm()) {
      showAlert('error', 'Error de validación', 'Por favor corrige los errores en el formulario');
      return;
    }

    setSaving(true);

    try {
      // Actualizar perfil
      const profileData = new FormData();
      profileData.append('first_name', editFormData.first_name);
      profileData.append('last_name', editFormData.last_name);
      profileData.append('phone_number', editFormData.phone_number);

      const profileResponse = await fetchApi(`/users/${mechanicId}/update_profile/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
        body: profileData,
        isFormData: true,
      });

      if (!profileResponse) {
        throw new Error('Error updating profile');
      }

      // Actualizar foto de perfil si se seleccionó una nueva
      if (editFormData.profile_picture) {
        const pictureData = new FormData();
        pictureData.append('profile_picture', editFormData.profile_picture);

        const pictureResponse = await fetchApi(`/users/${mechanicId}/update_profile_picture/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user?.access_token}`,
          },
          body: pictureData,
          isFormData: true,
        });

        if (!pictureResponse) {
          throw new Error('Error updating profile picture');
        }
      }

      showAlert('success', 'Éxito', 'Información del mecánico actualizada correctamente');
      setEditMode(false);
      loadMechanic();
    } catch (error) {
      console.error('Error saving mechanic:', error);
      showAlert('error', 'Error', 'No se pudo actualizar la información del mecánico');
    } finally {
      setSaving(false);
    }
  };

  // Cambiar estado activo
  const toggleActiveStatus = async () => {
    try {
      const data = await fetchApi(`/users/${mechanicId}/toggle_active_status/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (data) {
        showAlert('success', 'Éxito', 'Estado del mecánico actualizado correctamente');
        loadMechanic();
      } else {
        showAlert('error', 'Error', 'No se pudo actualizar el estado del mecánico');
      }
    } catch (error) {
      console.error('Error toggling active status:', error);
      showAlert('error', 'Error', 'Error de conexión al actualizar el estado');
    }
  };

  // Cambiar estado verificado
  const toggleVerifiedStatus = async () => {
    try {
      const data = await fetchApi(`/users/${mechanicId}/toggle_verified_status/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (data) {
        showAlert('success', 'Éxito', 'Estado de verificación actualizado correctamente');
        loadMechanic();
      } else {
        showAlert('error', 'Error', 'No se pudo actualizar el estado de verificación');
      }
    } catch (error) {
      console.error('Error toggling verified status:', error);
      showAlert('error', 'Error', 'Error de conexión al actualizar la verificación');
    }
  };

  // Efectos
  useEffect(() => {
    if (mechanicId) {
      loadMechanic();
    }
  }, [mechanicId]);

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-lg">Cargando información del mecánico...</span>
        </div>
      </div>
    );
  }

  if (!mechanic) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Mecánico no encontrado
          </h1>
          <Button onClick={() => router.push('/mechanics')}>
            Volver a Mecánicos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Alerta */}
      {alert.show && (
        <div className="mb-6">
          <Alert
            variant={alert.type}
            title={alert.title}
            message={alert.message}
            onClose={() => setAlert(prev => ({ ...prev, show: false }))}
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            onClick={() => router.push('/mechanics')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Volver a Mecánicos
          </Button>
          
          <div className="flex space-x-2">
            {!editMode && (
              <Button
                variant="outline"
                onClick={() => setEditMode(true)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Editar
              </Button>
            )}
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mechanic.first_name} {mechanic.last_name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Información detallada del mecánico
        </p>
      </div>

      {/* Contenido Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del Perfil */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-center">
              <div className="mb-4">
                {mechanic.profile_picture ? (
                  <img
                    className="h-32 w-32 rounded-full object-cover mx-auto"
                    src={mechanic.profile_picture}
                    alt={`${mechanic.first_name} ${mechanic.last_name}`}
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center mx-auto">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-16 w-16 text-gray-500 dark:text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {mechanic.first_name} {mechanic.last_name}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">@{mechanic.username}</p>
              
              <div className="mt-4 space-y-2">
                <Badge
                  color={mechanic.is_active ? 'success' : 'error'}
                >
                  {mechanic.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
                
                <Badge
                  color={mechanic.is_verified ? 'success' : 'warning'}
                >
                  {mechanic.is_verified ? 'Verificado' : 'Pendiente'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Información Detallada */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {editMode ? (
              /* Modo Edición */
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Editar Información
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={editFormData.first_name}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                          errors.first_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {errors.first_name && (
                        <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Apellido *
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={editFormData.last_name}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                          errors.last_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {errors.last_name && (
                        <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      name="phone_number"
                      value={editFormData.phone_number}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.phone_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {errors.phone_number && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nueva Foto de Perfil
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditMode(false);
                      setEditFormData({
                        first_name: mechanic.first_name,
                        last_name: mechanic.last_name,
                        phone_number: mechanic.phone_number || '',
                        profile_picture: null
                      });
                      setErrors({});
                    }}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="min-w-[100px]"
                  >
                    {saving ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </div>
                    ) : (
                      'Guardar'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* Modo Vista */
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Información Personal
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        Email
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {mechanic.email}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        Nombre de Usuario
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        @{mechanic.username}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        Teléfono
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {mechanic.phone_number || 'No especificado'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        Rol
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        Mecánico
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        Fecha de Registro
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {formatDate(mechanic.date_joined)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        Estado
                      </label>
                      <div className="mt-1">
                        <Badge color={mechanic.is_active ? 'success' : 'error'}>
                          {mechanic.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                        <Badge 
                          color={mechanic.is_verified ? 'success' : 'warning'}
                        >
                          {mechanic.is_verified ? 'Verificado' : 'Pendiente'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MechanicDetailPage;