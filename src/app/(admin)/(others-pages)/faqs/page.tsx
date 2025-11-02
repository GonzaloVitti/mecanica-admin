'use client'
import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Badge from '@/components/ui/badge/Badge';
import Button from "@/components/ui/button/Button";
import { fetchApi } from '@/app/lib/data';
import Alert from '@/components/ui/alert/Alert';
import { Modal } from '@/components/ui/modal';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';

interface FAQ {
  id: string;  // Cambiado de number a string para UUID
  question: string;
  answer: string;
  category: 'GENERAL' | 'ACCOUNT' | 'PAYMENT' | 'SERVICE' | 'OTHER';
  category_display: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FAQ[];
}

// Traducir categorías para la UI
const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'GENERAL': 'General',
  'ACCOUNT': 'Cuenta',
  'PAYMENT': 'Pagos',
  'SERVICE': 'Servicio',
  'OTHER': 'Otros'
};

// Interfaz para alertas
interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// Interfaz para el formulario
interface FAQFormData {
  question: string;
  answer: string;
  category: string;
  order: number;
  is_active: boolean;
}

// Componente simple de modal para confirmación de eliminación
const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div 
        className="w-full max-w-md p-6 mx-auto bg-white rounded-xl shadow-lg dark:bg-gray-800 animate-fadeIn"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
          {title}
        </h3>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            variant="danger" 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
};

const Page = () => {
  // Estados para gestionar FAQs
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para filtros
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // Estado para modales
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<FAQ | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  
  // Estado para formulario
  const [formData, setFormData] = useState<FAQFormData>({
    question: '',
    answer: '',
    category: 'GENERAL',
    order: 0,
    is_active: true
  });

  // Estado para alertas
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Función para ocultar la alerta después de cierto tiempo
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (alert.show) {
      timeoutId = setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 5000); // Ocultar después de 5 segundos
    }
    return () => clearTimeout(timeoutId);
  }, [alert.show]);

  // Cargar datos del backend
  const loadFaqs = async () => {
    try {
      setLoading(true);
      // Construir URL con posibles filtros
      let url = '/api/faqs/';
      const queryParams = [];
      
      if (categoryFilter !== 'ALL') {
        queryParams.push(`category=${categoryFilter}`);
      }
      
      if (activeFilter !== 'ALL') {
        queryParams.push(`is_active=${activeFilter === 'ACTIVE'}`);
      }
      
      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }
      
      const response = await fetchApi<ApiResponse>(url);
      if (response && response.results) {
        // Verificar que no haya IDs duplicados
        const uniqueFaqs = response.results.filter((faq, index, self) => 
          index === self.findIndex(f => f.id === faq.id)
        );
        setFaqs(uniqueFaqs);
      }
    } catch (err) {
      setError('Error al cargar las preguntas frecuentes');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar FAQs al inicio y cuando cambien los filtros
  useEffect(() => {
    loadFaqs();
  }, [categoryFilter, activeFilter]);

  // Iniciar proceso de eliminación
  const confirmDelete = (faq: FAQ) => {
    setFaqToDelete(faq);
    setDeleteModalOpen(true);
  };

  // Manejar la eliminación después de la confirmación
  const handleDelete = async () => {
    if (!faqToDelete) return;
    
    try {
      await fetchApi(`/api/faqs/${faqToDelete.id}/`, {
        method: 'DELETE'
      });
      
      // Eliminar de la lista local
      setFaqs(prev => prev.filter(faq => faq.id !== faqToDelete.id));
      
      setAlert({
        show: true,
        type: 'success',
        title: 'Eliminada',
        message: `La pregunta "${faqToDelete.question}" ha sido eliminada correctamente.`
      });
    } catch (err) {
      console.error('Error al eliminar FAQ:', err);
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudo eliminar la pregunta. Intente nuevamente.'
      });
    }
  };

  // Abrir modal para editar
  const openEditModal = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      order: faq.order,
      is_active: faq.is_active
    });
    setFormModalOpen(true);
  };

  // Abrir modal para crear nuevo
  const openCreateModal = () => {
    setEditingFaq(null);
    setFormData({
      question: '',
      answer: '',
      category: 'GENERAL',
      order: faqs.length > 0 ? Math.max(...faqs.map(faq => faq.order)) + 1 : 0,
      is_active: true
    });
    setFormModalOpen(true);
  };

  // Manejar cambios en el formulario
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else if (name === 'order') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Cambiar estado de activación
  const toggleActive = async (faq: FAQ) => {
    try {
      // Actualización optimista en la UI
      setFaqs(prevFaqs => 
        prevFaqs.map(f => 
          f.id === faq.id 
            ? { ...f, is_active: !f.is_active } 
            : f
        )
      );

      // Actualizar en el backend
      await fetchApi(`/api/faqs/${faq.id}/`, {
        method: 'PATCH',
        body: { is_active: !faq.is_active }
      });
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      
      // Revertir cambio en caso de error
      setFaqs(prevFaqs => 
        prevFaqs.map(f => 
          f.id === faq.id 
            ? { ...f, is_active: faq.is_active } 
            : f
        )
      );
      
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudo cambiar el estado. Intente nuevamente.'
      });
    }
  };

  // Enviar formulario (crear o actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.question || !formData.answer) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'La pregunta y la respuesta son campos obligatorios.'
      });
      return;
    }
    
    try {
      if (editingFaq) {
        // Actualizar existente
        const updatedFaq = await fetchApi<FAQ>(`/api/faqs/${editingFaq.id}/`, {
          method: 'PATCH',
          body: formData
        });
        
        if (updatedFaq) {
          setFaqs(prev => prev.map(faq => 
            faq.id === editingFaq.id ? updatedFaq : faq
          ));
          
          setAlert({
            show: true,
            type: 'success',
            title: 'Actualizada',
            message: 'La pregunta ha sido actualizada correctamente.'
          });
        }
      } else {
        // Crear nuevo
        const newFaq = await fetchApi<FAQ>('/api/faqs/', {
          method: 'POST',
          body: formData
        });
        
        if (newFaq) {
          setFaqs(prev => [...prev, newFaq]);
          
          setAlert({
            show: true,
            type: 'success',
            title: 'Creada',
            message: 'La pregunta ha sido creada correctamente.'
          });
        }
      }
      
      setFormModalOpen(false);
    } catch (err) {
      console.error('Error al guardar FAQ:', err);
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudo guardar la pregunta. Intente nuevamente.'
      });
    }
  };

  // Mostrar indicador de carga
  if (loading && faqs.length === 0) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Mostrar error si hay alguno
  if (error && faqs.length === 0) {
    return (
      <div className="p-4">
        <Alert 
          variant="error" 
          title="Error" 
          message={error} 
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Alertas de estado */}
      {alert.show && (
        <div className="mb-6">
          <Alert 
            variant={alert.type}
            title={alert.title}
            message={alert.message}
          />
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Preguntas Frecuentes
        </h1>
        <Button
          onClick={openCreateModal}
          className="px-4 py-2"
        >
          Nueva Pregunta
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label htmlFor="categoryFilter" className="block mb-1 text-sm text-gray-500 dark:text-gray-400">
            Categoría
          </label>
          <select
            id="categoryFilter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
          >
            <option value="ALL">Todas las categorías</option>
            {Object.entries(CATEGORY_TRANSLATIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="activeFilter" className="block mb-1 text-sm text-gray-500 dark:text-gray-400">
            Estado
          </label>
          <select
            id="activeFilter"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
          >
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVE">Activas</option>
            <option value="INACTIVE">Inactivas</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1102px]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    ID
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Orden
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Pregunta
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Categoría
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Estado
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Última actualización
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {faqs.length > 0 ? (
                  faqs.map((faq, index) => (
                    <TableRow key={faq.id || `faq-${index}`}>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {faq.id}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {faq.order}
                      </TableCell>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="max-w-md truncate">
                          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {faq.question}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          size="sm"
                          color="default"
                        >
                          {faq.category_display}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          size="sm"
                          color={faq.is_active ? "success" : "warning"}
                        >
                          {faq.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {new Date(faq.updated_at).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => openEditModal(faq)}
                            variant="primary"
                            size="sm"
                            className="!p-0 !w-8 !h-8 flex-shrink-0"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                          </Button>
                          <Button
                            onClick={() => toggleActive(faq)}
                            variant="primary"
                            size="sm"
                            className="!p-0 !w-8 !h-8 flex-shrink-0"
                          >
                            {faq.is_active ? (
                              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </Button>
                          <Button
                            onClick={() => confirmDelete(faq)}
                            variant="danger"
                            size="sm"
                            className="!p-0 !w-8 !h-8 flex-shrink-0"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      No se encontraron preguntas frecuentes
                      {categoryFilter !== 'ALL' && ` en la categoría ${CATEGORY_TRANSLATIONS[categoryFilter]}`}
                      {activeFilter !== 'ALL' && ` con estado ${activeFilter === 'ACTIVE' ? 'activo' : 'inactivo'}`}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar pregunta frecuente"
        message={faqToDelete ? 
          `¿Estás seguro que deseas eliminar la pregunta "${faqToDelete.question}"? Esta acción no se puede deshacer.` 
          : ''}
      />

      {/* Modal de formulario para crear/editar */}
      <Modal isOpen={formModalOpen} onClose={() => setFormModalOpen(false)}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
              {editingFaq ? 'Editar Pregunta Frecuente' : 'Nueva Pregunta Frecuente'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="question">Pregunta</Label>
                  <Input
                    type="text"
                    id="question"
                    name="question"
                    defaultValue={formData.question}
                    onChange={handleInputChange}
                    placeholder="Escribe la pregunta"
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                  >
                    {Object.entries(CATEGORY_TRANSLATIONS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="order">Orden</Label>
                  <Input
                    type="number"
                    id="order"
                    name="order"
                    defaultValue={formData.order}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="answer">Respuesta</Label>
                  <textarea
                    id="answer"
                    name="answer"
                    value={formData.answer}
                    onChange={handleInputChange}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                    placeholder="Escribe la respuesta"
                  ></textarea>
                </div>
                
                <div className="col-span-2 flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                  />
                  <Label htmlFor="is_active" className="ml-2">Activa</Label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setFormModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingFaq ? 'Guardar Cambios' : 'Crear Pregunta'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Page;