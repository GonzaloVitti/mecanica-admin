'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchApi } from '@/app/lib/data'
import Alert from '@/components/ui/alert/Alert'
import Button from '@/components/ui/button/Button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import Badge from '@/components/ui/badge/Badge'
import Label from '@/components/form/Label'
import Input from '@/components/form/input/InputField'

// ─── Tipos ─────────────────────────────────────────────────────────────────

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

interface WorkOrderDetail extends WorkOrder {
  customer: {
    id: string
    name: string
    phone: string
    tax_id: string   // cuit del cliente
    address?: string
  } | null
  items: Array<{
    id: string
    item_type: 'LABOR' | 'PART'
    description: string
    quantity: string
    unit_price: string
    tax_rate: string
    total: string
  }>
}

interface AFIPConfig {
  id: string
  cuit: string
  razon_social: string
  punto_venta: number
  production_mode: boolean
  is_active: boolean
}

interface InvoiceItem {
  descripcion: string
  cantidad: string
  precio_unitario: string
  alicuota_iva: string
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

const ALICUOTAS = [
  { value: '0',    label: '0% (Exento)' },
  { value: '10.5', label: '10.5%' },
  { value: '21',   label: '21%' },
  { value: '27',   label: '27%' },
]

// ─── Página ────────────────────────────────────────────────────────────────

const ServicesPage = () => {
  const [items, setItems] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [alert, setAlert] = useState<AlertState>({ show: false, type: 'info', title: '', message: '' })

  // Modal facturar
  const [invoiceModal, setInvoiceModal] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [afipConfigs, setAfipConfigs] = useState<AFIPConfig[]>([])
  const [selectedConfig, setSelectedConfig] = useState('')
  const [tipoComprobante, setTipoComprobante] = useState('6')
  const [documentoTipo, setDocumentoTipo] = useState('99')
  const [documentoNumero, setDocumentoNumero] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  const [savingInvoice, setSavingInvoice] = useState(false)
  const [currentWO, setCurrentWO] = useState<WorkOrderDetail | null>(null)

  const itemsPerPage = 10

  const showAlert = (type: AlertState['type'], title: string, message: string) => {
    setAlert({ show: true, type, title, message })
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 6000)
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
    } catch {
      showAlert('error', 'Error', 'Error de conexión al cargar los servicios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadItems() }, [])
  useEffect(() => {
    const t = setTimeout(() => { setCurrentPage(1); loadItems(1, searchTerm) }, 350)
    return () => clearTimeout(t)
  }, [searchTerm])

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

  const openQuotePdf = async (id: string) => {
    try {
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim()
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || ''
      const res = await fetch(`${baseUrl}/api/work-orders/${id}/quote_pdf/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { showAlert('error', 'Error', 'No se pudo abrir el PDF'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      showAlert('error', 'Error', 'Error al abrir el presupuesto')
    }
  }

  // ─── Modal Facturar ──────────────────────────────────────────────────────

  const openInvoiceModal = async (wo: WorkOrder) => {
    setInvoiceModal(true)
    setLoadingDetail(true)
    setCurrentWO(null)
    setInvoiceItems([])
    setSavingInvoice(false)

    try {
      // Cargar AFIP configs y detalle del work order en paralelo
      const [cfgRes, woDetail] = await Promise.all([
        fetchApi<{ results: AFIPConfig[] }>('/api/afip-configurations/?is_active=true'),
        fetchApi<WorkOrderDetail>(`/api/work-orders/${wo.id}/`),
      ])

      const configs = cfgRes?.results || []
      setAfipConfigs(configs)
      if (configs.length === 1) setSelectedConfig(configs[0].id)
      else setSelectedConfig('')

      if (woDetail) {
        setCurrentWO(woDetail)

        // Pre-llenar datos del receptor según si el cliente tiene CUIT
        const cuit = woDetail.customer?.tax_id?.replace(/\D/g, '') || ''
        if (cuit && cuit.length >= 10) {
          // Cliente con CUIT → doc tipo 80 (CUIT), sugerir Factura A
          setDocumentoTipo('80')
          setDocumentoNumero(cuit)
          setRazonSocial(woDetail.customer?.name || woDetail.customer_name || '')
          setTipoComprobante('1')  // Factura A
        } else {
          // Sin CUIT → consumidor final, Factura B
          setDocumentoTipo('99')
          setDocumentoNumero('')
          setRazonSocial(woDetail.customer?.name || woDetail.customer_name || '')
          setTipoComprobante('6')  // Factura B
        }

        // Mapear ítems del work order a ítems de factura
        const mapped: InvoiceItem[] = woDetail.items.map(it => ({
          descripcion: it.description || (it.item_type === 'LABOR' ? 'Mano de obra' : 'Repuesto'),
          cantidad: String(parseFloat(it.quantity) || 1),
          precio_unitario: String(parseFloat(it.unit_price) || 0),
          alicuota_iva: String(parseFloat(it.tax_rate) || 21),
        }))
        setInvoiceItems(mapped.length > 0 ? mapped : [{ descripcion: '', cantidad: '1', precio_unitario: '0', alicuota_iva: '21' }])
      }
    } catch {
      showAlert('error', 'Error', 'No se pudo cargar el detalle del servicio')
    } finally {
      setLoadingDetail(false)
    }
  }

  const closeInvoiceModal = () => {
    setInvoiceModal(false)
    setCurrentWO(null)
  }

  const handleItemChange = (idx: number, field: keyof InvoiceItem, value: string) => {
    setInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  const addItem = () => setInvoiceItems(prev => [...prev, { descripcion: '', cantidad: '1', precio_unitario: '0', alicuota_iva: '21' }])
  const removeItem = (idx: number) => setInvoiceItems(prev => prev.filter((_, i) => i !== idx))

  const calcItemTotal = (it: InvoiceItem) => {
    const qty  = parseFloat(it.cantidad) || 0
    const pu   = parseFloat(it.precio_unitario) || 0
    const aliq = parseFloat(it.alicuota_iva) || 0
    const neto = qty * pu
    return neto + (neto * aliq / 100)
  }

  const calcTotal = () => invoiceItems.reduce((s, it) => s + calcItemTotal(it), 0)

  const submitInvoice = async () => {
    if (!selectedConfig) { showAlert('error', 'Error', 'Seleccioná una configuración AFIP'); return }
    if (!razonSocial.trim()) { showAlert('error', 'Error', 'Completá la razón social del cliente'); return }
    if (documentoTipo === '80' && (!documentoNumero || documentoNumero.replace(/\D/g, '').length < 10)) {
      showAlert('error', 'Error', 'El CUIT ingresado no es válido (debe tener 11 dígitos)'); return
    }
    if (invoiceItems.length === 0 || invoiceItems.every(it => !it.descripcion.trim())) {
      showAlert('error', 'Error', 'Agregá al menos un ítem con descripción'); return
    }

    setSavingInvoice(true)
    try {
      const payload = {
        afip_config: selectedConfig,
        tipo_comprobante: parseInt(tipoComprobante),
        documento_tipo: parseInt(documentoTipo),
        documento_numero: documentoNumero.replace(/\D/g, ''),
        razon_social: razonSocial,
        items: invoiceItems
          .filter(it => it.descripcion.trim())
          .map(it => ({
            descripcion: it.descripcion,
            cantidad: parseFloat(it.cantidad) || 1,
            precio_unitario: parseFloat(it.precio_unitario) || 0,
            alicuota_iva: parseFloat(it.alicuota_iva) || 21,
          })),
      }

      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim()
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || ''
      const res = await fetch(`${baseUrl}/api/afip-invoices/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (res.ok) {
        if (data.estado === 'approved' || data.cae) {
          showAlert('success', '✅ Factura autorizada', `CAE: ${data.cae} — ${data.numero_completo || ''}`)
          closeInvoiceModal()
        } else {
          showAlert('warning', 'Factura creada pero pendiente', data.error_message || 'Revisá el estado en ARCA')
          closeInvoiceModal()
        }
      } else {
        const msg = typeof data === 'object'
          ? Object.values(data).flat().join(' | ')
          : 'Error al crear la factura'
        showAlert('error', 'Error', msg)
      }
    } catch {
      showAlert('error', 'Error', 'Error de conexión al crear la factura')
    } finally {
      setSavingInvoice(false)
    }
  }

  // ─── Helpers UI ──────────────────────────────────────────────────────────

  const statusColor = (s: WorkOrder['status']) => {
    if (s === 'NEW') return 'info'
    if (s === 'IN_PROGRESS' || s === 'WAITING_PARTS' || s === 'ON_HOLD') return 'warning'
    if (s === 'COMPLETED' || s === 'DELIVERED') return 'success'
    if (s === 'CANCELLED') return 'error'
    return 'info'
  }
  const statusLabel = (s: WorkOrder['status']) => {
    const map: Record<string, string> = {
      NEW: 'Nueva', DIAGNOSTIC: 'Diagnóstico', IN_PROGRESS: 'En Proceso',
      WAITING_PARTS: 'Esp. Repuestos', ON_HOLD: 'En Espera',
      COMPLETED: 'Completada', DELIVERED: 'Entregada', CANCELLED: 'Cancelada',
    }
    return map[s] || s
  }

  const fmtCurrency = (v: string | number) => {
    const n = typeof v === 'string' ? parseFloat(v) : v
    return isNaN(n) ? '—' : n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {alert.show && (
        <div className="mb-4">
          <Alert variant={alert.type} title={alert.title} message={alert.message}
            onClose={() => setAlert(prev => ({ ...prev, show: false }))} />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Servicios</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestión de órdenes de trabajo</p>
        </div>
        <Link href="/services/add">
          <Button className="w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear Servicio
          </Button>
        </Link>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar por número, cliente, patente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1200px]">
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
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mr-2"></div>
                        Cargando servicios...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      No se encontraron servicios
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="px-5 py-4 text-start">
                        <span className="font-medium text-gray-700 dark:text-white/80">{item.work_order_number}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <Badge size="sm" color={statusColor(item.status)}>{statusLabel(item.status)}</Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{item.customer_name || '—'}</span>
                          <span className="text-xs text-gray-500">{item.customer_phone || ''}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{item.vehicle_license_plate || '—'}</span>
                          <span className="text-xs text-gray-500">{[item.vehicle_brand, item.vehicle_model].filter(Boolean).join(' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                        {fmtCurrency(item.final_total)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                        {new Date(item.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-theme-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/services/${item.id}`} className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400">Ver</Link>
                          <button onClick={() => openQuotePdf(item.id)} className="px-3 py-1 text-xs text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300">Presupuesto</button>
                          {/* Facturar: disponible cuando hay ítems/total */}
                          <button
                            onClick={() => openInvoiceModal(item)}
                            className="px-3 py-1 text-xs text-emerald-700 bg-emerald-100 rounded-md hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium"
                          >
                            Facturar
                          </button>
                          {item.status === 'NEW' && (
                            <button onClick={() => callAction(item.id, 'start')} className="px-3 py-1 text-xs text-green-600 bg-green-100 rounded-md hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">Iniciar</button>
                          )}
                          {item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && (
                            <button onClick={() => callAction(item.id, 'complete')} className="px-3 py-1 text-xs text-teal-600 bg-teal-100 rounded-md hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-400">Completar</button>
                          )}
                          {item.status !== 'CANCELLED' && (
                            <button onClick={() => callAction(item.id, 'cancel')} className="px-3 py-1 text-xs text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">Cancelar</button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Paginación */}
            {items.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Mostrando <span className="font-medium">{items.length}</span> de{' '}
                  <span className="font-medium">{totalCount}</span> — Página{' '}
                  <span className="font-medium">{currentPage}</span> de{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { const p = Math.max(1, currentPage - 1); setCurrentPage(p); loadItems(p, searchTerm) }}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded disabled:bg-gray-200 disabled:text-gray-400 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed"
                  >Anterior</button>
                  <button
                    onClick={() => { const p = Math.min(totalPages, currentPage + 1); setCurrentPage(p); loadItems(p, searchTerm) }}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded disabled:bg-gray-200 disabled:text-gray-400 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed"
                  >Siguiente</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modal Facturar ─────────────────────────────────────────────────── */}
      {invoiceModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl">

            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Generar Factura ARCA/AFIP
                </h2>
                {currentWO && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    Servicio <span className="font-medium">{currentWO.work_order_number}</span>
                    {currentWO.customer_name ? ` — ${currentWO.customer_name}` : ''}
                  </p>
                )}
              </div>
              <button onClick={closeInvoiceModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            </div>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-500">Cargando datos...</span>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-5">

                {/* Aviso cliente sin CUIT */}
                {currentWO && (!currentWO.customer?.tax_id || currentWO.customer.tax_id.replace(/\D/g, '').length < 10) && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300">
                    <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <span>El cliente <strong>{currentWO.customer_name}</strong> no tiene CUIT registrado. Se genera como <strong>Factura B — Consumidor Final</strong>. Podés ingresar el CUIT manualmente si corresponde.</span>
                  </div>
                )}

                {/* Configuración AFIP */}
                <div>
                  <Label>Configuración AFIP <span className="text-red-500">*</span></Label>
                  {afipConfigs.length === 0 ? (
                    <p className="text-sm text-red-500 mt-1">No hay configuraciones AFIP activas. <Link href="/arca/config" className="underline">Configurar</Link></p>
                  ) : (
                    <select
                      value={selectedConfig}
                      onChange={e => setSelectedConfig(e.target.value)}
                      className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Seleccionar —</option>
                      {afipConfigs.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.razon_social} — Pto.Venta {c.punto_venta} {c.production_mode ? '(Producción)' : '(Homologación)'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Tipo de comprobante */}
                <div>
                  <Label>Tipo de comprobante <span className="text-red-500">*</span></Label>
                  <div className="flex gap-3 mt-1">
                    {[
                      { value: '1', label: 'Factura A', desc: 'RI → RI' },
                      { value: '6', label: 'Factura B', desc: 'RI → CF / Monotrib.' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setTipoComprobante(opt.value)
                          if (opt.value === '1') setDocumentoTipo('80')
                          else setDocumentoTipo(documentoNumero ? '80' : '99')
                        }}
                        className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                          tipoComprobante === opt.value
                            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-lg font-bold mr-1">
                          {opt.value === '1' ? 'A' : 'B'}
                        </span>
                        <span>{opt.label}</span>
                        <span className="block text-xs font-normal opacity-60">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Datos del receptor */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                  <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Datos del receptor</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tipo de documento</Label>
                      <select
                        value={documentoTipo}
                        onChange={e => setDocumentoTipo(e.target.value)}
                        className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white"
                      >
                        <option value="80">CUIT</option>
                        <option value="86">CUIL</option>
                        <option value="96">DNI</option>
                        <option value="99">Sin identificar (Consumidor Final)</option>
                      </select>
                    </div>
                    <div>
                      <Label>Número de documento</Label>
                      <Input
                        type="text"
                        value={documentoNumero}
                        onChange={e => setDocumentoNumero(e.target.value)}
                        placeholder={documentoTipo === '80' ? 'Ej: 20123456789' : documentoTipo === '99' ? 'No requerido' : 'Número'}
                        disabled={documentoTipo === '99'}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Razón Social / Nombre del cliente <span className="text-red-500">*</span></Label>
                    <Input
                      type="text"
                      value={razonSocial}
                      onChange={e => setRazonSocial(e.target.value)}
                      placeholder="Nombre o razón social"
                    />
                  </div>
                </div>

                {/* Ítems */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Ítems de la factura</h3>
                    <button
                      type="button"
                      onClick={addItem}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium"
                    >
                      + Agregar ítem
                    </button>
                  </div>

                  <div className="space-y-2">
                    {/* Cabecera */}
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 px-1">
                      <span className="col-span-5">Descripción</span>
                      <span className="col-span-2 text-right">Cantidad</span>
                      <span className="col-span-2 text-right">Precio unit.</span>
                      <span className="col-span-2">IVA</span>
                      <span className="col-span-1"></span>
                    </div>

                    {invoiceItems.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={it.descripcion}
                            onChange={e => handleItemChange(idx, 'descripcion', e.target.value)}
                            placeholder="Descripción del servicio/repuesto"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-white focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={it.cantidad}
                            onChange={e => handleItemChange(idx, 'cantidad', e.target.value)}
                            min="0.01" step="0.01"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-right dark:bg-gray-800 dark:text-white focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={it.precio_unitario}
                            onChange={e => handleItemChange(idx, 'precio_unitario', e.target.value)}
                            min="0" step="0.01"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-right dark:bg-gray-800 dark:text-white focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            value={it.alicuota_iva}
                            onChange={e => handleItemChange(idx, 'alicuota_iva', e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-white"
                          >
                            {ALICUOTAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                          </select>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          {invoiceItems.length > 1 && (
                            <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex justify-end mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-right">
                      <span className="text-sm text-gray-500 mr-3">Total estimado:</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {calcTotal().toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeInvoiceModal}
                    disabled={savingInvoice}
                    className="px-5 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={submitInvoice}
                    disabled={savingInvoice || afipConfigs.length === 0}
                    className="px-6 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {savingInvoice ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Enviando a AFIP...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Crear y autorizar factura
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ServicesPage
