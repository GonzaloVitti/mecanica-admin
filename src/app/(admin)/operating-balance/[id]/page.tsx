'use client'
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import ComponentCard from "@/components/common/ComponentCard";
import Badge from "@/components/ui/badge/Badge";
import Label from "@/components/form/Label";
import TextArea from '@/components/form/input/TextArea';
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import { ArrowLeftIcon, ArrowRightIcon, DocsIcon } from "@/icons";
import { fetchApi } from '@/app/lib/data';
import Alert from '@/components/ui/alert/Alert';
import { Modal } from "@/components/ui/modal";
import Link from 'next/link';

// Interfaces
interface Balance {
  id: string;
  code: string;
  balance_type: 'COMPANY_BILLING' | 'DRIVER_PAYMENT';
  balance_type_display: string;
  entity_name: string;
  entity_type: string;
  company_info?: {
    id: string;
    name: string;
    tax_id: string;
    address: string;
    email: string;
    phone_number: string;
  } | null;
  driver_info?: {
    id: string;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone_number: string;
    }
    address: string;
    zone?: {
      id: string;
      name: string;
    } | null;
  } | null;
  period_start: string;
  period_end: string;
  total_trips: number;
  total_amount: number | string;
  commission_percentage?: number;
  commission_amount?: number;
  additional_discounts?: number;
  bonuses?: number;
  net_amount: number | string;
  status: 'DRAFT' | 'GENERATED' | 'APPROVED' | 'PAID' | 'CANCELLED';
  status_display: string;
  created_at: string;
  updated_at: string;
  generated_at: string;
  approved_at?: string | null;
  paid_at?: string | null;
  created_by_name: string;
  approved_by?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  paid_by?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  payment_notes?: string | null;
  approval_notes?: string | null;
  can_approve?: boolean;
  can_mark_as_paid?: boolean;
  details?: BalanceDetail[];
  adjustments?: BalanceAdjustment[];
}

interface BalanceAdjustment {
  id: number;
  balance: string;
  adjustment_type: 'DISCOUNT' | 'BONUS' | 'FINE' | 'OTHER';
  adjustment_type_display: string;
  amount: number;
  description: string;
  reference?: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
}

interface BalanceDetail {
  id: number;
  balance: string;
  trip_id: string;
  trip_date: string;
  origin_address: string;
  destination_address: string;
  fare_amount: number;
  commission_rate: number;
  commission_amount: number;
  driver_amount: number;
}

export default function BalanceDetail() {
  const router = useRouter();
  const params = useParams();
  const balanceId = params.id as string;

  // Estados para datos
  const [balance, setBalance] = useState<Balance | null>(null);
  const [adjustments, setAdjustments] = useState<BalanceAdjustment[]>([]);
  const [tripDetails, setTripDetails] = useState<BalanceDetail[]>([]);

  // Estados para modales
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Estados para formularios
  const [approvalNotes, setApprovalNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [adjustmentForm, setAdjustmentForm] = useState({
    adjustment_type: 'BONUS',
    amount: 0,
    description: '',
    reference: ''
  });

  // Estados UI
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [alertMessage, setAlertMessage] = useState('');

  // Opciones para selects
  const paymentMethodOptions = [
    { value: 'BANK_TRANSFER', label: 'Transferencia Bancaria' },
    { value: 'CASH', label: 'Efectivo' },
    { value: 'CHECK', label: 'Cheque' },
    { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito' },
    { value: 'DEBIT_CARD', label: 'Tarjeta de Débito' },
    { value: 'OTHER', label: 'Otro' },
  ];

  const adjustmentTypeOptions = [
    { value: 'BONUS', label: 'Bonificación' },
    { value: 'DISCOUNT', label: 'Descuento' },
    { value: 'FINE', label: 'Multa' },
    { value: 'OTHER', label: 'Otro' },
  ];

  // Cargar datos iniciales
  useEffect(() => {
    fetchBalanceData();
  }, [balanceId]);

  // Efecto para gestión de alertas
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  // Función para obtener datos del balance
  const fetchBalanceData = async () => {
    setLoading(true);
    try {
      // Obtener información general del balance
      const balanceData = await fetchApi<Balance>(`/api/balances/${balanceId}/`);

      // Verificar que balanceData no sea null antes de usarlo
      if (balanceData) {
        setBalance(balanceData);

        // Usar los detalles incluidos en la respuesta principal
        setTripDetails(balanceData.details || []);

        // Usar los ajustes incluidos en la respuesta principal
        setAdjustments(balanceData.adjustments || []);
      } else {
        showErrorAlert('No se pudo obtener la información del balance');
      }
    } catch (error) {
      showErrorAlert('Error al cargar los datos del balance');
    } finally {
      setLoading(false);
    }
  };

  // Handlers para los modales
  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi(`/api/balances/${balanceId}/approve/`, {
        method: 'POST',
        body: { notes: approvalNotes }
      });

      showSuccessAlert('Balance aprobado correctamente');
      setIsApprovalModalOpen(false);
      fetchBalanceData(); // Recargar datos
    } catch (error) {
      showErrorAlert('Error al aprobar el balance');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi(`/api/balances/${balanceId}/mark_as_paid/`, {
        method: 'POST',
        body: {
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          notes: paymentNotes
        }
      });

      showSuccessAlert('Balance marcado como pagado correctamente');
      setIsPaymentModalOpen(false);
      fetchBalanceData(); // Recargar datos
    } catch (error) {
      showErrorAlert('Error al marcar el balance como pagado');
    }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Pasar el objeto directamente sin JSON.stringify
      await fetchApi(`/api/balances/${balanceId}/create_adjustment/`, {
        method: 'POST',
        body: adjustmentForm  // Quitar JSON.stringify
      });

      showSuccessAlert('Ajuste añadido correctamente');
      setIsAdjustmentModalOpen(false);
      // Resetear formulario
      setAdjustmentForm({
        adjustment_type: 'BONUS',
        amount: 0,
        description: '',
        reference: ''
      });
      fetchBalanceData(); // Recargar datos
    } catch (error) {
      showErrorAlert('Error al añadir el ajuste');
    }
  };
  const cancelBalance = async () => {
    if (!confirm('¿Está seguro de que desea cancelar este balance? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await fetchApi(`/api/balances/${balanceId}/cancel/`, {
        method: 'POST',
      });

      showSuccessAlert('Balance cancelado correctamente');
      fetchBalanceData(); // Recargar datos
    } catch (error) {
      showErrorAlert('Error al cancelar el balance');
    }
  };

  // Helpers para el manejo de alertas
  const showSuccessAlert = (message: string) => {
    setAlertType('success');
    setAlertMessage(message);
    setShowAlert(true);
  };

  const showErrorAlert = (message: string) => {
    setAlertType('error');
    setAlertMessage(message);
    setShowAlert(true);
  };

  // Format currency helper
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'ARS'
    }).format(numAmount);
  };

  // Format date helper
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';

    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format simpldate helper (solo fecha sin hora)
  const formatSimpleDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';

    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Get adjustment type color
  const getAdjustmentTypeColor = (type: string) => {
    switch (type) {
      case 'DISCOUNT': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'BONUS': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'FINE': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  // Get status color
  const getStatusColor = (status: string): { color: BadgeColor; variant: BadgeVariant } => {
    switch (status) {
      case 'DRAFT': return { color: 'light', variant: 'light' };
      case 'GENERATED': return { color: 'primary', variant: 'light' };
      case 'APPROVED': return { color: 'warning', variant: 'light' };
      case 'PAID': return { color: 'success', variant: 'light' };
      case 'CANCELLED': return { color: 'error', variant: 'light' };
      default: return { color: 'light', variant: 'light' };
    }
  };

  // Y añade estos tipos para TypeScript
  type BadgeVariant = "light" | "solid";
  type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" | "default";

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-96">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando detalles del balance...</p>
        </div>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="p-6">
        <ComponentCard>
          <div className="text-center py-8">
            <DocsIcon className="h-16 w-16 mx-auto text-gray-400" />
            <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">Balance no encontrado</h2>
            <p className="mt-1 text-gray-500 dark:text-gray-400">El balance solicitado no existe o ha sido eliminado</p>
            <button
              onClick={() => router.push('/operating-balance')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Volver a los balances
            </button>
          </div>
        </ComponentCard>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {showAlert && (
        <Alert
          variant={alertType}
          title={alertType === 'success' ? 'Éxito' : 'Error'}
          message={alertMessage}
        />
      )}

      {/* Encabezado y acciones */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/operating-balance')}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Balance {balance.code}
          </h1>
          <Badge {...getStatusColor(balance.status)}>
            {balance.status_display}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {balance.can_approve && (
            <button
              onClick={() => setIsApprovalModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Aprobar Balance
            </button>
          )}

          {balance.can_mark_as_paid && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Marcar como Pagado
            </button>
          )}

{/*           {(balance.status === 'DRAFT' || balance.status === 'GENERATED') && (
            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Añadir Ajuste
            </button>
          )} */}

          {balance.status !== 'PAID' && balance.status !== 'CANCELLED' && (
            <button
              onClick={cancelBalance}
              className="px-4 py-2 border border-red-300 text-red-600 dark:border-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Cancelar Balance
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Imprimir
          </button>
        </div>
      </div>

      {/* Resumen del balance */}
      <ComponentCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información básica */}
          <div className="p-5 border rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Información del Balance
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</div>
                <div className="text-gray-800 dark:text-white">{balance.balance_type_display}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Código</div>
                <div className="text-gray-800 dark:text-white">{balance.code}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha Inicio</div>
                <div className="text-gray-800 dark:text-white">{formatDate(balance.period_start)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha Fin</div>
                <div className="text-gray-800 dark:text-white">{formatDate(balance.period_end)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</div>
                <div>
                  <Badge {...getStatusColor(balance.status)}>
                    {balance.status_display}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Viajes</div>
                <div className="text-gray-800 dark:text-white">{balance.total_trips}</div>
              </div>
            </div>
          </div>

          {/* Información de la entidad */}
          <div className="p-5 border rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              {balance.balance_type === 'COMPANY_BILLING' ? 'Información de la Compañía' : 'Información del Conductor'}
            </h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Nombre</div>
                <div className="text-gray-800 dark:text-white">{balance.entity_name}</div>
              </div>

              {/* Mostrar información adicional del conductor si es un balance de tipo DRIVER_PAYMENT */}
              {balance.balance_type === 'DRIVER_PAYMENT' && balance.driver_info && (
                <>
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</div>
                    <div className="text-gray-800 dark:text-white">{balance.driver_info.user.email}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Teléfono</div>
                    <div className="text-gray-800 dark:text-white">{balance.driver_info.user.phone_number}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Dirección</div>
                    <div className="text-gray-800 dark:text-white">{balance.driver_info.address}</div>
                  </div>


                </>
              )}

              {/* Mostrar información adicional de la compañía si es un balance de tipo COMPANY_BILLING */}
              {balance.balance_type === 'COMPANY_BILLING' && balance.company_info && (
                <>
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">RFC</div>
                    <div className="text-gray-800 dark:text-white">{balance.company_info.tax_id}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Dirección</div>
                    <div className="text-gray-800 dark:text-white">{balance.company_info.address}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</div>
                    <div className="text-gray-800 dark:text-white">{balance.company_info.email}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Teléfono</div>
                    <div className="text-gray-800 dark:text-white">{balance.company_info.phone_number}</div>
                  </div>
                </>
              )}


            </div>
          </div>

          {/* Resumen financiero */}
          <div className="p-5 border rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Resumen Financiero
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="text-gray-600 dark:text-gray-400">Monto Total</div>
                <div className="text-gray-800 dark:text-white font-medium">{formatCurrency(balance.total_amount)}</div>
              </div>

              {balance.balance_type === 'DRIVER_PAYMENT' && balance.commission_percentage && balance.commission_amount && (
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="text-gray-600 dark:text-gray-400">
                    Comisión ({balance.commission_percentage}%)
                  </div>
                  <div className="text-red-600 dark:text-red-400">-{formatCurrency(balance.commission_amount)}</div>
                </div>
              )}

              {balance.additional_discounts && balance.additional_discounts > 0 && (
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="text-gray-600 dark:text-gray-400">Descuentos</div>
                  <div className="text-red-600 dark:text-red-400">-{formatCurrency(balance.additional_discounts)}</div>
                </div>
              )}

              {balance.bonuses && balance.bonuses > 0 && (
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="text-gray-600 dark:text-gray-400">Bonificaciones</div>
                  <div className="text-green-600 dark:text-green-400">+{formatCurrency(balance.bonuses)}</div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 font-medium">
                <div className="text-gray-800 dark:text-white text-lg">Total a {balance.balance_type === 'COMPANY_BILLING' ? 'Facturar' : 'Pagar'}</div>
                <div className="text-xl text-green-600 dark:text-green-400">{formatCurrency(balance.net_amount)}</div>
              </div>
            </div>
          </div>

          {/* Información de auditoría */}
          <div className="p-5 border rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Información de Auditoría
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Creado por</div>
                <div className="text-gray-800 dark:text-white/90">
                  {balance.created_by_name}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Creado en</div>
                <div className="text-gray-800 dark:text-white/90">{formatDate(balance.created_at)}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Generado en</div>
                <div className="text-gray-800 dark:text-white/90">{formatDate(balance.generated_at)}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Aprobado en</div>
                <div className="text-gray-800 dark:text-white/90">
                  {balance.approved_at ? formatDate(balance.approved_at) : 'Pendiente'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Pagado en</div>
                <div className="text-gray-800 dark:text-white/90">
                  {balance.paid_at ? formatDate(balance.paid_at) : 'Pendiente'}
                </div>
              </div>
            </div>

            {(balance.payment_notes || balance.approval_notes) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {balance.approval_notes && (
                  <div className="mb-3">
                    <div className="text-gray-500 dark:text-gray-400 mb-1">Notas de aprobación</div>
                    <div className="text-gray-800 dark:text-white/90 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                      {balance.approval_notes}
                    </div>
                  </div>
                )}

                {balance.payment_notes && (
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 mb-1">Notas de pago</div>
                    <div className="text-gray-800 dark:text-white/90 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                      {balance.payment_notes}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ComponentCard>



      {/* Detalles del balance - Viajes */}
      <ComponentCard>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Viajes Incluidos
          </h3>
        </div>

        {tripDetails.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ID Viaje
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Origen
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Destino
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tarifa
                  </th>
                  {balance.balance_type === 'DRIVER_PAYMENT' && (
                    <>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Comisión (%)
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Comisión ($)
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Monto Conductor
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
                {tripDetails.map((detail) => (
                  <tr key={detail.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/70">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{detail.trip_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatSimpleDate(detail.trip_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="truncate max-w-[150px]" title={detail.origin_address}>
                        {detail.origin_address}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="truncate max-w-[150px]" title={detail.destination_address}>
                        {detail.destination_address}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 font-medium">
                      {formatCurrency(detail.fare_amount)}
                    </td>
                    {balance.balance_type === 'DRIVER_PAYMENT' && (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {detail.commission_rate}%
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
                          -{formatCurrency(detail.commission_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 font-medium">
                          {formatCurrency(detail.driver_amount)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 py-4 text-center">
            No hay viajes para este balance
          </p>
        )}
      </ComponentCard>

      {/* Modal para aprobar balance */}
      <Modal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        title="Aprobar Balance"
      >
        <form onSubmit={handleApproveSubmit} className="space-y-4">
          <div>
            <Label htmlFor="approval-notes">Notas de Aprobación (opcional)</Label>
            <TextArea
              id="approval-notes"
              value={approvalNotes}
              onChange={(value) => setApprovalNotes(value)}
              placeholder="Notas o comentarios adicionales para la aprobación..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsApprovalModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Aprobar Balance
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal para marcar como pagado */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Marcar Balance como Pagado"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div>
            <Label htmlFor="payment-method">Método de Pago</Label>
            <Select
              id="payment-method"
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={paymentMethodOptions}
            />
          </div>
          <div>
            <Label htmlFor="payment-reference">Referencia de Pago</Label>
            <Input
              id="payment-reference"
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Número de transferencia, cheque, etc."
            />
          </div>
          <div>
            <Label htmlFor="payment-notes">Notas (opcional)</Label>
            <TextArea
              id="payment-notes"
              value={paymentNotes}
              onChange={(value) => setPaymentNotes(value)}
              placeholder="Notas adicionales sobre el pago..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Confirmar Pago
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de ajustes */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title="Añadir Ajuste al Balance"
      >
        <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
          <div>
            <Label htmlFor="adjustment-type">Tipo de Ajuste</Label>
            <Select
              id="adjustment-type"
              value={adjustmentForm.adjustment_type}
              onChange={(value) => setAdjustmentForm(prev => ({ ...prev, adjustment_type: value }))}
              options={adjustmentTypeOptions}
            />
          </div>
          <div>
            <Label htmlFor="adjustment-amount">Monto</Label>
            <Input
              id="adjustment-amount"
              type="number"
              step="0.01"
              min="0"
              value={adjustmentForm.amount.toString()}
              onChange={(e) => setAdjustmentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="adjustment-description">Descripción</Label>
            <TextArea
              id="adjustment-description"
              value={adjustmentForm.description}
              onChange={(value) => setAdjustmentForm(prev => ({ ...prev, description: value }))}
              placeholder="Describa el propósito de este ajuste..."
              required
            />
          </div>
          <div>
            <Label htmlFor="adjustment-reference">Referencia (opcional)</Label>
            <Input
              id="adjustment-reference"
              type="text"
              value={adjustmentForm.reference || ''}
              onChange={(e) => setAdjustmentForm(prev => ({ ...prev, reference: e.target.value }))}
              placeholder="Número de factura, ticket, etc."
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsAdjustmentModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Añadir Ajuste
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}