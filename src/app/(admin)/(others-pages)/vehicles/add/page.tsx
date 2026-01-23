'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Label from '@/components/form/Label'
import Input from '@/components/form/input/InputField'
import Select from '@/components/form/Select'
import Button from '@/components/ui/button/Button'
import Alert from '@/components/ui/alert/Alert'
import FileInput from '@/components/form/input/FileInput'
import { fetchApi } from '@/app/lib/data'

interface Customer { id: string; name: string; phone?: string }

const AddVehiclePage = () => {
  const router = useRouter()
  const [alert, setAlert] = useState<{ show: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ show: false, type: 'info', title: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])

  const [ownerId, setOwnerId] = useState('')
  const [form, setForm] = useState<{ license_plate: string; brand: string; model: string; year: string; vin: string; color: string }>({ license_plate: '', brand: '', model: '', year: '', vin: '', color: '' })
  const [imageFile, setImageFile] = useState<File | null>(null)

  const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: `${c.name} ${c.phone ? `• ${c.phone}` : ''}` })), [customers])

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlert({ show: true, type, title, message })
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000)
  }

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const cs = await fetchApi<{ results: Customer[] }>(`/api/customers/?limit=100`, { method: 'GET' })
        setCustomers(cs?.results || [])
      } catch {
        showAlert('error', 'Error', 'No se pudieron cargar clientes')
      }
    }
    loadCustomers()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerId) { showAlert('error', 'Error', 'Selecciona un cliente'); return }
    setIsSubmitting(true)
    try {
      let created: any = null
      if (imageFile) {
        const fd = new FormData()
        fd.append('license_plate', form.license_plate)
        fd.append('brand', form.brand)
        fd.append('model', form.model)
        fd.append('year', form.year)
        fd.append('vin', form.vin)
        fd.append('color', form.color)
        fd.append('owner', ownerId)
        fd.append('image', imageFile)
        created = await fetchApi<any>('/api/vehicles/', { method: 'POST', body: fd as any, isFormData: true })
      } else {
        const payload = { ...form, owner: ownerId }
        created = await fetchApi<any>('/api/vehicles/', { method: 'POST', body: payload })
      }
      if (created === null) throw new Error('No se pudo crear el vehículo')
      router.push('/vehicles')
    } catch {
      showAlert('error', 'Error', 'No se pudo crear el vehículo')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Link href="/vehicles" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg><span>Volver a vehículos</span></Link>
      </div>
      {alert.show && (<div className="mb-4"><Alert variant={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(prev => ({ ...prev, show: false }))} /></div>)}
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Agregar Vehículo</h1>
      <form onSubmit={submit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Cliente</Label>
            <Select options={customerOptions} value={ownerId} onChange={setOwnerId} placeholder="Selecciona un cliente" />
          </div>
          <div>
            <Label>Patente</Label>
            <Input type="text" name="plate" value={form.license_plate} onChange={(e) => setForm(prev => ({ ...prev, license_plate: e.target.value }))} placeholder="AB123CD" />
          </div>
          <div>
            <Label>Marca</Label>
            <Input type="text" name="brand" value={form.brand} onChange={(e) => setForm(prev => ({ ...prev, brand: e.target.value }))} placeholder="" />
          </div>
          <div>
            <Label>Modelo</Label>
            <Input type="text" name="model" value={form.model} onChange={(e) => setForm(prev => ({ ...prev, model: e.target.value }))} placeholder="" />
          </div>
          <div>
            <Label>Año</Label>
            <Input type="text" name="year" value={form.year} onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))} placeholder="" />
          </div>
          <div>
            <Label>VIN</Label>
            <Input type="text" name="vin" value={form.vin} onChange={(e) => setForm(prev => ({ ...prev, vin: e.target.value }))} placeholder="" />
          </div>
          <div>
            <Label>Color</Label>
            <Input type="text" name="color" value={form.color} onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))} placeholder="" />
          </div>
          <div className="md:col-span-2">
            <Label>Imagen del vehículo (opcional)</Label>
            <FileInput accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          </div>
        </div>
        <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-200 dark:border-gray-800">
          <button type="button" onClick={() => router.push('/vehicles')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Creando...' : 'Crear Vehículo'}</button>
        </div>
      </form>
    </div>
  )
}

export default AddVehiclePage
