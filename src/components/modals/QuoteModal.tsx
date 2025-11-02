'use client'
import React, { useState } from 'react';
import Button from '@/components/ui/button/Button';
import Input from '../form/input/InputField';
import Label from '../form/Label';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuote: (amount: number, notes: string) => void;
  onReject: (notes: string) => void;
  tripId: string;
}

const QuoteModal: React.FC<QuoteModalProps> = ({
  isOpen,
  onClose,
  onQuote,
  onReject,
  tripId
}) => {
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleQuote = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      if (isRejecting) {
        if (!notes.trim()) {
          setError('Por favor, proporciona una razón para rechazar la solicitud');
          return;
        }
        await onReject(notes);
      } else {
        if (!amount || amount.trim() === '') {
          setError('Por favor, ingresa un monto de cotización');
          return;
        }

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          setError('Por favor, ingresa un monto válido positivo');
          return;
        }

        await onQuote(numAmount, notes);
      }
    } catch (error) {
      setError('Ocurrió un error al procesar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          {isRejecting ? 'Rechazar Solicitud VIP' : 'Cotizar Viaje VIP'}
        </h2>
        <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
          ID del viaje: #{tripId.substring(0, 8)}
        </p>

        {!isRejecting && (
          <div className="mb-4">
            <Label htmlFor="amount">Monto de la cotización</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ingresa el monto en ARS"
              className="w-full mt-1"
            />
          </div>
        )}

        <div className="mb-6">
          <Label htmlFor="notes">
            {isRejecting ? 'Razón del rechazo' : 'Notas adicionales (opcional)'}
          </Label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isRejecting ? 'Explica por qué rechazas la solicitud' : 'Agrega notas relevantes para el cliente'}
            rows={4}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
          <div className="flex gap-2">
            <Button
              onClick={handleQuote}
              color={isRejecting ? "danger" : "primary"}
              size="sm"
              className="w-full sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="inline w-4 h-4 mr-2 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {isRejecting ? 'Rechazando...' : 'Enviando...'}
                </>
              ) : (
                isRejecting ? 'Rechazar Solicitud' : 'Enviar Cotización'
              )}
            </Button>
            {/* Deshabilitar los otros botones durante el envío */}
            {!isRejecting && (
              <Button
                onClick={() => setIsRejecting(true)}
                color="danger"
                size="sm"
                className="w-full sm:w-auto"
                disabled={isSubmitting}
              >
                Rechazar
              </Button>
            )}
            {isRejecting && (
              <Button
                onClick={() => setIsRejecting(false)}
                color="secondary"
                size="sm"
                className="w-full sm:w-auto"
                disabled={isSubmitting}
              >
                Volver a Cotizar
              </Button>
            )}
          </div>
          <Button
            onClick={onClose}
            color="light"
            size="sm"
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuoteModal;