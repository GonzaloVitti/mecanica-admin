'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import { EyeCloseIcon, EyeIcon } from '@/icons';
import { fetchApi } from '@/app/lib/data';
import Link from 'next/link';

// Interfaz para formulario específico de conductores
interface DriverFormData {
  // Datos del usuario
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  password: string;
  role: 'DRIVER';
  
  // Datos específicos del conductor
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  
  // Archivos
  profile_picture?: File | null;
  personal_id_front: File | null;
  personal_id_back: File | null;
  driver_license_front: File | null;
  driver_license_back: File | null;
  
  // Campos para el dispositivo (requeridos por la API)
  device_id: string;
  device_type: string;
}

interface FormErrors {
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  password?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  profile_picture?: string;
  personal_id_front?: string;
  personal_id_back?: string;
  driver_license_front?: string;
  driver_license_back?: string;
}

const AddDriverPage = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<DriverFormData>({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    password: '',
    role: 'DRIVER',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    profile_picture: null,
    personal_id_front: null,
    personal_id_back: null,
    driver_license_front: null,
    driver_license_back: null,
    device_id: 'web-admin',
    device_type: 'WEB'
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [fileLabels, setFileLabels] = useState({
    personal_id_front: 'Seleccionar imagen',
    personal_id_back: 'Seleccionar imagen',
    driver_license_front: 'Seleccionar imagen',
    driver_license_back: 'Seleccionar imagen',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
        
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    
    if (files && files.length > 0) {
      const file = files[0];
      setFormData(prev => ({
        ...prev,
        [name]: file
      }));
      
      // Actualizar la etiqueta del archivo
      setFileLabels(prev => ({
        ...prev,
        [name]: file.name
      }));
      
      if (errors[name as keyof FormErrors]) {
        setErrors(prev => ({
          ...prev,
          [name]: undefined
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validar campos requeridos del usuario
    if (!formData.username) newErrors.username = 'El nombre de usuario es requerido';
    if (!formData.first_name) newErrors.first_name = 'El nombre es requerido';
    if (!formData.last_name) newErrors.last_name = 'El apellido es requerido';
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    // Validar campos requeridos del conductor
    if (!formData.address) {
      newErrors.address = 'La dirección es requerida';
    }
    if (!formData.emergency_contact_name) {
      newErrors.emergency_contact_name = 'El nombre de contacto de emergencia es requerido';
    }
    if (!formData.emergency_contact_phone) {
      newErrors.emergency_contact_phone = 'El teléfono de contacto de emergencia es requerido';
    }

    // Validar archivos
/*     if (!formData.profile_picture) {
      newErrors.profile_picture = 'La foto de perfil es requerida';
    } */
    if (!formData.personal_id_front) {
      newErrors.personal_id_front = 'La imagen frontal de la identificación es requerida';
    }
    if (!formData.personal_id_back) {
      newErrors.personal_id_back = 'La imagen trasera de la identificación es requerida';
    }
    if (!formData.driver_license_front) {
      newErrors.driver_license_front = 'La imagen frontal de la licencia de conducir es requerida';
    }
    if (!formData.driver_license_back) {
      newErrors.driver_license_back = 'La imagen trasera de la licencia de conducir es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Crear un FormData para enviar los archivos
      const formDataToSend = new FormData();
      
      // Añadir campos del usuario
      formDataToSend.append('email', formData.email);
      formDataToSend.append('username', formData.username);
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('phone_number', formData.phone_number);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('role', 'DRIVER');
      
      // Añadir campos del conductor
      formDataToSend.append('address', formData.address);
      formDataToSend.append('emergency_contact_name', formData.emergency_contact_name);
      formDataToSend.append('emergency_contact_phone', formData.emergency_contact_phone);
      
      // Añadir device info
      formDataToSend.append('device_id', formData.username + "-web-admin");
      formDataToSend.append('device_type', 'WEB');
      
      // Añadir archivos
/*       if (formData.profile_picture) {
        formDataToSend.append('profile_picture', formData.profile_picture);
      } */
      if (formData.personal_id_front) {
        formDataToSend.append('personal_id_front', formData.personal_id_front);
      }
      if (formData.personal_id_back) {
        formDataToSend.append('personal_id_back', formData.personal_id_back);
      }
      if (formData.driver_license_front) {
        formDataToSend.append('driver_license_front', formData.driver_license_front);
      }
      if (formData.driver_license_back) {
        formDataToSend.append('driver_license_back', formData.driver_license_back);
      }

      // Llamar al endpoint de registro
      const response = await fetchApi('/api/auth/register/', {
        method: 'POST',
        body: formDataToSend,
        isFormData: true
      });

      if (response) {
        router.push('/drivers');
      }
    } catch (error) {
      console.error('Error al crear conductor:', error);
      // Aquí podrías mostrar un mensaje de error más detallado
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/drivers');
  };

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
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Crear Nuevo Conductor
        </h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Información Personal</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <Label>Nombre de Usuario</Label>
                <Input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Ingrese nombre de usuario"
                  error={!!errors.username}
                />
                {errors.username && (
                  <span className="text-xs text-red-500">{errors.username}</span>
                )}
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="ejemplo@correo.com"
                  error={!!errors.email}
                />
                {errors.email && (
                  <span className="text-xs text-red-500">{errors.email}</span>
                )}
              </div>

              <div>
                <Label>Contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Ingrese la contraseña"
                    error={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <span className="text-xs text-red-500">{errors.password}</span>
                )}
              </div>

              <div>
                <Label>Nombre</Label>
                <Input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="Ingrese el nombre"
                  error={!!errors.first_name}
                />
                {errors.first_name && (
                  <span className="text-xs text-red-500">{errors.first_name}</span>
                )}
              </div>

              <div>
                <Label>Apellido</Label>
                <Input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Ingrese el apellido"
                  error={!!errors.last_name}
                />
                {errors.last_name && (
                  <span className="text-xs text-red-500">{errors.last_name}</span>
                )}
              </div>

              <div>
                <Label>Teléfono</Label>
                <Input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  placeholder="Ingrese el teléfono"
                  error={!!errors.phone_number}
                />
                {errors.phone_number && (
                  <span className="text-xs text-red-500">{errors.phone_number}</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Información del Conductor</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Dirección</Label>
                <Input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Ingrese la dirección completa"
                  error={!!errors.address}
                />
                {errors.address && (
                  <span className="text-xs text-red-500">{errors.address}</span>
                )}
              </div>

              <div>
                <Label>Nombre del contacto de emergencia</Label>
                <Input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleInputChange}
                  placeholder="Nombre de contacto de emergencia"
                  error={!!errors.emergency_contact_name}
                />
                {errors.emergency_contact_name && (
                  <span className="text-xs text-red-500">{errors.emergency_contact_name}</span>
                )}
              </div>

              <div>
                <Label>Teléfono del contacto de emergencia</Label>
                <Input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleInputChange}
                  placeholder="Teléfono de contacto de emergencia"
                  error={!!errors.emergency_contact_phone}
                />
                {errors.emergency_contact_phone && (
                  <span className="text-xs text-red-500">{errors.emergency_contact_phone}</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Documentos</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
{/*               <div>
                <Label>Foto de Perfil</Label>
                <div className="relative">
                  <input
                    type="file"
                    name="profile_picture"
                    id="profile_picture"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className={`flex items-center justify-between px-4 py-2 border rounded-md ${errors.profile_picture ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} text-sm text-gray-500 dark:text-gray-400`}>
                    <span className="truncate">{fileLabels.profile_picture}</span>
                    <span className="ml-2 text-blue-600 dark:text-blue-400">Examinar</span>
                  </div>
                </div>
                {errors.profile_picture && (
                  <span className="text-xs text-red-500">{errors.profile_picture}</span>
                )}
              </div> */}

              <div>
                <Label>Identificación (Frente)</Label>
                <div className="relative">
                  <input
                    type="file"
                    name="personal_id_front"
                    id="personal_id_front"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className={`flex items-center justify-between px-4 py-2 border rounded-md ${errors.personal_id_front ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} text-sm text-gray-500 dark:text-gray-400`}>
                    <span className="truncate">{fileLabels.personal_id_front}</span>
                    <span className="ml-2 text-blue-600 dark:text-blue-400">Examinar</span>
                  </div>
                </div>
                {errors.personal_id_front && (
                  <span className="text-xs text-red-500">{errors.personal_id_front}</span>
                )}
              </div>

              <div>
                <Label>Identificación (Reverso)</Label>
                <div className="relative">
                  <input
                    type="file"
                    name="personal_id_back"
                    id="personal_id_back"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className={`flex items-center justify-between px-4 py-2 border rounded-md ${errors.personal_id_back ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} text-sm text-gray-500 dark:text-gray-400`}>
                    <span className="truncate">{fileLabels.personal_id_back}</span>
                    <span className="ml-2 text-blue-600 dark:text-blue-400">Examinar</span>
                  </div>
                </div>
                {errors.personal_id_back && (
                  <span className="text-xs text-red-500">{errors.personal_id_back}</span>
                )}
              </div>

              <div>
                <Label>Licencia de Conducir (Frente)</Label>
                <div className="relative">
                  <input
                    type="file"
                    name="driver_license_front"
                    id="driver_license_front"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className={`flex items-center justify-between px-4 py-2 border rounded-md ${errors.driver_license_front ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} text-sm text-gray-500 dark:text-gray-400`}>
                    <span className="truncate">{fileLabels.driver_license_front}</span>
                    <span className="ml-2 text-blue-600 dark:text-blue-400">Examinar</span>
                  </div>
                </div>
                {errors.driver_license_front && (
                  <span className="text-xs text-red-500">{errors.driver_license_front}</span>
                )}
              </div>

              <div>
                <Label>Licencia de Conducir (Reverso)</Label>
                <div className="relative">
                  <input
                    type="file"
                    name="driver_license_back"
                    id="driver_license_back"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className={`flex items-center justify-between px-4 py-2 border rounded-md ${errors.driver_license_back ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} text-sm text-gray-500 dark:text-gray-400`}>
                    <span className="truncate">{fileLabels.driver_license_back}</span>
                    <span className="ml-2 text-blue-600 dark:text-blue-400">Examinar</span>
                  </div>
                </div>
                {errors.driver_license_back && (
                  <span className="text-xs text-red-500">{errors.driver_license_back}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="inline w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creando...
                </>
              ) : (
                'Crear Conductor'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDriverPage;