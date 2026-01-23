'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { fetchApi } from '@/app/lib/data'
import Alert from '@/components/ui/alert/Alert'
import Button from '@/components/ui/button/Button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'

interface Vehicle {
  id: string
  license_plate: string
  brand: string
  model: string
  year?: string
  owner?: string | { id: string; name?: string }
  color?: string
  vin?: string
  created_at?: string
}

interface ApiResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

interface Customer { id: string; name: string }

interface AlertState { show: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }

const VehiclesPage = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [alert, setAlert] = useState<AlertState>({ show: false, type: 'info', title: '', message: '' })
  const [customers, setCustomers] = useState<Customer[]>([])

  const itemsPerPage = 10

  const customerMap = useMemo(() => {
    const map: Record<string, string> = {}
    customers.forEach(c => { map[c.id] = c.name })
    return map
  }, [customers])

  const showAlert = (type: AlertState['type'], title: string, message: string) => {
    setAlert({ show: true, type, title, message })
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000)
  }

  const loadCustomers = async () => {
    try {
      const cs = await fetchApi<ApiResponse<Customer>>('/api/customers/?limit=200', { method: 'GET' })
      setCustomers(cs?.results || [])
    } catch {}
  }

  const loadVehicles = async (page = 1, search = '') => {
    try {
      setLoading(true)
      const offset = (page - 1) * itemsPerPage
      let url = `/api/vehicles/?limit=${itemsPerPage}&offset=${offset}`
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`
      const data = await fetchApi<ApiResponse<Vehicle>>(url, { method: 'GET' })
      if (data) {
        setVehicles(data.results)
        setTotalCount(data.count)
        setTotalPages(Math.ceil(data.count / itemsPerPage) || 1)
      } else {
        showAlert('error', 'Error', 'No se pudieron cargar los vehículos')
      }
    } catch {
      showAlert('error', 'Error', 'Error de conexión al cargar los vehículos')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadVehicles(1, searchTerm)
  }

  const deleteVehicle = async (id: string) => {
    try {
      const resp = await fetchApi(`/api/vehicles/${id}/`, { method: 'DELETE' })
      if (resp === null) {
        showAlert('success', 'Éxito', 'Vehículo eliminado')
        loadVehicles(currentPage, searchTerm)
      } else {
        showAlert('error', 'Error', 'No se pudo eliminar el vehículo')
      }
    } catch {
      showAlert('error', 'Error', 'Error de conexión al eliminar el vehículo')
    }
  }

  useEffect(() => {
    loadCustomers()
    loadVehicles()
  }, [])

  return (
    <div className="p-6">
      {alert.show && (
        <div className="mb-4"><Alert variant={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(prev => ({ ...prev, show: false }))} /></div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vehículos</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestión de vehículos de clientes</p>
        </div>
        <Link href="/vehicles/add">
          <Button className="w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Agregar Vehículo
          </Button>
        </Link>
      </div>
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1">
            <input type="text" placeholder="Buscar por patente, marca o modelo" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <Button type="submit" variant="outline">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Buscar
          </Button>
        </form>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Patente</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Marca/Modelo</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Año</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Cliente</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Acciones</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400"><div className="flex items-center justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div><span className="ml-2">Cargando vehículos...</span></div></TableCell></TableRow>
                ) : vehicles.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">No se encontraron vehículos</TableCell></TableRow>
                ) : (
                  vehicles.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start"><span className="text-gray-700 font-medium dark:text-white/80">{v.license_plate || '—'}</span></TableCell>
                      <TableCell className="px-5 py-4 sm:px-6 text-start"><div className="flex flex-col"><span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{[v.brand, v.model].filter(Boolean).join(' ') || '—'}</span><span className="text-xs text-gray-500">{v.vin || ''}</span></div></TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{v.year || '—'}</TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{typeof v.owner === 'object' ? (v.owner?.name || v.owner?.id) : (v.owner ? customerMap[String(v.owner)] || String(v.owner) : '—')}</TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Link href={`/vehicles/${v.id}`} className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400">Ver</Link>
                          <button onClick={() => deleteVehicle(v.id)} className="px-3 py-1 text-xs text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">Eliminar</button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {vehicles.length > 0 && (
              <div className="mt-4 flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-sm text-gray-700 dark:text-gray-300"><p>Mostrando <span className="font-medium">{vehicles.length}</span> vehículos, página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span></p></div>
                <div className="flex space-x-2">
                  <button onClick={() => { const newPage = Math.max(1, currentPage - 1); setCurrentPage(newPage); loadVehicles(newPage, searchTerm) }} disabled={currentPage === 1} className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'}`}>Anterior</button>
                  <button onClick={() => { const newPage = Math.min(totalPages, currentPage + 1); setCurrentPage(newPage); loadVehicles(newPage, searchTerm) }} disabled={currentPage === totalPages} className={`px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'}`}>Siguiente</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VehiclesPage
