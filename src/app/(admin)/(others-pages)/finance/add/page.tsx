'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Select from '@/components/form/Select';
import { EyeCloseIcon, EyeIcon } from '@/icons';
import { fetchApi } from '@/app/lib/data';
import Link from 'next/link';
import Alert from '@/components/ui/alert/Alert';
import { useStore } from "@/store/useStore";

// Interfaz para formulario de empleados de finanzas
interface FinanceFormData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  password: string;
  role: 'FINANCE';
  branch: string;
  finance_level: 'analyst' | 'supervisor' | 'manager';
  can_authorize_discounts: boolean;
  can_close_register: boolean;
  
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
  branch?: string;
  finance_level?: string;
}

interface Branch {
  id: number;
  name: string;
  code: string;
}

const AddFinancePage = () => {
  const router = useRouter();
  const { user } = useStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [userBranch, setUserBranch] = useState<Branch | null>(null);
  const [isBranchManager, setIsBranchManager] = useState(false);

  const [formData, setFormData] = useState<FinanceFormData>({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    password: '',
    role: 'FINANCE',
    branch: '',
    finance_level: 'analyst',
    can_authorize_discounts: true,
    can_close_register: true,
    device_id: 'web-admin',
    device_type: 'WEB'
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Cargar sucursales
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetchApi<{ results: Branch[] }>('/api/branches/');
        if (response && response.results) {
          // Si el usuario es gerente de sucursal, filtrar solo su sucursal
          if (user?.role === 'BRANCH_MANAGER') {
            setIsBranchManager(true);
            
            // Buscar la sucursal que corresponde al gerente
            const managerBranch = response.results.find(branch => 
              branch.name.toLowerCase().includes('microcentro') || 
              branch.code.toLowerCase().includes('microcentro')
            ) || response.results[0]; // Fallback a la primera si no encuentra
            
            setUserBranch(managerBranch);
            setBranches([managerBranch]); // Solo mostrar la sucursal del gerente
            
            // Pre-seleccionar la sucursal del gerente
            setFormData(prev => ({
              ...prev,
              branch: managerBranch.id.toString()
            }));
          } else {
            // Si es super admin o administrador, mostrar todas las sucursales
            setBranches(response.results);
          }
        }
      } catch {
        setAlertMessage('Error al cargar las sucursales');
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [user?.role]);

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
    if (!formData.branch) newErrors.branch = 'La sucursal es requerida';
    if (!formData.finance_level) newErrors.finance_level = 'El nivel financiero es requerido';
    
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

      // Primero crear el usuario
      const userResponse = await fetchApi<{ ok: boolean; user: { id: number } }>('/api/auth/register/', {
        method: 'POST',
        body: dataToSend
      });

      if (userResponse && userResponse.ok && userResponse.user && userResponse.user.id) {
        console.log('Usuario creado exitosamente:', userResponse);
        
        // Luego crear el perfil de empleado de finanzas
        const financeData = {
          user_id: userResponse.user.id,
          branch: parseInt(formData.branch),
          finance_level: formData.finance_level,
          can_authorize_discounts: formData.can_authorize_discounts,
          can_close_register: formData.can_close_register
        };

        console.log('Datos del empleado de finanzas a enviar:', financeData);

        // Intentar crear el empleado de finanzas con fetch directo para ver el error
        try {
          const jwt_token = localStorage.getItem("token");
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          
          const response = await fetch(`${baseUrl}/api/finance/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${jwt_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(financeData)
          });

          console.log('Response status:', response.status);
          console.log('Response headers:', response.headers);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            setAlertMessage(`Error al crear el empleado de finanzas: ${response.status} - ${errorText}`);
            return;
          }

          const financeResponse = await response.json();
          console.log('Empleado de finanzas creado exitosamente:', financeResponse);
          router.push('/finance');
        } catch (fetchError) {
          console.error('Error en fetch directo:', fetchError);
          setAlertMessage(`Error en la petición: ${fetchError instanceof Error ? fetchError.message : 'Error desconocido'}`);
        }
      } else {
        console.error('Error: No se recibió respuesta válida al crear el usuario');
        setAlertMessage('Error al crear el usuario. Inténtalo de nuevo.');
      }
    } catch (error) {
      console.error('Error completo:', error);
      setAlertMessage(`Error al crear el empleado de finanzas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/finance');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <Link
          href="/finance"
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
          <span>Volver a empleados de finanzas</span>
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
          Crear Nuevo Empleado de Finanzas
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
              <Label>
                Sucursal
                {isBranchManager && userBranch && (
                  <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                    (Tu sucursal)
                  </span>
                )}
              </Label>
              <Select
                name="branch"
                value={formData.branch}
                onChange={(value: string) => {
                  setFormData(prev => ({ ...prev, branch: value }));
                  if (errors.branch) {
                    setErrors(prev => ({ ...prev, branch: undefined }));
                  }
                }}
                error={!!errors.branch}
                disabled={loadingBranches || isBranchManager}
                options={branches.map((branch) => ({
                  value: branch.id.toString(),
                  label: `${branch.name} (${branch.code})`
                }))}
                placeholder={isBranchManager ? "Sucursal asignada automáticamente" : "Seleccione una sucursal"}
              />
              {errors.branch && (
                <span className="text-xs text-red-500">{errors.branch}</span>
              )}
              {isBranchManager && userBranch && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Como gerente de sucursal, solo puedes agregar empleados de finanzas a tu sucursal: <strong>{userBranch.name}</strong>
                </p>
              )}
            </div>

            <div>
              <Label>Nivel Financiero</Label>
              <Select
                name="finance_level"
                value={formData.finance_level}
                onChange={(value: string) => {
                  setFormData(prev => ({ ...prev, finance_level: value as 'analyst' | 'supervisor' | 'manager' }));
                  if (errors.finance_level) {
                    setErrors(prev => ({ ...prev, finance_level: undefined }));
                  }
                }}
                error={!!errors.finance_level}
                options={[
                  { value: 'analyst', label: 'Analista Financiero' },
                  { value: 'supervisor', label: 'Supervisor Financiero' },
                  { value: 'manager', label: 'Gerente Financiero' }
                ]}
                placeholder="Seleccione el nivel financiero"
              />
              {errors.finance_level && (
                <span className="text-xs text-red-500">{errors.finance_level}</span>
              )}
            </div>
          </div>

          {/* Campos de permisos */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="can_authorize_discounts"
                name="can_authorize_discounts"
                checked={formData.can_authorize_discounts}
                onChange={(e) => setFormData(prev => ({ ...prev, can_authorize_discounts: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="can_authorize_discounts" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Puede autorizar descuentos
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="can_close_register"
                name="can_close_register"
                checked={formData.can_close_register}
                onChange={(e) => setFormData(prev => ({ ...prev, can_close_register: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="can_close_register" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Puede cerrar caja
              </Label>
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
              disabled={isSubmitting || loadingBranches}
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
                'Crear Empleado de Finanzas'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFinancePage;
