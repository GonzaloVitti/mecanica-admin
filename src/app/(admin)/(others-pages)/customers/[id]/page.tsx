'use client'
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/app/lib/data';
import Badge from '@/components/ui/badge/Badge';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import FileInput from '@/components/form/input/FileInput';
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
  public_code?: string;
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
    is_active: false
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [publicCode, setPublicCode] = useState<string>('');
  const [accountInfo, setAccountInfo] = useState<{ id: string; balance: string } | null>(null);

  const profileUrl = useMemo(() => {
    const url = customer?.user?.profile_picture || '';
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
  }, [customer?.user?.profile_picture]);

  // Cargar datos del cliente
  useEffect(() => {
    const fetchUserAsCustomer = async () => {
      try {
        setLoading(true);
        const u = await fetchApi<UserData>(`/api/users/${customerId}/`);
        if (u) {
          const composed: Customer = {
            id: String(u.id),
            user: u,
            name: `${u.first_name} ${u.last_name}`.trim() || u.email,
            tax_id: '',
            tax_condition: 'CF',
            email: u.email,
            phone: u.phone_number,
            address: '',
            is_active: u.is_active,
            has_user_account: true,
            created_at: u.date_joined,
            updated_at: u.date_joined,
          };

          setCustomer(composed);
          setFormData({
            name: composed.name,
            tax_id: composed.tax_id,
            tax_condition: composed.tax_condition,
            email: composed.email,
            phone: composed.phone,
            address: composed.address,
            is_active: composed.is_active,
          });
          // Buscar Customer model por email para obtener cuenta corriente y public_code
          if (u.email) {
            try {
              const custRes = await fetchApi<{ results: Array<{ id: string; account_id: string | null; account_balance: string; public_code?: string }> }>(
                `/api/customers/?email=${encodeURIComponent(u.email)}&limit=1`
              );
              const cust = custRes?.results?.[0];
              if (cust) {
                // Usar el public_code del backend (calculado con Customer UUID) para consistencia
                if (cust.public_code) setPublicCode(cust.public_code);
                if (cust.account_id) {
                  setAccountInfo({ id: cust.account_id, balance: cust.account_balance || '0' });
                } else {
                  setAccountInfo({ id: '', balance: cust.account_balance || '0' });
                }
              }
            } catch {}
          }
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
      fetchUserAsCustomer();
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

  

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);

    try {
      if (customer?.user?.id) {
        if (profileFile) {
          const fd = new FormData();
          fd.append('profile_picture', profileFile);
          await fetchApi<UserData>(`/api/users/${customer.user.id}/update_profile_picture/`, { method: 'POST', body: fd as any, isFormData: true });
        }
        const userUpdateData = {
          first_name: formData.name.split(' ')[0] || customer.user.first_name,
          last_name: formData.name.split(' ').slice(1).join(' ') || customer.user.last_name,
          phone_number: formData.phone,
        };

        await fetchApi(`/api/users/${customer.user.id}/update_profile/`, {
          method: 'PATCH',
          body: userUpdateData,
        });

        

        const refreshed = await fetchApi<UserData>(`/api/users/${customer.user.id}/`);
        if (refreshed) {
          setCustomer({
            id: String(refreshed.id),
            user: refreshed,
            name: `${refreshed.first_name} ${refreshed.last_name}`.trim() || refreshed.email,
            tax_id: '',
            tax_condition: 'CF',
            email: refreshed.email,
            phone: refreshed.phone_number,
            address: '',
            is_active: refreshed.is_active,
            has_user_account: true,
            created_at: refreshed.date_joined,
            updated_at: refreshed.date_joined,
          });
          setFormData(prev => ({
            ...prev,
            name: `${refreshed.first_name} ${refreshed.last_name}`.trim() || refreshed.email,
            phone: refreshed.phone_number || '',
          }));
          setProfileFile(null);
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
                  {profileUrl ? (
                    <img
                      src={profileUrl}
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
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Código público</span>
                    <span className="font-mono text-sm">{publicCode || '—'}</span>
                    {publicCode && (
                      <>
                        <button
                          onClick={() => navigator.clipboard.writeText(publicCode)}
                          className="px-2 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                        >
                          Copiar
                        </button>
                        <Link
                          href={`/customer-services?code=${publicCode}`}
                          className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Abrir
                        </Link>
                      </>
                    )}
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

          {/* Cuenta Corriente */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Cuenta Corriente</h4>
            {accountInfo === null ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Sin cuenta corriente registrada</p>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo deudor</p>
                  <span className={`text-lg font-semibold ${Number(accountInfo.balance) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {Number(accountInfo.balance).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                  </span>
                </div>
                {accountInfo.id && (
                  <Link
                    href={`/accounts/${accountInfo.id}`}
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Ver cuenta y movimientos
                  </Link>
                )}
              </div>
            )}
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
                {/* Foto de perfil */}
                <div>
                  <Label>Foto de perfil</Label>
                  <FileInput accept="image/*" onChange={(e) => setProfileFile(e.target.files?.[0] || null)} />
                  {(profileFile || profileUrl) && (
                    <div className="mt-3">
                      <img
                        src={profileFile ? URL.createObjectURL(profileFile) : profileUrl || ''}
                        alt="Foto de perfil"
                        className="h-20 w-20 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                      />
                    </div>
                  )}
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
