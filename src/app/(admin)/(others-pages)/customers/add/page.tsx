'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import { EyeCloseIcon, EyeIcon } from '@/icons';
import { fetchApi } from '@/app/lib/data';
import Link from 'next/link';
import Alert from '@/components/ui/alert/Alert';

// Interfaz para formulario de clientes (igual que passengers/drivers)
interface CustomerFormData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  password: string;
  role: 'CUSTOMER';
  address: string;
  tax_id: string;
  tax_condition: string;
  
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
  tax_id?: string;
  tax_condition?: string;
}

const AddCustomerPage = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<CustomerFormData>({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    password: '',
    role: 'CUSTOMER',
    address: '',
    tax_id: '',
    tax_condition: 'CF',
    device_id: 'web-admin',
    device_type: 'WEB'
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar errores
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
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
      const uniqueDeviceId = formData.username + "-web-admin";

      const dataToSend = {
        ...formData,
        device_id: uniqueDeviceId,
        device_type: 'WEB',
      };

      console.log('Datos a enviar:', {
        ...dataToSend,
        password: '[OCULTO]'
      });

      const response = await fetchApi('/api/auth/register/', {
        method: 'POST',
        body: dataToSend
      });

      if (response) {
        router.push('/customers');
      }
    } catch (error) {
      console.error('Error al crear cliente:', error);
      setAlertMessage('Error al crear el cliente. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/customers');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <Link
          href="/customers"
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
          <span>Volver a clientes</span>
        </Link>
      </div>

      {alertMessage && (
        <div className="mb-4">
          <Alert
            variant="error"
            title="Error"
            message={alertMessage}
          />
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Crear Nuevo Cliente
        </h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Campos para usuario */}
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

            <div>
              <Label>DNI/CUIT</Label>
              <Input
                type="text"
                name="tax_id"
                value={formData.tax_id}
                onChange={handleInputChange}
                placeholder="Ingrese DNI o CUIT"
                error={!!errors.tax_id}
              />
              {errors.tax_id && (
                <span className="text-xs text-red-500">{errors.tax_id}</span>
              )}
            </div>

            <div>
              <Label>Condición de Venta ARCA</Label>
              <select
                name="tax_condition"
                value={formData.tax_condition}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="CF">Consumidor Final</option>
                <option value="RI">Responsable Inscripto</option>
                <option value="MONO">Monotributista</option>
                <option value="EXENTO">Exento frente al IVA</option>
              </select>
              {errors.tax_condition && (
                <span className="text-xs text-red-500">{errors.tax_condition}</span>
              )}
            </div>

            <div className="md:col-span-2">
              <Label>Dirección</Label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Dirección completa del cliente"
              />
              {errors.address && (
                <span className="text-xs text-red-500">{errors.address}</span>
              )}
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
                'Crear Cliente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCustomerPage;