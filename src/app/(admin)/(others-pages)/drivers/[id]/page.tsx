'use client'
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/app/lib/data';
import Badge from '@/components/ui/badge/Badge';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import WhatsAppLink from '@/components/whatsapp/WhatsAppLink';

// Interfaz para el usuario anidado dentro del conductor
interface UserData {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_verified: boolean;
  is_active: boolean;
  role: 'DRIVER';
  date_joined: string;
  profile_picture?: string;
}

// Interfaz para el conductor
interface Driver {
  id: number;
  user: UserData;
  profile_picture?: string | null;
  personal_id_front: string | null;
  personal_id_back: string | null;
  driver_license_front: string | null;
  driver_license_back: string | null;
  push_token?: string;
  working: boolean;
  has_trip: boolean;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  rating: string;
  switch?: number;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_update: string | null;
}

// Interfaz para el formulario de edición
interface DriverFormData {
  first_name: string;
  last_name: string;
  phone_number: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  is_verified: boolean;
  is_active: boolean;
  working: boolean;
  profile_picture: File | null;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Componente para mostrar una imagen con vista previa al hacer clic
const DocumentImage = ({ url, title }: { url: string | null, title: string }) => {
  const [showPreview, setShowPreview] = useState(false);

  if (!url) return (
    <div className="flex items-center justify-center w-full h-40 bg-gray-100 rounded-lg dark:bg-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">Sin documento</p>
    </div>
  );

  return (
    <>
      <div className="relative">
        <div className="relative h-40 w-full overflow-hidden rounded-lg cursor-pointer" onClick={() => setShowPreview(true)}>
          <img
            src={url}
            alt={title}
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
        </div>
        <div className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">{title}</div>
      </div>

      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              className="absolute top-2 right-2 bg-white rounded-full p-2"
              onClick={() => setShowPreview(false)}
            >
              <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <img
              src={url}
              alt={title}
              className="max-h-[90vh] max-w-full mx-auto object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};

const DriverDetail = () => {
  const { isOpen, openModal, closeModal } = useModal();
  const params = useParams();
  const driverId = params.id;
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<DriverFormData>({
    first_name: '',
    last_name: '',
    phone_number: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    is_verified: false,
    is_active: false,
    working: false,
    profile_picture: null
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  
  const { isOpen: isResetPasswordOpen, openModal: openResetPasswordModal, closeModal: closeResetPasswordModal } = useModal();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [isDriverActive, setIsDriverActive] = useState(driver?.user.is_active || false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleResetPasswordClick = () => {
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    openResetPasswordModal();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "newPassword") {
      setNewPassword(value);
    } else if (name === "confirmPassword") {
      setConfirmPassword(value);
    }
  };

  // Modificar el método handleResetPasswordSubmit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }

    // Validar que la contraseña tenga al menos 8 caracteres
    if (newPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setResetLoading(true);

    try {
      // Probar con un formato diferente para la solicitud
      await fetchApi("/api/users/change_password/", {
        method: "POST",
        body: {
          // Probar diferentes combinaciones de campos
          id: driver?.user.id,
          user_id: driver?.user.id,
          password: newPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        }
      });

      // Mostrar mensaje de éxito y cerrar el modal
      alert("Contraseña restablecida con éxito");
      closeResetPasswordModal();
    } catch {
      console.error('Error al restablecer contraseña:');

    } finally {
      setResetLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      setFormData(prev => ({
        ...prev,
        profile_picture: file
      }));
      
      // Crear vista previa de la imagen
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Cargar datos del conductor
  useEffect(() => {
    const fetchDriver = async () => {
      try {
        setLoading(true);
        const response = await fetchApi<Driver>(`/api/drivers/${driverId}/`);
        if (response) {
          console.log("Conductor cargado:", response);
          setDriver(response);
        }
      } catch (err) {
        setError('Error al cargar el conductor');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (driverId) {
      fetchDriver();
    }
  }, [driverId]);

  // Actualizar formData cuando se cargan los datos del conductor
  useEffect(() => {
    if (driver) {
      setFormData({
        first_name: driver.user.first_name,
        last_name: driver.user.last_name,
        phone_number: driver.user.phone_number,
        address: driver.address,
        emergency_contact_name: driver.emergency_contact_name,
        emergency_contact_phone: driver.emergency_contact_phone,
        is_verified: driver.user.is_verified,
        is_active: driver.user.is_active,
        working: driver.working,
        profile_picture: null
      });
      setIsDriverActive(driver.user.is_active);
      
      // Inicializar la vista previa con la imagen actual del conductor si existe
      setProfilePicturePreview(driver.user.profile_picture || null);
    }
  }, [driver]);

  const handleOpenModal = () => {
    if (driver) {
      console.log("Abriendo modal con datos:", formData);
      openModal();
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'file') {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        setFormData(prev => ({
          ...prev,
          [name]: files[0]
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }));
    }
  };

  // Función mejorada para cambiar el estado del conductor
  const handleToggleDriverStatus = async (driver: Driver) => {
    console.log("Cambiando estado del conductor:", driver);

    // Cambiar el estado local inmediatamente para feedback visual
    setIsDriverActive(!isDriverActive);

    try {
      // Llamada a la API para cambiar el estado
      await fetchApi(`/api/users/${driver.user.id}/toggle_active_status/`, {
        method: 'POST',
        body: {}
      });

      // No es necesario recargar toda la página
      // window.location.reload();

      // Opcional: mostrar notificación de éxito
      console.log("Estado cambiado correctamente");
      window.location.reload();
    }
    catch (error) {
      console.error('Error al cambiar el estado del conductor:', error);

      // Si hay error, revertir el cambio visual
      setIsDriverActive(!isDriverActive);

      // Opcional: mostrar mensaje de error
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);

    try {
      // 1. Si hay una nueva foto de perfil, actualizarla primero
      if (formData.profile_picture) {
        const pictureFormData = new FormData();
        pictureFormData.append('profile_picture', formData.profile_picture);
        
        await fetchApi(`/api/users/${driver?.user.id}/update_profile_picture/`, {
          method: 'POST',
          body: pictureFormData,
          isFormData: true
        });
      }

      // 2. Actualizar datos del usuario directamente
      const userUpdateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number
      };

      // Actualizar datos del usuario con PATCH
      await fetchApi(`/api/users/${driver?.user.id}/`, {
        method: 'PATCH',
        body: userUpdateData
      });

      // 3. Actualizar datos específicos del conductor
      const driverUpdateData = {
        address: formData.address,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        working: formData.working
      };

      // Actualizar datos del conductor con PATCH
      await fetchApi(`/api/drivers/${driverId}/`, {
        method: 'PATCH',
        body: driverUpdateData
      });

      // 4. Actualizar estado de verificación si cambió
      if (driver && formData.is_verified !== driver.user.is_verified) {
        await fetchApi(`/api/users/${driver.user.id}/toggle_verified_status/`, {
          method: 'POST',
          body: {}
        });
      }

      // 5. Actualizar estado de activación si cambió
      if (driver && formData.is_active !== driver.user.is_active) {
        await fetchApi(`/api/users/${driver.user.id}/toggle_active_status/`, {
          method: 'POST',
          body: {}
        });
      }

      // 6. Recargar los datos actualizados
      const updatedDriver = await fetchApi<Driver>(`/api/drivers/${driverId}/`);
      if (updatedDriver) {
        setDriver(updatedDriver);
        closeModal();
      }
    } catch (err) {
      setError('Error al actualizar el conductor');
      console.error('Error:', err);
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="p-4 text-red-500">
        {error || 'Conductor no encontrado'}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <Link
          href="/drivers"
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
          <span>Volver a conductores</span>
        </Link>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="p-5 lg:p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Detalle de Conductor
            </h3>
            <div className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span>Activar o desactivar conductor</span>

                <span
                  onClick={() => handleToggleDriverStatus(driver)}
                  className={`cursor-pointer px-3 py-2 rounded-md ${driver.user.is_active
                    ? 'text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                    : 'text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                    }`}
                >
                  {driver.user.is_active ? "Desactivar" : "Activar"}
                </span>
              </div>
            </div>
            <div className="space-x-3">
              <button
                onClick={handleResetPasswordClick}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Restablecer contraseña
              </button>
              <button
                onClick={handleOpenModal}
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

          {/* Perfil del Conductor */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
                {/* Foto de perfil */}
                <div className="relative w-24 h-24 xl:w-28 xl:h-28">
                  {driver.user.profile_picture ? (
                    <img
                      src={driver.user.profile_picture}
                      alt={`${driver.user.first_name} ${driver.user.last_name}`}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-medium">
                      {driver.user.first_name.charAt(0)}{driver.user.last_name.charAt(0)}
                    </div>
                  )}
                  <div className={`absolute -right-1 -bottom-1 h-6 w-6 rounded-full ${driver.working ? 'bg-green-500' : 'bg-red-500'} border-2 border-white`}></div>
                </div>

                <div className="order-3 xl:order-2">
                  <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                    {driver.user.first_name} {driver.user.last_name}
                  </h4>
                  <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {driver.user.email}
                    </span>
                    <span className="hidden xl:block text-gray-500 dark:text-gray-400">•</span>
                    <div className="flex items-center">
                      <span className="text-yellow-400 mr-1">★</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {driver.rating}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="hidden xl:block xl:ml-auto order-2 xl:order-3">
                  <Badge
                    size="md"
                    color={driver.working ? "success" : "warning"}
                  >
                    {driver.working ? "Disponible" : "No disponible"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Información Personal */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                Información Personal
              </h4>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Email
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {driver.user.email}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Teléfono
                  </p>
                  <WhatsAppLink
                    phoneNumber={driver.user.phone_number}
                    className="text-sm font-medium"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Dirección
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {driver.address || 'No especificada'}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Estado de la cuenta
                  </p>
                  <div className="flex gap-2">
                    <Badge
                      size="sm"
                      color={driver.user.is_verified ? "success" : "warning"}
                    >
                      {driver.user.is_verified ? "Verificado" : "No verificado"}
                    </Badge>
                    <Badge
                      size="sm"
                      color={driver.user.is_active ? "success" : "error"}
                    >
                      {driver.user.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Fecha de registro
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {formatDate(driver.user.date_joined)}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Usuario
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {driver.user.username}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contacto de Emergencia */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                Contacto de Emergencia
              </h4>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Nombre
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {driver.emergency_contact_name || 'No especificado'}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Teléfono
                  </p>
                  <WhatsAppLink
                    phoneNumber={driver.emergency_contact_phone}
                    className="text-sm font-medium text-gray-800 dark:text-white/90"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Documentos */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                Documentos
              </h4>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <DocumentImage
                  url={driver.personal_id_front}
                  title="Identificación (Frente)"
                />

                <DocumentImage
                  url={driver.personal_id_back}
                  title="Identificación (Reverso)"
                />

                <DocumentImage
                  url={driver.driver_license_front}
                  title="Licencia (Frente)"
                />

                <DocumentImage
                  url={driver.driver_license_back}
                  title="Licencia (Reverso)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={closeModal}>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="relative w-full max-w-[600px] max-h-[90vh] rounded-xl bg-white dark:bg-gray-800 p-6 flex flex-col">
            {/* Header - fijo en la parte superior */}
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                Editar Conductor
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

            {/* Contenido del formulario con scroll */}
            <div className="overflow-y-auto flex-grow pr-2 -mr-2">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Foto de perfil */}
                <div className="flex flex-col items-center mb-6">
                  <div className="mb-4 w-24 h-24 relative">
                    {profilePicturePreview ? (
                      <img
                        src={profilePicturePreview}
                        alt="Vista previa"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : driver.user.profile_picture ? (
                      <img
                        src={driver.user.profile_picture}
                        alt={`${driver.user.first_name} ${driver.user.last_name}`}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-medium">
                        {driver.user.first_name.charAt(0)}{driver.user.last_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  <Label htmlFor="profile_picture" className="mb-2">Foto de perfil</Label>
                  <input
                    type="file"
                    id="profile_picture"
                    name="profile_picture"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-400 dark:file:bg-gray-700 dark:file:text-gray-300"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG, GIF hasta 10MB
                  </p>
                </div>
                
                {/* Información Personal - 2 columnas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Primera fila */}
                  <div>
                    <Label htmlFor="first_name">Nombre</Label>
                    <Input
                      type="text"
                      name="first_name"
                      id="first_name"
                      defaultValue={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="Nombre"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Apellido</Label>
                    <Input
                      type="text"
                      name="last_name"
                      id="last_name"
                      defaultValue={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="Apellido"
                    />
                  </div>

                  {/* Segunda fila */}
                  <div>
                    <Label htmlFor="phone_number">Teléfono</Label>
                    <Input
                      type="tel"
                      name="phone_number"
                      id="phone_number"
                      defaultValue={formData.phone_number}
                      onChange={handleInputChange}
                      placeholder="Teléfono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      type="text"
                      name="address"
                      id="address"
                      defaultValue={formData.address}
                      onChange={handleInputChange}
                      placeholder="Dirección"
                    />
                  </div>

                  {/* Tercera fila */}
                  <div>
                    <Label htmlFor="emergency_contact_name">Contacto emergencia</Label>
                    <Input
                      type="text"
                      name="emergency_contact_name"
                      id="emergency_contact_name"
                      defaultValue={formData.emergency_contact_name}
                      onChange={handleInputChange}
                      placeholder="Nombre de contacto"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_phone">Teléfono emergencia</Label>
                    <Input
                      type="tel"
                      name="emergency_contact_phone"
                      id="emergency_contact_phone"
                      defaultValue={formData.emergency_contact_phone}
                      onChange={handleInputChange}
                      placeholder="Teléfono de contacto"
                    />
                  </div>
                </div>

                {/* Checkboxes - agrupados en una sección */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Estado de la cuenta</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_verified"
                        name="is_verified"
                        checked={formData.is_verified}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <Label htmlFor="is_verified">Verificado</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <Label htmlFor="is_active">Activo</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="working"
                        name="working"
                        checked={formData.working}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <Label htmlFor="working">Disponible</Label>
                    </div>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <p className="text-sm text-red-500">
                    {error}
                  </p>
                )}
              </form>
            </div>

            {/* Footer - fijo en la parte inferior */}
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={updateLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={updateLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateLoading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de restablecimiento de contraseña */}
      <Modal isOpen={isResetPasswordOpen} onClose={closeResetPasswordModal}>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="relative w-full max-w-[500px] rounded-xl bg-white dark:bg-gray-800 p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                Restablecer contraseña
              </h4>
              <button
                onClick={closeResetPasswordModal}
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
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <Input
                    type="password"
                    name="newPassword"
                    id="newPassword"
                    value={newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Nueva contraseña"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirmar contraseña"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {/* Error message */}
              {passwordError && (
                <p className="text-sm text-red-500">
                  {passwordError}
                </p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeResetPasswordModal}
                  disabled={resetLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? 'Restableciendo...' : 'Restablecer contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DriverDetail;