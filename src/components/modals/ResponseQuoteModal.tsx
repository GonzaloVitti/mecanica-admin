import React, { useState } from 'react';
import { Modal } from '../ui/modal';
import Button from '@/components/ui/button/Button';
import Badge from '../ui/badge/Badge';
import TextArea from '../form/input/TextArea';

interface ResponseQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (notes: string) => Promise<void>;
  onDecline: (notes: string) => Promise<void>;
  tripDetails: {
    id: string;
    vip_quote_amount: number | null;
    quoted_by?: string;
    quoted_at?: string;
    quote_notes?: string;
  } | null;
}

const formatCurrency = (amount: number | null) => {
  if (amount === null) return '-';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'ARS'
  }).format(amount);
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ResponseQuoteModal: React.FC<ResponseQuoteModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onDecline,
  tripDetails
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [action, setAction] = useState<'accept' | 'decline' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!action) return;
    
    setIsSubmitting(true);
    
    try {
      if (action === 'accept') {
        await onAccept(notes);
      } else {
        await onDecline(notes);
      }
    } catch (error) {
      console.error('Error al procesar respuesta:', error);
    } finally {
      setIsSubmitting(false);
      setNotes('');
      setAction(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Responder a Cotización VIP">
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          {/* Detalles de la cotización */}
          {tripDetails && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="mb-2 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">ID Viaje:</span>
                <span className="text-sm text-gray-900 dark:text-white">#{tripDetails.id.substring(0, 8)}</span>
              </div>
              <div className="mb-2 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Monto cotizado:</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(tripDetails.vip_quote_amount)}
                </span>
              </div>
              <div className="mb-2 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Cotizado por:</span>
                <span className="text-sm text-gray-900 dark:text-white">{tripDetails.quoted_by || '-'}</span>
              </div>
              <div className="mb-2 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Fecha de cotización:</span>
                <span className="text-sm text-gray-900 dark:text-white">{formatDate(tripDetails.quoted_at)}</span>
              </div>
              {tripDetails.quote_notes && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Notas de cotización:</span>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{tripDetails.quote_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Campo para notas de respuesta */}
          <div className="mb-4">
            <label htmlFor="response-notes" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Notas de respuesta (opcional)
            </label>
            <TextArea
              id="response-notes"
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 outline-none transition focus:border-primary active:border-primary dark:border-gray-700 dark:focus:border-primary"
              rows={4}
              value={notes}
              onChange={(value) => setNotes(value)}
              placeholder="Añade cualquier comentario o información adicional..."
            />
          </div>
          
          {/* Mensaje de confirmación basado en la acción seleccionada */}
          {action && (
            <div className={`p-3 mb-4 rounded-md ${
              action === 'accept' 
                ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {action === 'accept' 
                ? '¿Confirmas que deseas ACEPTAR esta cotización? Esta acción no puede deshacerse.'
                : '¿Confirmas que deseas RECHAZAR esta cotización? Esta acción no puede deshacerse.'
              }
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-end gap-3 rounded-b-xl">
          <Button 
            variant="danger"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            type="button"
          >
            Cancelar
          </Button>
          
          {/* Mostrar botones de aceptar/rechazar solo si no se ha seleccionado una acción */}
          {!action && (
            <>
              <Button 
                variant="warning"
                color="error"
                size="sm"
                onClick={() => setAction('decline')}
                disabled={isSubmitting}
                type="button"
              >
                Rechazar
              </Button>
              <Button 
                variant="success"
                color="success"
                size="sm"
                onClick={() => setAction('accept')}
                disabled={isSubmitting}
                type="button"
              >
                Aceptar
              </Button>
            </>
          )}
          
          {/* Mostrar botón de confirmar si se ha seleccionado una acción */}
          {action && (
            <Button 
              variant="success"
              color={action === 'accept' ? 'success' : 'danger'}
              size="sm"
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? 'Procesando...' 
                : action === 'accept' 
                  ? 'Confirmar aceptación' 
                  : 'Confirmar rechazo'
              }
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default ResponseQuoteModal;