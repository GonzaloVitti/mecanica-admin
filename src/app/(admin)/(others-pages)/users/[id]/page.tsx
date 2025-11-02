'use client'
import React, { useEffect, useState } from 'react';
import Badge from '@/components/ui/badge/Badge';
import { useParams } from 'next/navigation';
import { fetchApi } from '@/app/lib/data';
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { useModal } from "@/hooks/useModal";
import Link from 'next/link';
import WhatsAppLink from '@/components/whatsapp/WhatsAppLink';

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_verified: boolean;
  role: 'ADMIN' | 'DRIVER' | 'PASSENGER' | 'AUTHORIZER' | 'ADMINISTRATOR' | 'SUPER_ADMIN' | 'CASHIER' | 'SALESMAN' | 'BRANCH_MANAGER' | 'FINANCE';
  date_joined: string;
}

const getRoleBadgeColor = (role: User['role']) => {
  switch (role) {
    case 'ADMIN':
    case 'ADMINISTRATOR':
    case 'SUPER_ADMIN':
      return 'success';
    case 'DRIVER':
    case 'SALESMAN':
      return 'primary';
    case 'PASSENGER':
    case 'CASHIER':
      return 'warning';
    case 'AUTHORIZER':
    case 'BRANCH_MANAGER':
    case 'FINANCE':
      return 'info';
    default:
      return 'default';
  }
};

const translateRole = (role: User['role']): string => {
  switch (role) {
    case 'ADMINISTRATOR':
      return 'Administrador';
    case 'SUPER_ADMIN':
      return 'Super Administrador';
    case 'CASHIER':
      return 'Cajero';
    case 'SALESMAN':
      return 'Vendedor';
    case 'BRANCH_MANAGER':
      return 'Gerente de Sucursal';
    case 'FINANCE':
      return 'Finanzas';
    default:
      return role;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const UserDetail = () => {
  const { isOpen, openModal, closeModal } = useModal();
  const params = useParams();
  const userId = params.id;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Required<Pick<User, 'first_name' | 'last_name' | 'phone_number' | 'is_verified'>>>({
    first_name: '',
    last_name: '',
    phone_number: '',
    is_verified: false
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  // First useEffect - Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await fetchApi<User>(`/api/users/${userId}/`);
        if (response) {
          console.log("🔵 Usuario cargado:", response);
          setUser(response);
        }
      } catch (err) {
        setError('Error al cargar el usuario');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  useEffect(() => {
    if (user) {
      console.log("🟢 Actualizando formData con:", user);
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        is_verified: user.is_verified
      });
    }
  }, [user]);


  const handleOpenModal = () => {
    if (user) {
      console.log("🟡 Abriendo modal con datos:", formData);
      openModal();
    }
  };


  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };
  // Actualiza la función handleSubmit en el componente UserDetail

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
  
    try {
      // Primero actualizamos los datos básicos del usuario
      const userUpdateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
      };
  
      // Actualizar datos básicos con PATCH
      const response = await fetchApi<User>(`/api/users/${userId}/`, {
        method: 'PATCH',
        body: userUpdateData
      });

      console.log("🟢 Datos actualizados:", response);
  
      // Si el estado de verificación ha cambiado
      if (user && formData.is_verified !== user.is_verified) {
        // Llamar al endpoint toggle_active_status
        await fetchApi(`/api/users/${userId}/toggle_active_status/`, {
          method: 'POST',
          body: {} // No necesita body
        });
      }
  
      // Recargar los datos del usuario después de las actualizaciones
      const updatedUser = await fetchApi<User>(`/api/users/${userId}/`);
      if (updatedUser) {
        setUser(updatedUser);
        closeModal();
      }
    } catch (err) {
      setError('Error al actualizar el usuario');
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

  if (error || !user) {
    return (
      <div className="p-4 text-red-500">
        {error || 'Usuario no encontrado'}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <Link
          href="/users"
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
          <span>Volver a usuarios</span>
        </Link>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="p-5 lg:p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Detalle de Usuario
            </h3>
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

          {/* Meta Card */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
                <div className="order-3 xl:order-2">
                  <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                    {user.first_name} {user.last_name}
                  </h4>

                </div>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                Información Personal
              </h4>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Email
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {user.email}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Teléfono
                  </p>
                  <WhatsAppLink phoneNumber={user.phone_number} className='text-sm font-medium text-gray-800 dark:text-white/90'/>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Rol
                  </p>
                  <Badge size="sm" color={getRoleBadgeColor(user.role)}>
                    {translateRole(user.role)}
                  </Badge>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Estado
                  </p>
                  <Badge
                    size="sm"
                    color={user.is_verified ? "success" : "warning"}
                  >
                    {user.is_verified ? "Verificado" : "Pendiente"}
                  </Badge>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Fecha de registro
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {formatDate(user.date_joined)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={closeModal}>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="relative w-full max-w-[500px] rounded-xl bg-white dark:bg-gray-800 p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                Editar Usuario
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
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    type="text"
                    name="first_name"
                    defaultValue={user?.first_name}
                    onChange={handleInputChange}
                    placeholder="Nombre"
                  />
                </div>

                <div>
                  <Label>Apellido</Label>
                  <Input
                    type="text"
                    name="last_name"
                    defaultValue={user?.last_name}
                    onChange={handleInputChange}
                    placeholder="Apellido"
                  />
                </div>

                <div>
                  <Label>Teléfono</Label>
                  <Input
                    type="tel"
                    name="phone_number"
                    defaultValue={user?.phone_number}
                    onChange={handleInputChange}
                    placeholder="Teléfono"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_verified"
                    name="is_verified"
                    checked={formData.is_verified}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        is_verified: e.target.checked
                      }));
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <Label htmlFor="is_verified">Usuario verificado</Label>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <p className="text-sm text-red-500">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={updateLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateLoading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserDetail;