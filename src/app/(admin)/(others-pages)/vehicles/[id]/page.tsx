'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Label from '@/components/form/Label'
import Input from '@/components/form/input/InputField'
import Select from '@/components/form/Select'
import Button from '@/components/ui/button/Button'
import Alert from '@/components/ui/alert/Alert'
import FileInput from '@/components/form/input/FileInput'
import { fetchApi } from '@/app/lib/data'

interface Customer { id: string; name: string; phone?: string }
interface Vehicle { id: string; license_plate: string; brand: string; model: string; year?: string; vin?: string; color?: string; owner?: string | { id: string }; image?: string }

const VehicleDetailPage = () => {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [alert, setAlert] = useState<{ show: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ show: false, type: 'info', title: '', message: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [form, setForm] = useState<{ license_plate: string; brand: string; model: string; year: string; vin: string; color: string }>({ license_plate: '', brand: '', model: '', year: '', vin: '', color: '' })
  const [imageFile, setImageFile] = useState<File | null>(null)

  const imageUrl = useMemo(() => {
    const url = vehicle?.image || ''
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
    const path = url.startsWith('/') ? url : `/${url}`
    return `${base}${path}`
  }, [vehicle?.image])

  const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: `${c.name} ${c.phone ? `• ${c.phone}` : ''}` })), [customers])

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlert({ show: true, type, title, message })
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const cs = await fetchApi<{ results: Customer[] }>(`/api/customers/?limit=200`, { method: 'GET' })
        setCustomers(cs?.results || [])
        const v = await fetchApi<Vehicle>(`/api/vehicles/${id}/`, { method: 'GET' })
        if (v) {
          setVehicle(v)
          setOwnerId(String((v.owner as any)?.id || ''))
          setForm({
            license_plate: v.license_plate || '',
            brand: v.brand || '',
            model: v.model || '',
            year: v.year || '',
            vin: v.vin || '',
            color: v.color || '',
          })
        } else {
          showAlert('error', 'Error', 'Vehículo no encontrado')
        }
      } catch {
        showAlert('error', 'Error', 'No se pudo cargar el vehículo')
      } finally {
        setLoading(false)
      }
    }
    if (id) load()
  }, [id])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerId) { showAlert('error', 'Error', 'Selecciona un cliente'); return }
    setSaving(true)
    try {
      let updated: any = null
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
        updated = await fetchApi<any>(`/api/vehicles/${id}/`, { method: 'PATCH', body: fd as any, isFormData: true })
      } else {
        const payload = { ...form, owner: ownerId }
        updated = await fetchApi<any>(`/api/vehicles/${id}/`, { method: 'PATCH', body: payload })
      }
      if (updated === null) throw new Error('No se pudo guardar')
      showAlert('success', 'Éxito', 'Vehículo actualizado')
      try {
        const v2 = await fetchApi<Vehicle>(`/api/vehicles/${id}/`, { method: 'GET' })
        if (v2) setVehicle(v2)
      } catch {}
    } catch {
      showAlert('error', 'Error', 'No se pudo actualizar el vehículo')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    try {
      const resp = await fetchApi(`/api/vehicles/${id}/`, { method: 'DELETE' })
      if (resp === null) {
        router.push('/vehicles')
      } else {
        showAlert('error', 'Error', 'No se pudo eliminar el vehículo')
      }
    } catch {
      showAlert('error', 'Error', 'Error de conexión al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="p-4 text-red-500">Vehículo no encontrado</div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Link href="/vehicles" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg><span>Volver a vehículos</span></Link>
      </div>
      {alert.show && (<div className="mb-4"><Alert variant={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(prev => ({ ...prev, show: false }))} /></div>)}
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Ver / Editar Vehículo</h1>
      <form onSubmit={save} className="space-y-6">
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
            {imageUrl && (
              <div className="mt-3">
                <img src={imageUrl} alt="Imagen del vehículo" className="max-h-48 rounded border border-gray-200 dark:border-gray-800 object-cover" />
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between gap-4 pt-6 mt-6 border-t border-gray-200 dark:border-gray-800">
          <button type="button" onClick={remove} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">Eliminar</button>
          <div className="flex gap-4">
            <button type="button" onClick={() => router.push('/vehicles')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default VehicleDetailPage
