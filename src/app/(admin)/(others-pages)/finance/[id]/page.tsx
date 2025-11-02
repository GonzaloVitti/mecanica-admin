'use client'
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/app/lib/data';
import Badge from '@/components/ui/badge/Badge';

import Label from '@/components/form/Label';
import Select from '@/components/form/Select';
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { useStore } from "@/store/useStore";

// Interfaz para el usuario anidado dentro del empleado de finanzas
interface UserData {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_verified: boolean;
  is_active: boolean;
  role: 'FINANCE';
  date_joined: string;
  profile_picture?: string;
}

// Interfaz para el empleado de finanzas
interface Finance {
  id: number;
  user: UserData | null;
  branch: number; // ID de la sucursal
  branch_name: string; // Nombre de la sucursal
  finance_level: 'analyst' | 'supervisor' | 'manager';
  can_authorize_discounts: boolean;
  can_close_register: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Interfaz para el formulario de edición
interface FinanceFormData {
  finance_level: 'analyst' | 'supervisor' | 'manager';
  can_authorize_discounts: boolean;
  can_close_register: boolean;
  is_active: boolean;
  branch: string;
  is_verified: boolean;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getFinanceLevelLabel = (level: string) => {
  const levels = {
    'analyst': 'Analista Financiero',
    'supervisor': 'Supervisor Financiero',
    'manager': 'Gerente Financiero'
  };
  return levels[level as keyof typeof levels] || level;
};

const FinanceDetail = () => {
  const { isOpen, openModal, closeModal } = useModal();
  const { user } = useStore();
  const params = useParams();
  const financeId = params.id as string;
  const [finance, setFinance] = useState<Finance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [userBranch, setUserBranch] = useState<Branch | null>(null);
  const [isBranchManager, setIsBranchManager] = useState(false);
  const [formData, setFormData] = useState<FinanceFormData>({
    finance_level: 'analyst',
    can_authorize_discounts: false,
    can_close_register: false,
    is_active: false,
    branch: '',
    is_verified: false
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  // Cargar datos del empleado de finanzas
  useEffect(() => {
    const fetchFinance = async () => {
      try {
        setLoading(true);
        const response = await fetchApi<Finance>(`/api/finance/${financeId}/`);
        if (response) {
          setFinance(response);
          setFormData({
            finance_level: response.finance_level,
            can_authorize_discounts: response.can_authorize_discounts,
            can_close_register: response.can_close_register,
            is_active: response.is_active,
            branch: response.branch.toString(),
            is_verified: response.user?.is_verified || false
          });
        } else {
          setError('Empleado de finanzas no encontrado');
        }
      } catch {
        setError('Error al cargar el empleado de finanzas');
      } finally {
        setLoading(false);
      }
    };

    const fetchBranches = async () => {
      try {
        setLoadingBranches(true);
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
          } else {
            // Si es super admin o administrador, mostrar todas las sucursales
            setBranches(response.results);
          }
        }
      } catch {
        console.error('Error al cargar sucursales');
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchFinance();
    fetchBranches();
  }, [financeId]);

  const handleOpenModal = () => {
    openModal();
  };



  const handleToggleFinanceStatus = async (finance: Finance) => {
    try {
      const response = await fetchApi<Finance>(`/api/finance/${finance.id}/`, {
        method: 'PATCH',
        body: { is_active: !finance.is_active }
      });

      if (response) {
        setFinance(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
      }
    } catch {
      console.error('Error al actualizar estado del empleado de finanzas');
    }
  };

  const handleToggleUserVerification = async (userId: number) => {
    try {
      const response = await fetchApi(`/api/users/${userId}/toggle_verified_status/`, {
        method: 'POST'
      });

      if (response) {
        // Actualizar el estado local del empleado de finanzas
        setFinance(prev => prev ? {
          ...prev,
          user: prev.user ? {
            ...prev.user,
            is_verified: !prev.user.is_verified
          } : null
        } : null);

        // Actualizar también el formData
        setFormData(prev => ({
          ...prev,
          is_verified: !prev.is_verified
        }));
      }
    } catch (error) {
      console.error('Error al actualizar verificación del usuario:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);

    try {
      // Validar que el gerente solo pueda editar empleados de finanzas de su sucursal
      if (isBranchManager && userBranch && finance) {
        if (finance.branch !== parseInt(userBranch.id)) {
          console.error('El gerente solo puede editar empleados de finanzas de su sucursal');
          setUpdateLoading(false);
          return;
        }
      }

      // 1. Actualizar datos del empleado de finanzas (excluyendo is_verified)
      const financeUpdateData = {
        finance_level: formData.finance_level,
        can_authorize_discounts: formData.can_authorize_discounts,
        can_close_register: formData.can_close_register,
        is_active: formData.is_active,
        branch: formData.branch
      };

      const response = await fetchApi<Finance>(`/api/finance/${financeId}/`, {
        method: 'PATCH',
        body: financeUpdateData
      });

      if (response) {
        // 2. Si el estado de verificación ha cambiado, llamar al endpoint de verificación
        if (finance && formData.is_verified !== finance.user?.is_verified) {
          await fetchApi(`/api/users/${finance.user!.id}/toggle_verified_status/`, {
            method: 'POST',
            body: {}
          });
        }

        // 3. Recargar los datos del empleado de finanzas para obtener el estado actualizado
        const updatedFinance = await fetchApi<Finance>(`/api/finance/${financeId}/`);
        if (updatedFinance) {
          setFinance(updatedFinance);
          // Actualizar también el formData con los datos reales
          setFormData(prev => ({
            ...prev,
            is_verified: updatedFinance.user?.is_verified || false
          }));
        }
        
        closeModal();
      }
    } catch (error) {
      console.error('Error al actualizar empleado de finanzas:', error);
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

  if (error || !finance) {
    return (
      <div className="p-4">
        <div className="text-center text-red-600">{error || 'Empleado de finanzas no encontrado'}</div>
      </div>
    );
  }

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
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="p-5 lg:p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Detalle de Empleado de Finanzas
            </h3>
            <div className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span>Activar o desactivar empleado de finanzas</span>

                <span
                  onClick={() => handleToggleFinanceStatus(finance)}
                  className={`cursor-pointer px-3 py-2 rounded-md ${finance.is_active
                    ? 'text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                    : 'text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                    }`}
                >
                  {finance.is_active ? "Desactivar" : "Activar"}
                </span>
              </div>
            </div>
            <div className="space-x-3">
              <button
                onClick={handleOpenModal}
                disabled={!!(isBranchManager && userBranch && finance.branch !== parseInt(userBranch.id))}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm ${
                  isBranchManager && userBranch && finance.branch !== parseInt(userBranch.id)
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
                title={isBranchManager && userBranch && finance.branch !== parseInt(userBranch.id) 
                  ? 'Solo puedes editar empleados de finanzas de tu sucursal' 
                  : 'Editar empleado de finanzas'
                }
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                </svg>
                Editar
              </button>
            </div>
          </div>

          {/* Perfil del Empleado de Finanzas */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
                {/* Foto de perfil */}
                <div className="relative w-24 h-24 xl:w-28 xl:h-28">
                  {finance.user?.profile_picture ? (
                    <img
                      src={finance.user.profile_picture}
                      alt={`${finance.user.first_name} ${finance.user.last_name}`}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-medium">
                      {finance.user ? `${finance.user.first_name.charAt(0)}${finance.user.last_name.charAt(0)}` : 'FI'}
                    </div>
                  )}
                  <div className={`absolute -right-1 -bottom-1 h-6 w-6 rounded-full ${finance.is_active ? 'bg-green-500' : 'bg-red-500'} border-2 border-white`}></div>
                </div>

                <div className="order-3 xl:order-2">
                  <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                    {finance.user ? `${finance.user.first_name} ${finance.user.last_name}` : 'N/A'}
                  </h4>
                  <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {finance.user?.email || 'No especificado'}
                    </span>
                    <span className="hidden xl:block text-gray-500 dark:text-gray-400">•</span>
                    <div className="flex items-center">
                      <Badge
                        size="sm"
                        color="success"
                      >
                        {getFinanceLevelLabel(finance.finance_level)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="hidden xl:block xl:ml-auto order-2 xl:order-3">
                  <Badge
                    size="md"
                    color={finance.is_active ? "success" : "warning"}
                  >
                    {finance.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Información del Empleado de Finanzas */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
              <h5 className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                Información Personal
              </h5>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Nombre completo</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {finance.user ? `${finance.user.first_name} ${finance.user.last_name}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Email</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {finance.user?.email || 'No especificado'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Teléfono</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {finance.user?.phone_number || 'No especificado'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Usuario</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {finance.user?.username || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Verificación de Email</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      size="sm"
                      color={finance.user?.is_verified ? "success" : "warning"}
                    >
                      {finance.user?.is_verified ? "Verificado" : "No Verificado"}
                    </Badge>
                    {finance.user && (
                      <button
                        onClick={() => handleToggleUserVerification(finance.user!.id)}
                        className={`text-xs px-2 py-1 rounded-md ${
                          finance.user.is_verified
                            ? 'text-orange-600 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                        }`}
                      >
                        {finance.user.is_verified ? 'Desverificar' : 'Verificar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
              <h5 className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                Información Laboral
              </h5>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Sucursal</span>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {finance.branch_name || 'N/A'}
                    </p>
                    {isBranchManager && userBranch && finance.branch !== parseInt(userBranch.id) && (
                      <Badge
                        size="sm"
                        color="warning"
                      >
                        Otra Sucursal
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Nivel Financiero</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {getFinanceLevelLabel(finance.finance_level)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Estado</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    <Badge
                      size="sm"
                      color={finance.is_active ? "success" : "warning"}
                    >
                      {finance.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Permisos</span>
                  <div className="flex flex-col gap-1 mt-1">
                    <span className={`text-xs ${finance.can_authorize_discounts ? 'text-green-600' : 'text-gray-400'}`}>
                      {finance.can_authorize_discounts ? '✓' : '✗'} Autorizar descuentos
                    </span>
                    <span className={`text-xs ${finance.can_close_register ? 'text-green-600' : 'text-gray-400'}`}>
                      {finance.can_close_register ? '✓' : '✗'} Cerrar caja
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
              <h5 className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                Información del Sistema
              </h5>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">ID del Empleado</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    #{finance.id}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Fecha de registro</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {formatDate(finance.created_at)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Última actualización</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {formatDate(finance.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      <Modal isOpen={isOpen} onClose={closeModal}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Editar Empleado de Finanzas
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>
                Sucursal
                {isBranchManager && userBranch && (
                  <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                    (No modificable)
                  </span>
                )}
              </Label>
              <Select
                name="branch"
                value={formData.branch}
                onChange={(value: string) => {
                  setFormData(prev => ({ ...prev, branch: value }));
                }}
                error={false}
                disabled={loadingBranches || isBranchManager}
                options={branches.map((branch) => ({
                  value: branch.id,
                  label: `${branch.name} (${branch.code})`
                }))}
                placeholder={isBranchManager ? "Sucursal asignada automáticamente" : "Seleccione una sucursal"}
              />
              {isBranchManager && userBranch && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Como gerente de sucursal, no puedes cambiar la sucursal del empleado de finanzas
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
                }}
                options={[
                  { value: 'analyst', label: 'Analista Financiero' },
                  { value: 'supervisor', label: 'Supervisor Financiero' },
                  { value: 'manager', label: 'Gerente Financiero' }
                ]}
                placeholder="Seleccione el nivel financiero"
              />
            </div>

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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Activo
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_verified"
                name="is_verified"
                checked={formData.is_verified}
                onChange={(e) => setFormData(prev => ({ ...prev, is_verified: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="is_verified" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Usuario Verificado 
              </Label>
              <div className="ml-2">
                <Badge
                  size="sm"
                  color={formData.is_verified ? "success" : "warning"}
                >
                  {formData.is_verified ? "Verificado" : "No Verificado"}
                </Badge>
              </div>
              {finance && formData.is_verified !== finance.user?.is_verified && (
                <div className="ml-2">
                  <Badge
                    size="sm"
                    color="info"
                  >
                    Cambiará a: {formData.is_verified ? "Verificado" : "No Verificado"}
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {updateLoading ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default FinanceDetail;
