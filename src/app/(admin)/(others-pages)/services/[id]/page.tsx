'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Alert from '@/components/ui/alert/Alert'
import Label from '@/components/form/Label'
import Input from '@/components/form/input/InputField'
import Select from '@/components/form/Select'
import Button from '@/components/ui/button/Button'
import { fetchApi } from '@/app/lib/data'
import ProductSearch from '@/components/product/ProductSearch'
import CommonMultiSelect from '@/components/common/MultiSelect'
import Badge from '@/components/ui/badge/Badge'

interface Customer { id: string; name: string; phone: string }
interface Vehicle { id: string; license_plate: string; brand: string; model: string; year: string }
interface Product { id: string; name: string; retail_price: string; current_stock: number; barcode?: string }

type ItemType = 'LABOR' | 'PART'

interface WorkOrderItemForm {
  id?: string
  item_type: ItemType
  product?: string
  description: string
  quantity: string
  unit_price: string
  tax_rate: string
}

interface WorkOrderResp {
  id: string
  work_order_number: string
  status: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  customer: string | null
  customer_name: string
  customer_phone: string
  vehicle: string | null
  vehicle_license_plate: string
  vehicle_brand: string
  vehicle_model: string
  promised_date?: string
  work_description: string
  notes: string
  items: any[]
}

interface AlertState { show: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }

const EditServicePage = () => {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [alert, setAlert] = useState<AlertState>({ show: false, type: 'info', title: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [mechanics, setMechanics] = useState<any[]>([])

  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [promisedDate, setPromisedDate] = useState('')
  const [workDescription, setWorkDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<WorkOrderItemForm[]>([])
  const [selectedMechanics, setSelectedMechanics] = useState<string[]>([])
  const [workOrderNumber, setWorkOrderNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [allocations, setAllocations] = useState<Array<{ id: string; method: 'CASH'|'CARD'|'TRANSFER'|'ACCOUNT'; amount: number; created_at: string }>>([])
  const [plan, setPlan] = useState<any | null>(null)
  const [installments, setInstallments] = useState<Array<{ id: string; number: number; due_date: string; amount: number; principal_share: number; interest_share: number; paid_amount: number; status: 'PENDING'|'PARTIAL'|'PAID'|'OVERDUE' }>>([])
  const [payMap, setPayMap] = useState<Record<string, { amount: string; method: 'CASH'|'CARD'|'TRANSFER'|'ACCOUNT' }>>({})

  const showAlert = (type: AlertState['type'], title: string, message: string) => {
    setAlert({ show: true, type, title, message })
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000)
  }

  const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: `${c.name} ${c.phone ? `• ${c.phone}` : ''}` })), [customers])
  const vehicleOptions = useMemo(() => vehicles.map(v => ({ value: v.id, label: `${v.license_plate} • ${v.brand} ${v.model} ${v.year || ''}` })), [vehicles])
  const mechanicOptions = useMemo(() => mechanics.map((m: any) => ({ value: m.id, label: `${m.first_name || ''} ${m.last_name || ''}${m.phone_number ? ` • ${m.phone_number}` : ''}` })), [mechanics])

  useEffect(() => {
    const loadCommon = async () => {
      try {
        const cs = await fetchApi<{ results: Customer[] }>(`/api/customers/?limit=100`, { method: 'GET' })
        setCustomers(cs?.results || [])
        const ps = await fetchApi<{ results: any[] }>(`/api/spare-parts/?limit=200`, { method: 'GET' })
        setProducts((ps?.results || []).map(p => ({ id: p.id, name: p.name, retail_price: p.retail_price, current_stock: p.current_stock, barcode: p.barcode || undefined })))
        const us = await fetchApi<{ results: any[] }>(`/api/users/?limit=200`, { method: 'GET' })
        setMechanics((us?.results || []).filter(u => u.role === 'MECHANIC'))
      } catch {}
    }
    loadCommon()
  }, [])

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true)
        const data = await fetchApi<WorkOrderResp>(`/api/work-orders/${id}/`, { method: 'GET' })
        if (!data) return
        setWorkOrderNumber(data.work_order_number || '')
        setCustomerName(data.customer_name || '')
        setCustomerPhone(data.customer_phone || '')
        setVehiclePlate(data.vehicle_license_plate || '')
        setVehicleBrand(data.vehicle_brand || '')
        setVehicleModel(data.vehicle_model || '')
        setCustomerId(data.customer || '')
        setVehicleId(data.vehicle || '')
        setPriority(data.priority || 'MEDIUM')
        setPromisedDate(data.promised_date ? new Date(data.promised_date).toISOString().slice(0, 16) : '')
        setWorkDescription(data.work_description || '')
        setNotes(data.notes || '')
        setItems((data.items || []).map((it: any) => ({ id: it.id, item_type: it.item_type, product: it.product || '', description: it.description || '', quantity: String(it.quantity || '1'), unit_price: String(it.unit_price || '0'), tax_rate: String(it.tax_rate || '0') })))
        const assignedRaw: any = (data as any).assigned_mechanics || (data as any).mechanics || []
        const assignedIds = Array.isArray(assignedRaw) ? assignedRaw.map((m: any) => (typeof m === 'string' ? m : m?.id)).filter(Boolean) : []
        setSelectedMechanics(assignedIds)
        if (data.customer) {
          const vs = await fetchApi<{ results: Vehicle[] }>(`/api/vehicles/?owner=${data.customer}&limit=100`, { method: 'GET' })
          setVehicles(vs?.results || [])
        } else {
          const vs = await fetchApi<{ results: Vehicle[] }>(`/api/vehicles/?limit=100`, { method: 'GET' })
          setVehicles(vs?.results || [])
        }
        try {
          const allocRes = await fetchApi<{ results: any[] }>(`/api/work-order-payment-allocations/?work_order=${id}&limit=100`)
          setAllocations((allocRes?.results || []).map(a => ({ id: a.id, method: a.method, amount: Number(a.amount || 0), created_at: a.created_at })))
        } catch {}
        try {
          const plansRes = await fetchApi<{ results: any[] }>(`/api/installment-plans/?work_order=${id}&limit=10`)
          const p = (plansRes?.results || [])[0] || null
          setPlan(p)
          if (p) {
            const instRes = await fetchApi<{ results: any[] }>(`/api/installments/?plan=${p.id}&limit=400`)
            setInstallments((instRes?.results || []).map(x => ({
              id: x.id, number: x.number, due_date: x.due_date, amount: Number(x.amount || 0),
              principal_share: Number(x.principal_share || 0), interest_share: Number(x.interest_share || 0),
              paid_amount: Number(x.paid_amount || 0), status: x.status
            })))
          } else {
            setInstallments([])
          }
        } catch {}
      } catch {
        showAlert('error', 'Error', 'No se pudo cargar el servicio')
      } finally {
        setLoading(false)
      }
    }
    if (id) loadOrder()
  }, [id])

  useEffect(() => {
    const loadVehicles = async () => {
      if (!customerId) return
      const vs = await fetchApi<{ results: Vehicle[] }>(`/api/vehicles/?owner=${customerId}&limit=100`, { method: 'GET' })
      setVehicles(vs?.results || [])
    }
    loadVehicles()
  }, [customerId])

  const addLaborItem = () => setItems(prev => [...prev, { item_type: 'LABOR', description: '', quantity: '1', unit_price: '0', tax_rate: '0' }])
  const addPartItem = () => setItems(prev => [...prev, { item_type: 'PART', product: '', description: '', quantity: '1', unit_price: '0', tax_rate: '0' }])
  const updateItem = (index: number, patch: Partial<WorkOrderItemForm>) => setItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it))
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
        const payload: any = {
          customer: customerId || null,
          vehicle: vehicleId || null,
          priority,
          promised_date: promisedDate || null,
          work_description: workDescription || '',
          notes: notes || '',
          assigned_mechanics: selectedMechanics,
          items: items.map(it => ({
            id: it.id,
            item_type: it.item_type,
            product: it.item_type === 'PART' ? (it.product || null) : null,
            description: it.description,
            quantity: Number(it.quantity || '0'),
            unit_price: Number(it.unit_price || '0'),
            tax_rate: Number(it.tax_rate || '0')
          }))
        }
      const data = await fetchApi(`/api/work-orders/${id}/`, { method: 'PUT', body: payload })
      if (data) router.push('/services')
    } catch {
      showAlert('error', 'Error', 'No se pudo actualizar el servicio')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (value: string | number) => {
    const n = typeof value === 'string' ? parseFloat(value) : value
    if (Number.isNaN(n)) return '—'
    return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
  }

  const printService = () => {
    const win = window.open('', '_blank')
    if (!win) return
    const logoUrl = (process.env.NEXT_PUBLIC_WORKSHOP_LOGO_URL || '').trim()
    const shopName = (process.env.NEXT_PUBLIC_WORKSHOP_NAME || 'Nombre del Taller').trim()
    const shopAddress = (process.env.NEXT_PUBLIC_WORKSHOP_ADDRESS || '').trim()
    const shopPhone = (process.env.NEXT_PUBLIC_WORKSHOP_PHONE || '').trim()
    const shopEmail = (process.env.NEXT_PUBLIC_WORKSHOP_EMAIL || '').trim()
    const mechNames = mechanics.filter((m: any) => selectedMechanics.includes(String(m.id))).map((m: any) => `${m.first_name || ''} ${m.last_name || ''}`.trim()).filter(Boolean)
    const laborItems = items.filter(it => it.item_type === 'LABOR')
    const partItems = items.filter(it => it.item_type === 'PART')
    const sumBase = (arr: typeof items) => arr.reduce((acc, it) => acc + Number(it.quantity || '0') * Number(it.unit_price || '0'), 0)
    const sumTax = (arr: typeof items) => arr.reduce((acc, it) => { const b = Number(it.quantity || '0') * Number(it.unit_price || '0'); const t = Number(it.tax_rate || '0'); return acc + b * (t / 100) }, 0)
    const laborRows = laborItems.map(it => { const qty = Number(it.quantity || '0'); const price = Number(it.unit_price || '0'); const base = qty * price; const iva = base * (Number(it.tax_rate || '0') / 100); const tot = base + iva; return `<tr><td>${it.description || ''}</td><td>${qty}</td><td>${formatCurrency(price)}</td><td>${formatCurrency(base)}</td><td>${formatCurrency(iva)}</td><td>${formatCurrency(tot)}</td></tr>` }).join('')
    const partRows = partItems.map(it => { const qty = Number(it.quantity || '0'); const price = Number(it.unit_price || '0'); const base = qty * price; const iva = base * (Number(it.tax_rate || '0') / 100); const tot = base + iva; const prod = products.find(p => p.id === (it.product || '')); const code = prod?.barcode || '—'; const desc = it.description || prod?.name || ''; return `<tr><td>${code}</td><td>${desc}</td><td>${qty}</td><td>${formatCurrency(price)}</td><td>${formatCurrency(base)}</td><td>${formatCurrency(iva)}</td><td>${formatCurrency(tot)}</td></tr>` }).join('')
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
          <title>Servicio ${workOrderNumber}</title>
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
          <div class="title">Presupuesto / Servicio ${workOrderNumber}</div>
          <div class="grid section">
            <div><span class="label">Cliente:</span> ${customerName || '—'}</div>
            <div><span class="label">Teléfono:</span> ${customerPhone || '—'}</div>
            <div><span class="label">Vehículo:</span> ${[vehicleBrand, vehicleModel].filter(Boolean).join(' ') || '—'}</div>
            <div><span class="label">Patente:</span> ${vehiclePlate || '—'}</div>
            ${mechNames.length ? `<div class="muted">Mecánicos: ${mechNames.join(', ')}</div>` : ''}
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
          <div class="totals"><span class="label">Subtotal mano de obra:</span> ${formatCurrency(sumBase(laborItems) + sumTax(laborItems))}</div>
          <div class="section-title">Repuestos</div>
          <table>
            <thead>
              <tr><th>Código</th><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Subtotal</th><th>IVA</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${partRows || `<tr><td colspan="7" class="muted">Sin repuestos</td></tr>`}
            </tbody>
          </table>
          <div class="totals"><span class="label">Subtotal repuestos:</span> ${formatCurrency(sumBase(partItems) + sumTax(partItems))}</div>
          <div class="totals"><span class="label">Total:</span> ${formatCurrency(grandTotal)}</div>
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
  const openQuotePdf = async () => {
    try {
      const res = await fetch(`/api/work-orders/${id}/quote_pdf/`, { method: 'GET' })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch {}
  }
  const generateAfipInvoice = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const jwt_token = localStorage.getItem('token') || ''
      const response = await fetch(`${baseUrl}/api/work-logs/generate_from_work_order/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt_token ? { 'Authorization': `Bearer ${jwt_token}` } : {})
        },
        body: JSON.stringify({ work_order_id: id })
      })
      if (!response.ok) {
        showAlert('error', 'Error', 'No se pudo generar la factura AFIP'); return
      }
      const invoice = await response.json()
      const pdfRes = await fetch(`${baseUrl}/api/afip-invoices/${invoice.id}/pdf/`, {
        method: 'GET',
        headers: {
          ...(jwt_token ? { 'Authorization': `Bearer ${jwt_token}` } : {})
        }
      })
      if (pdfRes.ok) {
        const blob = await pdfRes.blob()
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
      } else {
        showAlert('warning', 'Aviso', 'Factura creada en borrador. No se pudo abrir el PDF.')
      }
    } catch {
      showAlert('error', 'Error', 'Ocurrió un error al generar la factura AFIP')
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Link href="/services" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg><span>Volver a servicios</span></Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={printService}>Imprimir</Button>
          <Button variant="outline" onClick={openQuotePdf}>PDF Presupuesto</Button>
          <Button onClick={generateAfipInvoice}>Factura AFIP (borrador)</Button>
        </div>
      </div>
      {alert.show && (<div className="mb-4"><Alert variant={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(prev => ({ ...prev, show: false }))} /></div>)}
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Editar Servicio</h1>
      {loading ? (
        <div className="text-gray-500 dark:text-gray-400">Cargando...</div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Cliente</Label>
              <Select options={customerOptions} value={customerId} onChange={setCustomerId} placeholder="Selecciona un cliente" />
            </div>
            <div>
              <Label>Vehículo</Label>
              <Select options={vehicleOptions} value={vehicleId} onChange={setVehicleId} placeholder="Selecciona un vehículo" />
            </div>
            <div>
              <Label>Mecánicos</Label>
              <CommonMultiSelect options={mechanicOptions} values={selectedMechanics} placeholder="Selecciona mecánicos" onChange={setSelectedMechanics} />
            </div>
            <div>
              <Label>Prioridad</Label>
              <select className="h-11 w-full appearance-none rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
              </select>
            </div>
            <div>
              <Label>Fecha comprometida</Label>
              <Input type="datetime-local" name="promised_date" value={promisedDate} onChange={(e) => setPromisedDate(e.target.value)} placeholder="" />
            </div>
            <div className="md:col-span-2">
              <Label>Trabajo a realizar</Label>
              <textarea value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div className="md:col-span-2">
              <Label>Notas</Label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Detalle del servicio</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={addLaborItem}>Agregar Mano de Obra</Button>
              <Button onClick={addPartItem}>Agregar Repuesto</Button>
            </div>
          </div>
          <div className="space-y-4">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 border border-gray-200 dark:border-gray-700 rounded-md p-3">
                <div className="md:col-span-2">
                  {it.item_type === 'PART' ? (
                    <ProductSearch products={products.map(p => ({ id: p.id, name: p.name, price: Number(p.retail_price || '0'), stock: p.current_stock, barcode: p.barcode }))} onSelect={(pid) => { const p = products.find(x => x.id === pid); updateItem(idx, { product: pid, description: p?.name || '', unit_price: p?.retail_price || '0' }) }} placeholder="Buscar repuesto" value={it.product || ''} />
                  ) : (
                    <div>
                      <Label>Descripción</Label>
                      <Input type="text" name={`desc-${idx}`} value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} placeholder="Descripción de mano de obra" />
                    </div>
                  )}
                </div>
                <div>
                  <Label>Cantidad</Label>
                  <Input type="number" name={`qty-${idx}`} value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} placeholder="1" />
                </div>
                <div>
                  <Label>Precio unitario</Label>
                  <Input type="number" step="0.01" name={`price-${idx}`} value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <Label>IVA %</Label>
                  <Input type="number" step="0.01" name={`tax-${idx}`} value={it.tax_rate} onChange={(e) => updateItem(idx, { tax_rate: e.target.value })} placeholder="0" />
                </div>
                <div className="flex items-end justify-end">
                  <button type="button" onClick={() => removeItem(idx)} className="px-3 py-2 text-xs text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">Eliminar</button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400">Sin ítems</div>
            )}
          </div>
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Pagos iniciales</h3>
            {allocations.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400">Sin asignaciones de pago registradas</div>
            ) : (
              <div className="space-y-2">
                {allocations.map(a => (
                  <div key={a.id} className="flex items-center justify-between border rounded-md px-3 py-2 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <Badge size="sm" color={a.method === 'ACCOUNT' ? 'warning' : 'success'}>{a.method === 'ACCOUNT' ? 'Cuenta Corriente' : a.method === 'CASH' ? 'Efectivo' : a.method === 'CARD' ? 'Tarjeta' : 'Transferencia'}</Badge>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(a.amount)}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(a.created_at).toLocaleString('es-MX')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Plan de cuotas</h3>
            {!plan ? (
              <div className="text-gray-500 dark:text-gray-400">Sin plan de cuotas</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div><Label>Total financiado</Label><div className="text-sm">{formatCurrency(Number(plan.total_amount || 0))}</div></div>
                  <div><Label>Cuotas</Label><div className="text-sm">{plan.num_installments}</div></div>
                  <div><Label>Interés %</Label><div className="text-sm">{Number(plan.interest_rate || 0)}</div></div>
                </div>
                {installments.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400">Sin cuotas</div>
                ) : (
                  <div className="space-y-2">
                    {installments.map(inst => (
                      <div key={inst.id} className="grid grid-cols-1 md:grid-cols-6 items-center gap-3 border rounded-md px-3 py-2 dark:border-gray-700">
                        <div className="text-sm">#{inst.number}</div>
                        <div className="text-sm">{new Date(inst.due_date).toLocaleDateString('es-MX')}</div>
                        <div className="text-sm">{formatCurrency(inst.amount)}</div>
                        <div className="text-sm">Pagado: {formatCurrency(inst.paid_amount)}</div>
                        <div><Badge size="sm" color={inst.status === 'PAID' ? 'success' : inst.status === 'PARTIAL' ? 'warning' : 'light'}>{inst.status === 'PAID' ? 'Pagada' : inst.status === 'PARTIAL' ? 'Parcial' : inst.status === 'OVERDUE' ? 'Vencida' : 'Pendiente'}</Badge></div>
                        <div className="flex items-center gap-2">
                          <Input type="number" step="0.01" name={`pay_amount_${inst.id}`} value={payMap[inst.id]?.amount || ''} onChange={(e) => setPayMap(prev => ({ ...prev, [inst.id]: { ...(prev[inst.id] || { amount: '', method: 'CASH' }), amount: e.target.value } }))} placeholder="Monto" />
                          <select className="h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" value={payMap[inst.id]?.method || 'CASH'} onChange={(e) => setPayMap(prev => ({ ...prev, [inst.id]: { ...(prev[inst.id] || { amount: '', method: 'CASH' }), method: e.target.value as any } }))}>
                            <option value="CASH">Efectivo</option>
                            <option value="CARD">Tarjeta</option>
                            <option value="TRANSFER">Transferencia</option>
                            <option value="ACCOUNT">Cuenta Corriente</option>
                          </select>
                          <Button variant="outline" onClick={async () => {
                            const amt = Number(payMap[inst.id]?.amount || '0')
                            const method = payMap[inst.id]?.method || 'CASH'
                            if (!amt || amt <= 0) { showAlert('warning', 'Monto inválido', 'Ingresa un monto mayor a 0'); return }
                            try {
                              const resp = await fetchApi(`/api/installments/${inst.id}/pay/`, { method: 'POST', body: { amount: amt, method } })
                              if (resp) {
                                showAlert('success', 'Pago registrado', `Se registró el pago de la cuota #${inst.number}`)
                                const instRes = await fetchApi<{ results: any[] }>(`/api/installments/?plan=${plan.id}&limit=400`)
                                setInstallments((instRes?.results || []).map(x => ({ id: x.id, number: x.number, due_date: x.due_date, amount: Number(x.amount || 0), principal_share: Number(x.principal_share || 0), interest_share: Number(x.interest_share || 0), paid_amount: Number(x.paid_amount || 0), status: x.status })))
                                setPayMap(prev => ({ ...prev, [inst.id]: { amount: '', method } }))
                              }
                            } catch {
                              showAlert('error', 'Error', 'No se pudo registrar el pago')
                            }
                          }}>Pagar</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Registrar pago adicional</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="md:col-span-2">
                <Label>Monto</Label>
                <Input type="number" step="0.01" name="extra_pay_amount" onChange={() => {}} placeholder="0.00" />
              </div>
              <div>
                <Label>Método</Label>
                <select id="extra_pay_method" className="h-11 w-full appearance-none rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="ACCOUNT">Cuenta Corriente</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={async () => {
                  const amountEl = document.querySelector<HTMLInputElement>('input[name="extra_pay_amount"]')
                  const methodEl = document.getElementById('extra_pay_method') as HTMLSelectElement | null
                  const amt = Number(amountEl?.value || '0'); const method = (methodEl?.value || 'CASH') as any
                  if (!amt || amt <= 0) { showAlert('warning', 'Monto inválido', 'Ingresa un monto mayor a 0'); return }
                  try {
                    const resp = await fetchApi('/api/payments/', { method: 'POST', body: { customer: customerId || null, work_order: id, amount: amt, method, status: 'COMPLETED', notes: 'Pago adicional' } })
                    if (resp) {
                      showAlert('success', 'Pago registrado', 'Se registró el pago adicional')
                      amountEl && (amountEl.value = '')
                    }
                  } catch {
                    showAlert('error', 'Error', 'No se pudo registrar el pago')
                  }
                }}>Registrar</Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-200 dark:border-gray-800">
            <button type="button" onClick={() => router.push('/services')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </form>
      )}
    </div>
  )
}

export default EditServicePage
