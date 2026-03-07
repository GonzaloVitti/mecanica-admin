'use client'
import React, { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import Badge from '@/components/ui/badge/Badge'
import { fetchApi } from '@/app/lib/data'
import Alert from '@/components/ui/alert/Alert'

interface WorkOrder {
  id: string
  work_order_number: string
  status: 'NEW' | 'DIAGNOSTIC' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'ON_HOLD' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  customer_name: string
  customer_phone: string
  vehicle_license_plate: string
  vehicle_brand: string
  vehicle_model: string
  final_total: string
  created_at: string
}

interface ApiResponse {
  count: number
  next: string | null
  previous: string | null
  results: WorkOrder[]
}

interface Mechanic {
  id: string
  first_name: string
  last_name: string
  phone_number?: string
  role: string
}

interface AlertState {
  show: boolean
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
}

const ServicesReportsPage = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState<AlertState>({ show: false, type: 'info', title: '', message: '' })

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null)
  const [previousPageUrl, setPreviousPageUrl] = useState<string | null>(null)

  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [selectedMechanic, setSelectedMechanic] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  const showAlert = (type: AlertState['type'], title: string, message: string) => {
    setAlert({ show: true, type, title, message })
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000)
  }

  const fetchMechanics = async () => {
    try {
      const response = await fetchApi<{ results: Mechanic[] }>(`/api/users/?limit=200`, { method: 'GET' })
      const list = (response?.results || []).filter(u => u.role === 'MECHANIC')
      setMechanics(list)
    } catch {}
  }

  const fetchWorkOrders = async (url?: string) => {
    try {
      let apiUrl: string
      if (url) {
        apiUrl = url
      } else {
        apiUrl = '/api/work-orders/'
        const params = new URLSearchParams()
        if (selectedMechanic !== 'all') params.append('mechanics', selectedMechanic)
        if (statusFilter !== 'ALL') params.append('status', statusFilter)
        if (startDate) params.append('created_at__gte', startDate)
        if (endDate) params.append('created_at__lte', endDate)
        if (searchTerm.trim()) params.append('search', searchTerm.trim())
        params.append('limit', '20')
        apiUrl += `?${params.toString()}`
      }
      const response = await fetchApi<ApiResponse>(apiUrl)
      if (response) {
        setWorkOrders(response.results)
        setTotalCount(response.count)
        setNextPageUrl(response.next)
        setPreviousPageUrl(response.previous)
        const itemsPerPage = 20
        setTotalPages(Math.ceil(response.count / itemsPerPage) || 1)
        if (url) {
          const urlObj = new URL(url, window.location.origin)
          const offset = parseInt(urlObj.searchParams.get('offset') || '0')
          setCurrentPage(Math.floor(offset / itemsPerPage) + 1)
        } else {
          setCurrentPage(1)
        }
      }
    } catch {
      showAlert('error', 'Error', 'No se pudieron cargar los servicios')
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchMechanics(), fetchWorkOrders()])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!loading) fetchWorkOrders()
  }, [selectedMechanic, statusFilter, startDate, endDate, searchTerm])

  const goToNextPage = () => { if (nextPageUrl) fetchWorkOrders(nextPageUrl) }
  const goToPreviousPage = () => { if (previousPageUrl) fetchWorkOrders(previousPageUrl) }

  const statusColor = (s: WorkOrder['status']) => {
    if (s === 'NEW') return 'info'
    if (s === 'IN_PROGRESS') return 'warning'
    if (s === 'WAITING_PARTS' || s === 'ON_HOLD' || s === 'DIAGNOSTIC') return 'warning'
    if (s === 'COMPLETED' || s === 'DELIVERED') return 'success'
    if (s === 'CANCELLED') return 'error'
    return 'default'
  }

  const statusText = (s: WorkOrder['status']) => {
    if (s === 'NEW') return 'Nuevo'
    if (s === 'DIAGNOSTIC') return 'Diagnóstico'
    if (s === 'IN_PROGRESS') return 'En progreso'
    if (s === 'WAITING_PARTS') return 'Esperando repuestos'
    if (s === 'ON_HOLD') return 'En pausa'
    if (s === 'COMPLETED') return 'Completado'
    if (s === 'DELIVERED') return 'Entregado'
    if (s === 'CANCELLED') return 'Cancelado'
    return s
  }

  const formatCurrency = (value: string | number) => {
    const n = typeof value === 'string' ? parseFloat(value) : value
    if (Number.isNaN(n)) return '—'
    return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
  }

  const handleExportPDF = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {alert.show && (
        <div className="mb-4">
          <Alert variant={alert.type} title={alert.title} message={alert.message} />
        </div>
      )}

      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Reportes de Servicios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Análisis de órdenes de trabajo</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">Exportar PDF</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 mb-8 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mecánico</label>
            <select value={selectedMechanic} onChange={(e) => setSelectedMechanic(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="all">Todos</option>
              {mechanics.map(m => (
                <option key={m.id} value={m.id}>{`${m.first_name || ''} ${m.last_name || ''}${m.phone_number ? ` • ${m.phone_number}` : ''}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estado</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="ALL">Todos</option>
              <option value="NEW">Nuevo</option>
              <option value="DIAGNOSTIC">Diagnóstico</option>
              <option value="IN_PROGRESS">En progreso</option>
              <option value="WAITING_PARTS">Esperando repuestos</option>
              <option value="ON_HOLD">En pausa</option>
              <option value="COMPLETED">Completado</option>
              <option value="DELIVERED">Entregado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fecha Inicio</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} onClick={(e) => e.currentTarget.showPicker?.()} className="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fecha Fin</label>
            <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} onClick={(e) => e.currentTarget.showPicker?.()} className="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Buscar</label>
          <input type="text" placeholder="Buscar por número, cliente, patente, marca/modelo o notas" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Servicios ({totalCount} total)</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Página {currentPage} de {totalPages}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={goToPreviousPage} disabled={!previousPageUrl} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300">Anterior</button>
              <span className="text-sm text-gray-600 dark:text-gray-400">{currentPage} / {totalPages}</span>
              <button onClick={goToNextPage} disabled={!nextPageUrl} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300">Siguiente</button>
            </div>
          </div>
        </div>
        <div className="overflow-hidden">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1100px]">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Número</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Cliente</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Vehículo</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Estado</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Fecha</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {workOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">No se encontraron servicios</TableCell>
                    </TableRow>
                  ) : (
                    workOrders.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start"><span className="text-gray-800 font-medium">{item.work_order_number}</span></TableCell>
                        <TableCell className="px-5 py-4 sm:px-6 text-start"><div className="flex flex-col"><span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{item.customer_name || '—'}</span><span className="text-xs text-gray-500">{item.customer_phone || ''}</span></div></TableCell>
                        <TableCell className="px-5 py-4 sm:px-6 text-start"><div className="flex flex-col"><span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{item.vehicle_license_plate || '—'}</span><span className="text-xs text-gray-500">{[item.vehicle_brand, item.vehicle_model].filter(Boolean).join(' ')}</span></div></TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400"><Badge size="sm" color={statusColor(item.status)}>{statusText(item.status)}</Badge></TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatCurrency(item.final_total)}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{new Date(item.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServicesReportsPage
