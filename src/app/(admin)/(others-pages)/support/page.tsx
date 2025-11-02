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
import { fetchApi } from '@/app/lib/data';
import Alert from '@/components/ui/alert/Alert';
import Link from 'next/link';

// Interfaces actualizadas para coincidir con la nueva estructura de datos
interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_verified: boolean;
  role: string;
  date_joined: string;
  is_active: boolean;
}

interface Company {
  id: string;
  name: string;
  logo_url?: string;
  tax_id?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone_number?: string;
  email?: string;
  website?: string;
  logo?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Problem {
  id: number;
  user: User;
  company: Company;
  comments: string;
  status: 'PENDING' | 'RESOLVED';
  state: string;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Problem[];
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

const Page = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [resolutionModal, setResolutionModal] = useState<{
    show: boolean;
    problemId: number | null;
    text: string;
  }>({
    show: false,
    problemId: null,
    text: ""
  });

  const [alertMessage, setAlertMessage] = useState<{ show: boolean, type: 'success' | 'error', message: string }>({
    show: false,
    type: 'success',
    message: ''
  });

  // Cargar problemas - versión simplificada
  const fetchProblems = async () => {
    try {
      setLoading(true);

      const response = await fetchApi<ApiResponse>('/api/problems/');

      if (response && response.results) {
        setProblems(response.results);
      }
    } catch (err) {
      setError('Error al cargar los problemas reportados');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para mostrar el modal
const showResolutionModal = (id: number) => {
  setResolutionModal({
    show: true,
    problemId: id,
    text: ""
  });
};

// Función para manejar la confirmación de resolución
const confirmResolve = async () => {
  if (!resolutionModal.problemId || !resolutionModal.text.trim()) {
    setAlertMessage({
      show: true,
      type: 'error',
      message: 'El texto de resolución es requerido'
    });
    return;
  }
  
  try {
    // Optimistic UI update
    setProblems(prevProblems =>
      prevProblems.map(problem => {
        if (problem.id === resolutionModal.problemId) {
          return {
            ...problem,
            status: 'RESOLVED' as const,
            updated_at: new Date().toISOString(),
            resolution_text: resolutionModal.text
          };
        }
        return problem;
      })
    );

    // Llamada a la API con el objeto directamente (sin stringify)
    await fetchApi(`/api/problems/${resolutionModal.problemId}/resolve/`, {
      method: 'POST',
      body: { resolution_text: resolutionModal.text }  // Envía el objeto directamente
    });

    // Cerrar modal y mostrar mensaje de éxito
    setResolutionModal({ show: false, problemId: null, text: "" });
    setAlertMessage({
      show: true,
      type: 'success',
      message: 'Problema marcado como resuelto'
    });
  } catch (err) {
    console.error('Error al resolver el problema:', err);
    fetchProblems();
    setAlertMessage({
      show: true,
      type: 'error',
      message: 'Error al resolver el problema'
    });
  }
};

  // Efecto para aplicar filtro por estado
  useEffect(() => {
    // Aplicar filtro de estado a los problemas
    const filtered = problems.filter(problem =>
      statusFilter === 'ALL' ? true : problem.status === statusFilter
    );

    setFilteredProblems(filtered);
  }, [problems, statusFilter]);

  // Cargar problemas al montar el componente
  useEffect(() => {
    fetchProblems();
  }, []);

  // Ocultar alerta después de 3 segundos
  useEffect(() => {
    if (alertMessage.show) {
      const timer = setTimeout(() => {
        setAlertMessage(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const handleResolve = async (id: number) => {
    try {
      // Optimistic UI update
      setProblems(prevProblems =>
        prevProblems.map(problem => {
          if (problem.id === id) {
            return {
              ...problem,
              status: 'RESOLVED' as const,
              updated_at: new Date().toISOString()
            };
          }
          return problem;
        })
      );

      // Llamada a la API
      await fetchApi(`/api/problems/${id}/resolve/`, {
        method: 'POST'
      });

      // Mostrar alerta de éxito
      setAlertMessage({
        show: true,
        type: 'success',
        message: 'Problema marcado como resuelto'
      });
    } catch (err) {
      console.error('Error al resolver el problema:', err);

      // Revertir el cambio local en caso de error
      fetchProblems();

      // Mostrar alerta de error
      setAlertMessage({
        show: true,
        type: 'error',
        message: 'Error al resolver el problema'
      });
    }
  };

  const handleReopen = async (id: number) => {
    try {
      // Optimistic UI update
      setProblems(prevProblems =>
        prevProblems.map(problem => {
          if (problem.id === id) {
            return {
              ...problem,
              status: 'PENDING' as const,
              updated_at: new Date().toISOString()
            };
          }
          return problem;
        })
      );

      // Llamada a la API
      await fetchApi(`/api/problems/${id}/reopen/`, {
        method: 'POST'
      });

      // Mostrar alerta de éxito
      setAlertMessage({
        show: true,
        type: 'success',
        message: 'Problema reabierto'
      });
    } catch (err) {
      console.error('Error al reabrir el problema:', err);

      // Revertir el cambio local en caso de error
      fetchProblems();

      // Mostrar alerta de error
      setAlertMessage({
        show: true,
        type: 'error',
        message: 'Error al reabrir el problema'
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      // Optimistic UI update
      setProblems(prevProblems =>
        prevProblems.filter(problem => problem.id !== id)
      );

      // Llamada a la API
      await fetchApi(`/api/problems/${id}/`, {
        method: 'DELETE'
      });

      // Mostrar alerta de éxito
      setAlertMessage({
        show: true,
        type: 'success',
        message: 'Problema eliminado correctamente'
      });
    } catch (err) {
      console.error('Error al eliminar el problema:', err);

      // Recargar los datos en caso de error
      fetchProblems();

      // Mostrar alerta de error
      setAlertMessage({
        show: true,
        type: 'error',
        message: 'Error al eliminar el problema'
      });
    }
  };

  // Mostrar loading general
  if (loading && problems.length === 0) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Mostrar error si lo hay
  if (error) {
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
      {/* Mostrar alerta si es necesario */}
      {alertMessage.show && (
        <div className="mb-4">
          <Alert
            variant={alertMessage.type}
            title={alertMessage.type === 'success' ? 'Éxito' : 'Error'}
            message={alertMessage.message}
          />
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Problemas Reportados {problems.length > 0 && `(${problems.length})`}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Visualice y gestione todos los problemas reportados en la plataforma
          </p>
        </div>
      </div>

      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'PENDING' | 'RESOLVED')}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
        >
          <option value="ALL">Todos los estados</option>
          <option value="PENDING">Pendientes</option>
          <option value="RESOLVED">Resueltos</option>
        </select>
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
                    Usuario
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Email
                  </TableCell>

                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Estado
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Estado de la App
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Comentarios
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Fecha de creación
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
                {filteredProblems.length > 0 ? (
                  filteredProblems.map((problem) => (
                    <TableRow key={problem.id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
                          #{problem.id}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <Link
                              href={`/users/${problem.user.id}`}
                              className="font-medium text-gray-800 text-theme-sm dark:text-white/90 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                            >
                              {problem.user.first_name} {problem.user.last_name}
                            </Link>
                            <span className="text-xs text-gray-500">
                              {problem.user.role}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {problem.user.email}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          size="sm"
                          color={problem.status === 'PENDING' ? "warning" : "success"}
                        >
                          {problem.status === 'PENDING' ? "Pendiente" : "Resuelto"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {problem.state}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 max-w-xs">
                        <div className="flex items-center">
                          <div className="truncate max-w-[200px]">
                            {problem.comments}
                          </div>
                          {problem.comments.length > 50 && (
                            <button
                              onClick={() => setSelectedComment(problem.comments)}
                              className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {formatDate(problem.created_at)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {formatDate(problem.updated_at)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          {problem.status === 'PENDING' ? (
                            <button
  onClick={() => showResolutionModal(problem.id)}
  className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
>
  Marcar como resuelto
</button>
                          ) : (
                            <button
                              onClick={() => handleReopen(problem.id)}
                              className="px-3 py-1 text-xs text-yellow-600 bg-yellow-100 rounded-md hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                            >
                              Reabrir
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(problem.id)}
                            className="px-3 py-1 text-xs text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                          >
                            Eliminar
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      No hay problemas reportados
                      {statusFilter !== 'ALL' && ` con estado ${statusFilter === 'PENDING' ? 'pendiente' : 'resuelto'}`}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {selectedComment && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Comentario completo</h3>
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words">
                    {selectedComment}
                  </p>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setSelectedComment(null)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}

{resolutionModal.show && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-2xl">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Resolver Problema</h3>
      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Texto de resolución
      </label>
      <textarea
        value={resolutionModal.text}
        onChange={(e) => setResolutionModal(prev => ({ ...prev, text: e.target.value }))}
        className="w-full p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        rows={5}
        placeholder="Explique cómo se resolvió el problema..."
      />
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={() => setResolutionModal({ show: false, problemId: null, text: "" })}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          Cancelar
        </button>
        <button
          onClick={confirmResolve}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          disabled={!resolutionModal.text.trim()}
        >
          Resolver
        </button>
      </div>
    </div>
  </div>
)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;