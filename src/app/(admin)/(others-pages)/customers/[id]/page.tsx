'use client'
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/app/lib/data';
import Badge from '@/components/ui/badge/Badge';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import WhatsAppLink from '@/components/whatsapp/WhatsAppLink';

// Interfaz para el usuario anidado dentro del cliente
interface UserData {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_verified: boolean;
  is_active: boolean;
  role: 'CUSTOMER';
  date_joined: string;
  profile_picture?: string;
}

// Interfaz para el cliente
interface Customer {
  id: string;
  user: UserData | null;
  name: string;
  tax_id: string;
  tax_condition: string;
  email: string;
  phone: string;
  address: string;
  is_active: boolean;
  has_user_account: boolean;
  created_at: string;
  updated_at: string;
}

// Interfaz para el formulario de edición
interface CustomerFormData {
  name: string;
  tax_id: string;
  tax_condition: string;
  email: string;
  phone: string;
  address: string;
  is_active: boolean;
  is_verified: boolean;
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

const CustomerDetail = () => {
  const { isOpen, openModal, closeModal } = useModal();
  const params = useParams();
  const customerId = params.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    tax_id: '',
    tax_condition: 'CF',
    email: '',
    phone: '',
    address: '',
    is_active: false,
    is_verified: false
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  // Cargar datos del cliente
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const response = await fetchApi<Customer>(`/api/customers/${customerId}/`);
        if (response) {
          setCustomer(response);
          setFormData({
            name: response.name,
            tax_id: response.tax_id,
            tax_condition: response.tax_condition || 'CF',
            email: response.email,
            phone: response.phone,
            address: response.address,
            is_active: response.is_active,
            is_verified: response.user?.is_verified || false
          });
        } else {
          setError('Cliente no encontrado');
        }
      } catch (err) {
        setError('Error al cargar el cliente');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const handleOpenModal = () => {
    if (customer) {
      openModal();
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleToggleCustomerStatus = async (customer: Customer) => {
    try {
      const endpoint = customer.is_active ? 'deactivate' : 'reactivate';
      await fetchApi(`/api/customers/${customer.id}/${endpoint}/`, {
        method: 'POST'
      });

      // Actualizar el estado local
      setCustomer(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
      setFormData(prev => ({ ...prev, is_active: !prev.is_active }));
    } catch (error) {
      console.error('Error toggling customer status:', error);
    }
  };

  const handleToggleUserVerification = async (userId: number) => {
    try {
      const response = await fetchApi(`/api/users/${userId}/toggle_verified_status/`, {
        method: 'POST'
      });

      if (response) {
        // Actualizar el estado local del cliente
        setCustomer(prev => prev ? {
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
      // 1. Actualizar datos del cliente (excluyendo is_verified)
      const customerUpdateData = {
        name: formData.name,
        tax_id: formData.tax_id,
        tax_condition: formData.tax_condition,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        is_active: formData.is_active
      };

      const updatedCustomer = await fetchApi<Customer>(`/api/customers/${customerId}/`, {
        method: 'PATCH',
        body: customerUpdateData
      });

      if (updatedCustomer) {
        // 2. Si el estado de verificación ha cambiado y el cliente tiene cuenta de usuario, llamar al endpoint de verificación
        if (customer && customer.user && formData.is_verified !== customer.user.is_verified) {
          await fetchApi(`/api/users/${customer.user.id}/toggle_verified_status/`, {
            method: 'POST',
            body: {}
          });
        }

        // 3. Recargar los datos del cliente para obtener el estado actualizado
        const finalCustomer = await fetchApi<Customer>(`/api/customers/${customerId}/`);
        if (finalCustomer) {
          setCustomer(finalCustomer);
          // Actualizar también el formData con los datos reales
          setFormData(prev => ({
            ...prev,
            is_verified: finalCustomer.user?.is_verified || false
          }));
        }
        
        closeModal();
      }
    } catch (err) {
      setError('Error al actualizar el cliente');
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

  if (error || !customer) {
    return (
      <div className="p-4 text-red-500">
        {error || 'Cliente no encontrado'}
      </div>
    );
  }

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
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="p-5 lg:p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Detalle de Cliente
            </h3>
            <div className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span>Activar o desactivar cliente</span>

                <span
                  onClick={() => handleToggleCustomerStatus(customer)}
                  className={`cursor-pointer px-3 py-2 rounded-md ${customer.is_active
                    ? 'text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                    : 'text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                    }`}
                >
                  {customer.is_active ? "Desactivar" : "Activar"}
                </span>
              </div>
            </div>
            <div className="space-x-3">
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

          {/* Perfil del Cliente */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
                {/* Foto de perfil */}
                <div className="relative w-24 h-24 xl:w-28 xl:h-28">
                  {customer.user?.profile_picture ? (
                    <img
                      src={customer.user.profile_picture}
                      alt={customer.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-medium">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`absolute -right-1 -bottom-1 h-6 w-6 rounded-full ${customer.is_active ? 'bg-green-500' : 'bg-red-500'} border-2 border-white`}></div>
                </div>

                <div className="order-3 xl:order-2">
                  <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                    {customer.name}
                  </h4>
                  <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {customer.email || customer.user?.email || 'No especificado'}
                    </span>
                    <span className="hidden xl:block text-gray-500 dark:text-gray-400">•</span>
                    <div className="flex items-center">
                      <Badge
                        size="sm"
                        color={customer.has_user_account ? "success" : "light"}
                      >
                        {customer.has_user_account ? "Cuenta de Usuario" : "Sin Cuenta"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="hidden xl:block xl:ml-auto order-2 xl:order-3">
                  <Badge
                    size="md"
                    color={customer.is_active ? "success" : "warning"}
                  >
                    {customer.is_active ? "Activo" : "Inactivo"}
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
                    {customer.email || customer.user?.email || 'No especificado'}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Teléfono
                  </p>
                  <WhatsAppLink
                    phoneNumber={customer.phone || customer.user?.phone_number || ''}
                    className="text-sm font-medium"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Dirección
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {customer.address || 'No especificada'}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    CUIT/DNI
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {customer.tax_id || 'No especificado'}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Condición de Venta ARCA
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {customer.tax_condition === 'RI' && 'Responsable Inscripto'}
                    {customer.tax_condition === 'MONO' && 'Monotributista'}
                    {customer.tax_condition === 'EXENTO' && 'Exento frente al IVA'}
                    {customer.tax_condition === 'CF' && 'Consumidor Final'}
                    {!customer.tax_condition && 'No especificado'}
                  </p>
                </div>

                {customer.has_user_account && customer.user && (
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Verificación de Email
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        size="sm"
                        color={customer.user.is_verified ? "success" : "warning"}
                      >
                        {customer.user.is_verified ? "Verificado" : "No Verificado"}
                      </Badge>
                      <button
                        onClick={() => handleToggleUserVerification(customer.user!.id)}
                        className={`text-xs px-2 py-1 rounded-md ${
                          customer.user.is_verified
                            ? 'text-orange-600 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                        }`}
                      >
                        {customer.user.is_verified ? 'Desverificar' : 'Verificar'}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Fecha de registro
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {formatDate(customer.created_at)}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    ID del Cliente
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90 font-mono">
                    {customer.id}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Información de la Cuenta de Usuario */}
          {customer.user && (
            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                  Información de la Cuenta de Usuario
                </h4>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Nombre Completo
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {customer.user.first_name} {customer.user.last_name}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Username
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {customer.user.username || 'No especificado'}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Estado de Verificación
                    </p>
                    <div className="flex gap-2">
                      <Badge
                        size="sm"
                        color={customer.user.is_verified ? "success" : "warning"}
                      >
                        {customer.user.is_verified ? "Verificado" : "No verificado"}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Estado de la Cuenta
                    </p>
                    <div className="flex gap-2">
                      <Badge
                        size="sm"
                        color={customer.user.is_active ? "success" : "error"}
                      >
                        {customer.user.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={closeModal}>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="relative w-full max-w-[600px] max-h-[90vh] rounded-xl bg-white dark:bg-gray-800 p-6 flex flex-col">
            {/* Header - fijo en la parte superior */}
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                Editar Cliente
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
                {/* Información Básica - 2 columnas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      type="text"
                      name="name"
                      id="name"
                      defaultValue={formData.name}
                      onChange={handleInputChange}
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax_id">CUIT/DNI</Label>
                    <Input
                      type="text"
                      name="tax_id"
                      id="tax_id"
                      defaultValue={formData.tax_id}
                      onChange={handleInputChange}
                      placeholder="20-12345678-9"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tax_condition">Condición de Venta ARCA</Label>
                    <select
                      name="tax_condition"
                      id="tax_condition"
                      value={formData.tax_condition}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="CF">Consumidor Final</option>
                      <option value="RI">Responsable Inscripto</option>
                      <option value="MONO">Monotributista</option>
                      <option value="EXENTO">Exento frente al IVA</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      type="email"
                      name="email"
                      id="email"
                      defaultValue={formData.email}
                      onChange={handleInputChange}
                      placeholder="cliente@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      type="tel"
                      name="phone"
                      id="phone"
                      defaultValue={formData.phone}
                      onChange={handleInputChange}
                      placeholder="11-1234-5678"
                    />
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <textarea
                    name="address"
                    id="address"
                    defaultValue={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Dirección completa"
                  />
                </div>

                {/* Estado */}
                <div>
                  <Label htmlFor="is_active" className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_active"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Cliente activo
                  </Label>
                </div>

                {/* Verificación de Usuario - Solo mostrar si tiene cuenta de usuario */}
                {customer.has_user_account && customer.user && (
                  <div>
                    <Label htmlFor="is_verified" className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="is_verified"
                        id="is_verified"
                        checked={formData.is_verified}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Usuario Verificado
                    </Label>
                    <div className="ml-6 mt-2 flex items-center gap-2">
                      <Badge
                        size="sm"
                        color={formData.is_verified ? "success" : "warning"}
                      >
                        {formData.is_verified ? "Verificado" : "No Verificado"}
                      </Badge>
                      {formData.is_verified !== customer.user.is_verified && (
                        <Badge
                          size="sm"
                          color="info"
                        >
                          Cambiará a: {formData.is_verified ? "Verificado" : "No Verificado"}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Footer con botones */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={updateLoading}
                className={`px-4 py-2 text-white rounded-md transition-colors ${
                  updateLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {updateLoading ? 'Actualizando...' : 'Actualizar Cliente'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerDetail;