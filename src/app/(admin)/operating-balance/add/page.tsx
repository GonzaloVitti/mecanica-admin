'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/app/lib/data';
import ComponentCard from "@/components/common/ComponentCard";
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Select from '@/components/form/Select';
import Alert from '@/components/ui/alert/Alert';
import { ChevronDownIcon, ArrowLeftIcon } from '@/icons';

interface Driver {
  id: number;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
  };
}

interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface FormData {
  balance_type: string;
  entity_type: string;
  entity_id: string;
  period_start: string;
  period_end: string;
  commission_percentage: number;
  additional_discounts: number;
  bonuses: number;
  notes: string;
}

interface Option {
  value: string;
  label: string;
}

const BalanceAdd = () => {
  const router = useRouter();

  // Estados para datos
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para alertas
  const [alertState, setAlertState] = useState({
    show: false,
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  });

  // Estado del formulario
  const [formData, setFormData] = useState<FormData>({
    balance_type: 'DRIVER_PAYMENT',
    entity_type: 'driver',
    entity_id: '',
    period_start: '',
    period_end: '',
    commission_percentage: 15,
    additional_discounts: 0,
    bonuses: 0,
    notes: ''
  });

  // Estado para errores del formulario
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Cargar datos iniciales
  useEffect(() => {
    fetchDrivers();
  }, []);

  // Cargar conductores
  const fetchDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const response = await fetchApi<ApiResponse<Driver>>('/api/drivers/?limit=100');
      if (response && response.results) {
        setDrivers(response.results);
      }
    } catch (error) {
      showAlert('error', 'Error', 'No se pudieron cargar los conductores');
      console.error('Error al cargar conductores:', error);
    } finally {
      setLoadingDrivers(false);
    }
  };

  // Opciones para los select
  const driverOptions: Option[] = drivers.map(driver => ({
    value: String(driver.id),
    label: `${driver.user.first_name} ${driver.user.last_name} (${driver.user.email})`
  }));

  // Efecto para ocultar alertas después de un tiempo
  useEffect(() => {
    if (alertState.show) {
      const timer = setTimeout(() => {
        setAlertState(prev => ({ ...prev, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertState.show]);

  // Función para mostrar alertas
  const showAlert = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ) => {
    setAlertState({
      show: true,
      type,
      title,
      message
    });
  };

  // Manejadores de cambios en los inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error cuando el usuario escribe
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // Manejador para inputs numéricos
  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : parseFloat(value);

    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));

    // Limpiar error cuando el usuario escribe
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // Manejador para selects
  const handleSelectChange = (name: keyof FormData) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error cuando el usuario selecciona
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // Validación del formulario
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.entity_id) {
      newErrors.entity_id = 'Debe seleccionar un conductor';
    }

    if (!formData.period_start) {
      newErrors.period_start = 'La fecha de inicio es requerida';
    }

    if (!formData.period_end) {
      newErrors.period_end = 'La fecha de fin es requerida';
    } else if (formData.period_start && new Date(formData.period_start) >= new Date(formData.period_end)) {
      newErrors.period_end = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }

    if (formData.commission_percentage < 0) {
      newErrors.commission_percentage = 'La comisión no puede ser negativa';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Llamar a la API para generar el balance
      await fetchApi('/api/balances/generate_balance/', {
        method: 'POST',
        body: formData
      });

      // Mostrar alerta de éxito
      showAlert('success', 'Éxito', 'Pago creado correctamente');
      
      // Navegar después de un breve retraso
      setTimeout(() => {
        router.push('/operating-balance/');
      }, 1500);

    } catch (error) {
      console.error('Error al crear pago:', error);
      showAlert('error', 'Error', 'No se pudo crear el pago. Verifique los datos e intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancelar y volver
  const handleCancel = () => {
    router.push('/operating-balance');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {alertState.show && (
        <div className="mb-6">
          <Alert
            variant={alertState.type}
            title={alertState.title}
            message={alertState.message}
          />
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Crear Nuevo Pago a Conductor
        </h1>
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Volver</span>
        </button>
      </div>

      <ComponentCard>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Información del Pago</h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Conductor */}
            <div>
              <Label>Conductor *</Label>
              <div className="relative">
                {loadingDrivers ? (
                  <div className="w-full h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"></div>
                ) : (
                  <Select
                    options={driverOptions}
                    value={formData.entity_id}
                    onChange={handleSelectChange('entity_id')}
                    placeholder="Seleccione un conductor"
                    error={!!errors.entity_id}
                  />
                )}
                <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                  <ChevronDownIcon />
                </span>
              </div>
              {errors.entity_id && (
                <span className="text-xs text-red-500">{errors.entity_id}</span>
              )}
            </div>

            {/* Comisión */}
            <div>
              <Label>Porcentaje de Comisión *</Label>
              <div className="relative">
                <Input
                  type="number"
                  name="commission_percentage"
                  value={formData.commission_percentage.toString()}
                  onChange={handleNumberInputChange}
                  placeholder="Ej: 15"
                  min="0"
                  max="100"
                  step="0.01"
                  error={!!errors.commission_percentage}
                />
              </div>
              {errors.commission_percentage && (
                <span className="text-xs text-red-500">{errors.commission_percentage}</span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">Porcentaje que se queda la empresa</span>
            </div>

            {/* Fecha de inicio */}
            <div>
              <Label>Fecha de inicio del periodo *</Label>
              <Input
                type="date"
                name="period_start"
                value={formData.period_start}
                onChange={handleInputChange}
                error={!!errors.period_start}
              />
              {errors.period_start && (
                <span className="text-xs text-red-500">{errors.period_start}</span>
              )}
            </div>

            {/* Fecha de fin */}
            <div>
              <Label>Fecha de fin del periodo *</Label>
              <Input
                type="date"
                name="period_end"
                value={formData.period_end}
                onChange={handleInputChange}
                error={!!errors.period_end}
              />
              {errors.period_end && (
                <span className="text-xs text-red-500">{errors.period_end}</span>
              )}
            </div>
          </div>

          <h3 className="text-lg font-medium text-gray-900 dark:text-white pt-4">Ajustes Financieros</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Descuentos adicionales */}
            <div>
              <Label>Descuentos Adicionales</Label>
              <Input
                type="number"
                name="additional_discounts"
                value={formData.additional_discounts.toString()}
                onChange={handleNumberInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                error={!!errors.additional_discounts}
              />
              {errors.additional_discounts && (
                <span className="text-xs text-red-500">{errors.additional_discounts}</span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">Monto en pesos (ARS)</span>
            </div>

            {/* Bonificaciones */}
            <div>
              <Label>Bonificaciones</Label>
              <Input
                type="number"
                name="bonuses"
                value={formData.bonuses.toString()}
                onChange={handleNumberInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                error={!!errors.bonuses}
              />
              {errors.bonuses && (
                <span className="text-xs text-red-500">{errors.bonuses}</span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">Monto en pesos (ARS)</span>
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label>Notas</Label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Notas adicionales sobre este pago..."
              className="w-full rounded-lg border border-gray-500 bg-transparent px-4 py-2 outline-none transition 
                focus:border-primary active:border-primary 
                dark:border-gray-700 dark:focus:border-primary dark:text-gray-300
                dark:placeholder-gray-500 dark:bg-gray-800/30 h-24 resize-none"
            ></textarea>
          </div>

          <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="inline animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creando...
                </>
              ) : 'Crear Pago a Conductor'}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
};

export default BalanceAdd;