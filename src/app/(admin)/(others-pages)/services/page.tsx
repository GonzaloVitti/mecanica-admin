'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchApi } from '@/app/lib/data'
import Alert from '@/components/ui/alert/Alert'
import Button from '@/components/ui/button/Button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import Badge from '@/components/ui/badge/Badge'

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
  promised_date?: string
  final_total: string
  created_at: string
}

interface ApiResponse {
  count: number
  next: string | null
  previous: string | null
  results: WorkOrder[]
}

interface AlertState {
  show: boolean
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
}

const ServicesPage = () => {
  const [items, setItems] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [alert, setAlert] = useState<AlertState>({ show: false, type: 'info', title: '', message: '' })

  const itemsPerPage = 10

  const showAlert = (type: AlertState['type'], title: string, message: string) => {
    setAlert({ show: true, type, title, message })
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }))
    }, 5000)
  }

  const loadItems = async (page = 1, search = '') => {
    try {
      setLoading(true)
      const offset = (page - 1) * itemsPerPage
      let url = `/api/work-orders/?limit=${itemsPerPage}&offset=${offset}`
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`
      const data = await fetchApi<ApiResponse>(url, { method: 'GET' })
      if (data) {
        setItems(data.results)
        setTotalCount(data.count)
        setTotalPages(Math.ceil(data.count / itemsPerPage) || 1)
      } else {
        showAlert('error', 'Error', 'No se pudieron cargar los servicios')
      }
    } catch (error) {
      showAlert('error', 'Error', 'Error de conexión al cargar los servicios')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadItems(1, searchTerm)
  }

  const callAction = async (id: string, action: 'start' | 'complete' | 'cancel') => {
    try {
      const data = await fetchApi(`/api/work-orders/${id}/${action}/`, { method: 'POST' })
      if (data !== null) {
        showAlert('success', 'Éxito', 'Acción realizada')
        loadItems(currentPage, searchTerm)
      } else {
        showAlert('error', 'Error', 'No se pudo ejecutar la acción')
      }
    } catch {
      showAlert('error', 'Error', 'Error de conexión al ejecutar la acción')
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  const statusColor = (s: WorkOrder['status']) => {
    if (s === 'NEW') return 'info'
    if (s === 'IN_PROGRESS') return 'warning'
    if (s === 'WAITING_PARTS' || s === 'ON_HOLD') return 'warning'
    if (s === 'COMPLETED' || s === 'DELIVERED') return 'success'
    if (s === 'CANCELLED') return 'error'
    return 'info'
  }

  const formatCurrency = (value: string | number) => {
    const n = typeof value === 'string' ? parseFloat(value) : value
    if (Number.isNaN(n)) return '—'
    return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
  }

  const printWorkOrder = async (order: WorkOrder) => {
    const win = window.open('', '_blank')
    if (!win) return
    const detail = await fetchApi<any>(`/api/work-orders/${order.id}/`, { method: 'GET' })
    const logoUrl = (process.env.NEXT_PUBLIC_WORKSHOP_LOGO_URL || '').trim()
    const shopName = (process.env.NEXT_PUBLIC_WORKSHOP_NAME || 'Nombre del Taller').trim()
    const shopAddress = (process.env.NEXT_PUBLIC_WORKSHOP_ADDRESS || '').trim()
    const shopPhone = (process.env.NEXT_PUBLIC_WORKSHOP_PHONE || '').trim()
    const shopEmail = (process.env.NEXT_PUBLIC_WORKSHOP_EMAIL || '').trim()
    const items = Array.isArray(detail?.items) ? detail.items : []
    const workDescription = String(detail?.work_description || '')
    const notes = String(detail?.notes || '')
    const laborItems = items.filter((it: any) => it.item_type === 'LABOR')
    const partItems = items.filter((it: any) => it.item_type === 'PART')
    const sumBase = (arr: any[]) => arr.reduce((acc, it) => acc + Number(it.quantity || 0) * Number(it.unit_price || 0), 0)
    const sumTax = (arr: any[]) => arr.reduce((acc, it) => { const b = Number(it.quantity || 0) * Number(it.unit_price || 0); const t = Number(it.tax_rate || 0); return acc + b * (t / 100) }, 0)
    const fmt = (v: number | string) => formatCurrency(v)
    const laborRows = laborItems.map((it: any) => { const qty = Number(it.quantity || 0); const price = Number(it.unit_price || 0); const base = qty * price; const iva = base * (Number(it.tax_rate || 0) / 100); const tot = base + iva; return `<tr><td>${it.description || ''}</td><td>${qty}</td><td>${fmt(price)}</td><td>${fmt(base)}</td><td>${fmt(iva)}</td><td>${fmt(tot)}</td></tr>` }).join('')
    const partRows = partItems.map((it: any) => { const qty = Number(it.quantity || 0); const price = Number(it.unit_price || 0); const base = qty * price; const iva = base * (Number(it.tax_rate || 0) / 100); const tot = base + iva; return `<tr><td>${it.description || ''}</td><td>${qty}</td><td>${fmt(price)}</td><td>${fmt(base)}</td><td>${fmt(iva)}</td><td>${fmt(tot)}</td></tr>` }).join('')
    const grandTotal = sumBase(items) + sumTax(items)
    const styles = `
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; padding: 24px; color: #111827; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .logo-box { width: 140px; height: 90px; border: 1px dashed #D1D5DB; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 6px; background: #F9FAFB; }
        .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .company { text-align: right; font-size: 12px; color: #374151; }
        .company .name { font-size: 16px; font-weight: 600; color: #111827; }
        .title { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
        .section { margin-top: 16px; }
        .label { font-weight: 600; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #E5E7EB; padding: 8px; font-size: 12px; text-align: left; }
        th { background: #F3F4F6; }
        .section-title { font-size: 14px; font-weight: 600; margin-top: 16px; }
        .totals { margin-top: 8px; text-align: right; }
        .muted { color: #6B7280; }
      </style>
    `
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Servicio ${order.work_order_number}</title>
          ${styles}
        </head>
        <body>
          <div class="header">
            <div class="logo-box">${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ''}</div>
            <div class="company">
              <div class="name">${shopName}</div>
              ${shopAddress ? `<div>${shopAddress}</div>` : ''}
              ${shopPhone ? `<div>${shopPhone}</div>` : ''}
              ${shopEmail ? `<div>${shopEmail}</div>` : ''}
            </div>
          </div>
          <div class="title">Presupuesto / Servicio ${order.work_order_number}</div>
          <div class="grid section">
            <div><span class="label">Cliente:</span> ${order.customer_name || '—'}</div>
            <div><span class="label">Teléfono:</span> ${order.customer_phone || '—'}</div>
            <div><span class="label">Vehículo:</span> ${[order.vehicle_brand, order.vehicle_model].filter(Boolean).join(' ') || '—'}</div>
            <div><span class="label">Patente:</span> ${order.vehicle_license_plate || '—'}</div>
          </div>
          <div class="section"><span class="label">Trabajo a realizar:</span> ${workDescription || '—'}</div>
          <div class="section-title">Mano de obra</div>
          <table>
            <thead>
              <tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Subtotal</th><th>IVA</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${laborRows || `<tr><td colspan="6" class="muted">Sin mano de obra</td></tr>`}
            </tbody>
          </table>
          <div class="totals"><span class="label">Subtotal mano de obra:</span> ${fmt(sumBase(laborItems) + sumTax(laborItems))}</div>
          <div class="section-title">Repuestos</div>
          <table>
            <thead>
              <tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Subtotal</th><th>IVA</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${partRows || `<tr><td colspan="6" class="muted">Sin repuestos</td></tr>`}
            </tbody>
          </table>
          <div class="totals"><span class="label">Subtotal repuestos:</span> ${fmt(sumBase(partItems) + sumTax(partItems))}</div>
          <div class="totals"><span class="label">Total:</span> ${fmt(grandTotal)}</div>
          <div class="section"><span class="label">Notas:</span> ${notes || '—'}</div>
        </body>
      </html>
    `
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  return (
    <div className="p-6">
      {alert.show && (
        <div className="mb-4">
          <Alert variant={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(prev => ({ ...prev, show: false }))} />
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Servicios</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestión de órdenes de trabajo</p>
        </div>
        <Link href="/services/add">
          <Button className="w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Crear Servicio
          </Button>
        </Link>
      </div>
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1">
            <input type="text" placeholder="Buscar por número, patente o notas" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <Button type="submit" variant="outline">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Buscar
          </Button>
        </form>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1102px]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Número</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Estado</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Cliente</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Vehículo</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Creado</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Acciones</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400"><div className="flex items-center justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div><span className="ml-2">Cargando servicios...</span></div></TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">No se encontraron servicios</TableCell></TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start"><span className="text-gray-700 font-medium dark:text-white/80">{item.work_order_number}</span></TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400"><Badge size="sm" color={statusColor(item.status)}>{item.status}</Badge></TableCell>
                      <TableCell className="px-5 py-4 sm:px-6 text-start"><div className="flex flex-col"><span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{item.customer_name || '—'}</span><span className="text-xs text-gray-500">{item.customer_phone || ''}</span></div></TableCell>
                      <TableCell className="px-5 py-4 sm:px-6 text-start"><div className="flex flex-col"><span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{item.vehicle_license_plate || '—'}</span><span className="text-xs text-gray-500">{[item.vehicle_brand, item.vehicle_model].filter(Boolean).join(' ')}</span></div></TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatCurrency(item.final_total)}</TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{new Date(item.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Link href={`/services/${item.id}`} className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400">Ver</Link>
                          <button onClick={() => printWorkOrder(item)} className="px-3 py-1 text-xs text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300">Imprimir</button>
                          {item.status === 'NEW' && (
                            <button onClick={() => callAction(item.id, 'start')} className="px-3 py-1 text-xs text-green-600 bg-green-100 rounded-md hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">Iniciar</button>
                          )}
                          {item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && (
                            <button onClick={() => callAction(item.id, 'complete')} className="px-3 py-1 text-xs text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400">Completar</button>
                          )}
                          {item.status !== 'COMPLETED' && (
                            <button onClick={() => callAction(item.id, 'cancel')} className="px-3 py-1 text-xs text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">Cancelar</button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {items.length > 0 && (
              <div className="mt-4 flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-sm text-gray-700 dark:text-gray-300"><p>Mostrando <span className="font-medium">{items.length}</span> servicios, página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span></p></div>
                <div className="flex space-x-2">
                  <button onClick={() => { const newPage = Math.max(1, currentPage - 1); setCurrentPage(newPage); loadItems(newPage, searchTerm) }} disabled={currentPage === 1} className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'}`}>Anterior</button>
                  <button onClick={() => { const newPage = Math.min(totalPages, currentPage + 1); setCurrentPage(newPage); loadItems(newPage, searchTerm) }} disabled={currentPage === totalPages} className={`px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'}`}>Siguiente</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServicesPage
