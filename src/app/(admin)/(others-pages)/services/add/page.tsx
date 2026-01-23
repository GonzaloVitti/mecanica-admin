'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Alert from '@/components/ui/alert/Alert'
import Label from '@/components/form/Label'
import Input from '@/components/form/input/InputField'
import FileInput from '@/components/form/input/FileInput'
import Select from '@/components/form/Select'
import CommonMultiSelect from '@/components/common/MultiSelect'
import Button from '@/components/ui/button/Button'
import { fetchApi } from '@/app/lib/data'
import ProductSearch from '@/components/product/ProductSearch'

interface Customer { id: string; name: string; phone: string }
interface Vehicle { id: string; license_plate: string; brand: string; model: string; year: string }
interface Product { id: string; name: string; retail_price: string; current_stock: number; barcode?: string; image?: string }

type ItemType = 'LABOR' | 'PART'

interface WorkOrderItemForm {
  item_type: ItemType
  product?: string
  description: string
  quantity: string
  unit_price: string
  tax_rate: string
}

interface AlertState { show: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }

const AddServicePage = () => {
  const router = useRouter()
  const [alert, setAlert] = useState<AlertState>({ show: false, type: 'info', title: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [mechanics, setMechanics] = useState<any[]>([])

  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [promisedDate, setPromisedDate] = useState<string>(() => {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 16)
  })
  const [workDescription, setWorkDescription] = useState('')
  const [items, setItems] = useState<WorkOrderItemForm[]>([])
  const [selectedMechanics, setSelectedMechanics] = useState<string[]>([])

  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState<{ name: string; phone: string; email: string; address: string; tax_id: string}>({ name: '', phone: '', email: '', address: '', tax_id: '' })
  const [newCustomerImage, setNewCustomerImage] = useState<File | null>(null)
  const [isCreatingVehicle, setIsCreatingVehicle] = useState(false)
  const [newVehicle, setNewVehicle] = useState<{ license_plate: string; brand: string; model: string; year: string; vin: string; color: string }>({ license_plate: '', brand: '', model: '', year: '', vin: '', color: '' })
  const [newVehicleImage, setNewVehicleImage] = useState<File | null>(null)

  const showAlert = (type: AlertState['type'], title: string, message: string) => {
    setAlert({ show: true, type, title, message })
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000)
  }

  const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: `${c.name} ${c.phone ? `• ${c.phone}` : ''}` })), [customers])
  const vehicleOptions = useMemo(() => vehicles.map(v => ({ value: v.id, label: `${v.license_plate} • ${v.brand} ${v.model} ${v.year || ''}` })), [vehicles])
  const mechanicOptions = useMemo(() => mechanics.map((m: any) => ({ value: m.id, label: `${m.first_name || ''} ${m.last_name || ''}${m.phone_number ? ` • ${m.phone_number}` : ''}` })), [mechanics])

  useEffect(() => {
    const loadData = async () => {
      try {
        const cs = await fetchApi<{ results: Customer[] }>(`/api/customers/?limit=50`, { method: 'GET' })
        const vs = await fetchApi<{ results: Vehicle[] }>(`/api/vehicles/?limit=50`, { method: 'GET' })
        const ps = await fetchApi<{ results: any[] }>(`/api/spare-parts/?limit=100`, { method: 'GET' })
        const us = await fetchApi<{ results: any[] }>(`/api/users/?limit=100`, { method: 'GET' })
        setCustomers(cs?.results || [])
        setVehicles(vs?.results || [])
        setProducts((ps?.results || []).map(p => ({ id: p.id, name: p.name, retail_price: p.retail_price, current_stock: p.current_stock, barcode: p.barcode || undefined, image: p.image || undefined })))
        setMechanics((us?.results || []).filter(u => u.role === 'MECHANIC'))
      } catch {
        showAlert('error', 'Error', 'No se pudieron cargar datos')
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    const loadVehicles = async () => {
      if (!customerId) return
      const vs = await fetchApi<{ results: Vehicle[] }>(`/api/vehicles/?owner=${customerId}&limit=100`, { method: 'GET' })
      setVehicles(vs?.results || [])
    }
    loadVehicles()
  }, [customerId])

  const addLaborItem = () => {
    setItems(prev => [...prev, { item_type: 'LABOR', description: '', quantity: '1', unit_price: '0', tax_rate: '0' }])
  }
  const addPartItem = () => {
    setItems(prev => [...prev, { item_type: 'PART', product: '', description: '', quantity: '1', unit_price: '0', tax_rate: '21' }])
  }
  const updateItem = (index: number, patch: Partial<WorkOrderItemForm>) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it))
  }
  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Crear cliente si se seleccionó crear uno nuevo
    try {
      if (isCreatingCustomer && !customerId) {
        let created: any = null
        if (newCustomerImage) {
          const form = new FormData()
          form.append('name', newCustomer.name)
          form.append('phone', newCustomer.phone)
          form.append('email', newCustomer.email)
          form.append('address', newCustomer.address)
          form.append('tax_id', newCustomer.tax_id)
          form.append('image', newCustomerImage)
          created = await fetchApi('/api/customers/', { method: 'POST', body: form as any, isFormData: true })
        } else {
          created = await fetchApi('/api/customers/', { method: 'POST', body: newCustomer })
        }
        if (!created || !created.id) throw new Error('No se pudo crear el cliente')
        setCustomers(prev => [{ id: created.id, name: created.name, phone: created.phone }, ...prev])
        setCustomerId(created.id)
      }
    } catch {
      showAlert('error', 'Error', 'No se pudo crear el cliente'); return
    }

    // Crear vehículo si se seleccionó crear uno nuevo
    try {
      if (isCreatingVehicle && !vehicleId) {
        if (!customerId) { showAlert('error', 'Error', 'Primero selecciona o crea un cliente'); return }
        let createdV: any = null
        if (newVehicleImage) {
          const formV = new FormData()
          formV.append('license_plate', newVehicle.license_plate)
          formV.append('brand', newVehicle.brand)
          formV.append('model', newVehicle.model)
          formV.append('year', newVehicle.year)
          formV.append('vin', newVehicle.vin)
          formV.append('color', newVehicle.color)
          formV.append('owner', customerId)
          formV.append('image', newVehicleImage)
          createdV = await fetchApi('/api/vehicles/', { method: 'POST', body: formV as any, isFormData: true })
        } else {
          const payloadVehicle: any = { ...newVehicle }
          payloadVehicle.owner = customerId
          createdV = await fetchApi('/api/vehicles/', { method: 'POST', body: payloadVehicle })
        }
        if (!createdV || !createdV.id) throw new Error('No se pudo crear el vehículo')
        setVehicles(prev => [{ id: createdV.id, license_plate: createdV.license_plate, brand: createdV.brand, model: createdV.model, year: createdV.year }, ...prev])
        setVehicleId(createdV.id)
      }
    } catch {
      showAlert('error', 'Error', 'No se pudo crear el vehículo'); return
    }

    if (!customerId) { showAlert('error', 'Error', 'Selecciona o crea un cliente'); return }
    setIsSubmitting(true)
      try {
        const payload: any = {
          customer: customerId || null,
          vehicle: vehicleId || null,
          priority,
          promised_date: promisedDate || null,
          work_description: workDescription || '',
          notes: workDescription || '',
          assigned_mechanics: selectedMechanics,
          items: items.map(it => ({
            item_type: it.item_type,
            product: it.item_type === 'PART' ? (it.product || null) : null,
            description: it.description,
            quantity: Number(it.quantity || '0'),
            unit_price: Number(it.unit_price || '0'),
            tax_rate: Number(it.tax_rate || '0')
          }))
        }
      const data = await fetchApi('/api/work-orders/', { method: 'POST', body: payload })
      if (data) router.push('/services')
    } catch {
      showAlert('error', 'Error', 'No se pudo crear el servicio')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Link href="/services" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg><span>Volver a servicios</span></Link>
      </div>
      {alert.show && (<div className="mb-4"><Alert variant={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(prev => ({ ...prev, show: false }))} /></div>)}
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Crear Servicio</h1>
      <form onSubmit={submit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Cliente</Label>
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={() => setIsCreatingCustomer(s => !s)} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">{isCreatingCustomer ? 'Usar existente' : 'Crear nuevo'}</button>
            </div>
            {!isCreatingCustomer ? (
              <Select options={customerOptions} value={customerId} onChange={setCustomerId} placeholder="Selecciona un cliente" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-gray-200 dark:border-gray-700 rounded-md p-3">
                <div>
                  <Label>Nombre</Label>
                  <Input type="text" name="cust_name" value={newCustomer.name} onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))} placeholder="Nombre y apellido" />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input type="tel" name="cust_phone" value={newCustomer.phone} onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))} placeholder="" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" name="cust_email" value={newCustomer.email} onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))} placeholder="" />
                </div>
                <div>
                  <Label>CUIT</Label>
                  <Input type="text" name="cust_cuit" value={newCustomer.tax_id} onChange={(e) => setNewCustomer(prev => ({ ...prev, tax_id: e.target.value }))} placeholder="" />
                </div>
                <div className="md:col-span-2">
                  <Label>Dirección</Label>
                  <Input type="text" name="cust_addr" value={newCustomer.address} onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))} placeholder="" />
                </div>
                <div className="md:col-span-2">
                  <Label>Imagen del cliente (opcional)</Label>
                  <FileInput accept="image/*" onChange={(e) => setNewCustomerImage(e.target.files?.[0] || null)} />
                </div>
              </div>
            )}
          </div>
        <div>
          <Label>Vehículo</Label>
          <div className="flex items-center gap-2 mb-2">
            <button type="button" onClick={() => setIsCreatingVehicle(s => !s)} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">{isCreatingVehicle ? 'Usar existente' : 'Crear nuevo'}</button>
          </div>
          {!isCreatingVehicle ? (
            <Select options={vehicleOptions} value={vehicleId} onChange={setVehicleId} placeholder="Selecciona un vehículo" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-gray-200 dark:border-gray-700 rounded-md p-3">
                <div>
                  <Label>Patente</Label>
                  <Input type="text" name="veh_plate" value={newVehicle.license_plate} onChange={(e) => setNewVehicle(prev => ({ ...prev, license_plate: e.target.value }))} placeholder="AB123CD" />
                </div>
                <div>
                  <Label>Marca</Label>
                  <Input type="text" name="veh_brand" value={newVehicle.brand} onChange={(e) => setNewVehicle(prev => ({ ...prev, brand: e.target.value }))} placeholder="" />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input type="text" name="veh_model" value={newVehicle.model} onChange={(e) => setNewVehicle(prev => ({ ...prev, model: e.target.value }))} placeholder="" />
                </div>
                <div>
                  <Label>Año</Label>
                  <Input type="text" name="veh_year" value={newVehicle.year} onChange={(e) => setNewVehicle(prev => ({ ...prev, year: e.target.value }))} placeholder="" />
                </div>
                <div>
                  <Label>VIN</Label>
                  <Input type="text" name="veh_vin" value={newVehicle.vin} onChange={(e) => setNewVehicle(prev => ({ ...prev, vin: e.target.value }))} placeholder="" />
                </div>
                <div>
                  <Label>Color</Label>
                  <Input type="text" name="veh_color" value={newVehicle.color} onChange={(e) => setNewVehicle(prev => ({ ...prev, color: e.target.value }))} placeholder="" />
                </div>
                <div className="md:col-span-2">
                  <Label>Imagen del vehículo (opcional)</Label>
                  <FileInput accept="image/*" onChange={(e) => setNewVehicleImage(e.target.files?.[0] || null)} />
                </div>
            </div>
          )}
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
            <Label>Fecha de entrega</Label>
            <Input type="datetime-local" name="promised_date" value={promisedDate} onChange={(e) => setPromisedDate(e.target.value)} placeholder="" />
          </div>
          <div className="md:col-span-2">
            <Label>Notas / Trabajo a realizar</Label>
            <textarea value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} rows={5} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
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
            <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 border border-gray-200 dark:border-gray-700 rounded-md p-3">
              <div className="md:col-span-2">
                {it.item_type === 'PART' ? (
                  <ProductSearch products={products.map(p => ({ id: p.id, name: p.name, price: Number(p.retail_price || '0'), stock: p.current_stock, barcode: p.barcode, image: p.image }))} onSelect={(pid) => { const p = products.find(x => x.id === pid); updateItem(idx, { product: pid, description: p?.name || '', unit_price: p?.retail_price || '0' }) }} placeholder="Buscar repuesto" value={it.product || ''} />
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
              <div className="flex items-end justify-end">
                <button type="button" onClick={() => removeItem(idx)} className="px-3 py-2 text-xs text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">Eliminar</button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">Sin ítems</div>
          )}
        </div>
        <div className="flex justify-end">
          <div className="mt-4 w-full md:w-1/2 lg:w-1/3 border border-gray-200 dark:border-gray-800 rounded-md p-4">
            <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Subtotal</span>
              <span>{(() => { const n = items.reduce((acc, it) => acc + Number(it.quantity || '0') * Number(it.unit_price || '0'), 0); return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }); })()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>IVA</span>
              <span>{(() => { const n = items.reduce((acc, it) => { const base = Number(it.quantity || '0') * Number(it.unit_price || '0'); const tax = Number(it.tax_rate || '0'); return acc + base * (tax / 100); }, 0); return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }); })()}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 dark:text-white mt-2">
              <span>Total</span>
              <span>{(() => { const base = items.reduce((acc, it) => acc + Number(it.quantity || '0') * Number(it.unit_price || '0'), 0); const iva = items.reduce((acc, it) => { const b = Number(it.quantity || '0') * Number(it.unit_price || '0'); const t = Number(it.tax_rate || '0'); return acc + b * (t / 100); }, 0); const tot = base + iva; return tot.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }); })()}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-200 dark:border-gray-800">
          <button type="button" onClick={() => router.push('/services')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Creando...' : 'Crear Servicio'}</button>
        </div>
      </form>
    </div>
  )
}

export default AddServicePage
