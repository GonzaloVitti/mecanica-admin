"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { fetchApi } from '@/app/lib/data';
import Link from 'next/link';
import Alert from '@/components/ui/alert/Alert';
import Button from '@/components/ui/button/Button';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import TextArea from '@/components/form/input/TextArea';
import Select from '@/components/form/Select';

// Interfaces
interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

interface User {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    role: string;
}

interface Trip {
    id: number;
    driver: number;
    start_time: string;
    status: string;
}

interface NotificationFormData {
    title: string;
    message: string;
    mode: 'INDIVIDUAL'; // Solo modo individual
    type: 'INFO' | 'SYSTEM' | 'TRANSACTION';
    user: number | null;
    metadata: {}; // Mantener vacío pero existente para compatibilidad
    send_push: boolean;
}

interface FormErrors {
    title?: string;
    message?: string;
    mode?: string;
    type?: string;
    user?: string;
    trip?: string;
    roles?: string;
}

const AddNotificationPage = () => {
    const router = useRouter();
    const user = useStore(state => state.user);
    const isSuperUser = user?.is_superuser;

    // Estados
    const [users, setUsers] = useState<User[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Estado del formulario y errores
    const [formData, setFormData] = useState<NotificationFormData>({
        title: '',
        message: '',
        mode: 'INDIVIDUAL', // Solo modo individual
        type: 'INFO',
        user: null,
        metadata: {}, // Vacío
        send_push: true
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [metadataFields, setMetadataFields] = useState<{ key: string, value: string }[]>([
        { key: '', value: '' }
    ]);

    // Cargar usuarios
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetchApi<PaginatedResponse<User>>('/api/users/');
                if (response && response.results) {
                    setUsers(response.results);
                }
            } catch (error) {
                console.error('Error al cargar usuarios:', error);
            }
        };

        fetchUsers();
    }, []);

    // Cargar viajes
    useEffect(() => {
        const fetchTrips = async () => {
            try {
                const response = await fetchApi<PaginatedResponse<Trip>>('/api/trips/');
                if (response && response.results) {
                    setTrips(response.results);
                }
            } catch (error) {
                console.error('Error al cargar viajes:', error);
            }
        };

        fetchTrips();
    }, []);

    // Manejadores de cambios
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        // Verificamos que e y e.target existan antes de desestructurar
        if (!e || !e.target) {
            console.error('Event or target is undefined', e);
            return;
        }

        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                [name]: (e.target as HTMLInputElement).checked
            }));
        } else if (name === 'user' || name === 'trip') {
            setFormData(prev => ({
                ...prev,
                [name]: value ? parseInt(value) : null
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }

        // Limpiar errores al cambiar el campo
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    };

    // Validación del formulario
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
    
        if (!formData.title) newErrors.title = 'El título es requerido';
        if (!formData.message) newErrors.message = 'El mensaje es requerido';
    
        // Ahora siempre es modo INDIVIDUAL, así que siempre validamos usuario
        if (!formData.user) {
            newErrors.user = 'Debes seleccionar un usuario para la notificación';
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
    
        setLoading(true);
    
        try {
            const endpoint = '/api/notifications/';
            let payload = {
                title: formData.title,
                message: formData.message,
                mode: formData.mode,
                type: formData.type,
                user: formData.user,
                metadata: {}, // Vacío pero necesario para compatibilidad
                send_push: formData.send_push
            };
    
            // Enviar la solicitud
            await fetchApi(endpoint, {
                method: 'POST',
                body: payload
            });
    
            setAlert({ type: 'success', message: 'Notificación creada exitosamente' });
    
            // Redirigir después de un breve retraso
            setTimeout(() => {
                router.push('/notifications');
            }, 2000);
    
        } catch (error) {
            console.error('Error al crear notificación:', error);
            setAlert({ type: 'error', message: 'Error al crear la notificación' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <Link
                    href="/notifications"
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
                    <span>Volver a notificaciones</span>
                </Link>
            </div>

            {alert && (
                <div className="mb-6">
                    <Alert
                        variant={alert.type}
                        title={alert.type === 'success' ? 'Éxito' : 'Error'}
                        message={alert.message}
                    />
                </div>
            )}

            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Crear Nueva Notificación
                </h1>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                    Crea y envía una nueva notificación a un usuario específico
                </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Información básica de la notificación */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <Label htmlFor="title">Título</Label>
                            <Input
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="Título de la notificación"
                                error={!!errors.title}
                            />
                            {errors.title && (
                                <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="type">Tipo de Notificación</Label>
                            <select
                                id="type"
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                className="block w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="INFO">Información</option>
                                <option value="SYSTEM">Sistema</option>
                                <option value="TRANSACTION">Transacción</option>
                            </select>
                            {errors.type && (
                                <p className="mt-1 text-sm text-red-500">{errors.type}</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="user">Usuario</Label>
                            <select
                                id="user"
                                name="user"
                                value={formData.user?.toString() || ''}
                                onChange={handleInputChange}
                                className="block w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="">Seleccionar usuario</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.first_name} {user.last_name} ({user.email})
                                    </option>
                                ))}
                            </select>
                            {errors.user && (
                                <p className="mt-1 text-sm text-red-500">{errors.user}</p>
                            )}
                        </div>
                                    
                        <div className="col-span-2">
                            <Label htmlFor="message">Mensaje</Label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleInputChange}
                                rows={4}
                                placeholder="Escribe el contenido de la notificación aquí..."
                                className={`block w-full px-3 py-2 text-gray-700 bg-white border ${errors.message ? 'border-red-500' : 'border-gray-300'
                                    } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                            ></textarea>
                            {errors.message && (
                                <p className="mt-1 text-sm text-red-500">{errors.message}</p>
                            )}
                        </div>

                        <div className="col-span-2 flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    type="checkbox"
                                    id="send_push"
                                    name="send_push"
                                    checked={formData.send_push}
                                    onChange={(e) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            send_push: e.target.checked
                                        }));
                                    }}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="send_push" className="font-medium text-gray-700 dark:text-gray-300">
                                    Enviar notificación push
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Las notificaciones push se enviarán a los dispositivos móviles registrados de los usuarios seleccionados.
                                    Solo los dispositivos activos con tokens válidos recibirán la notificación.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-200 dark:border-gray-800">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/notifications')}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Enviando...' : 'Crear Notificación'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddNotificationPage;