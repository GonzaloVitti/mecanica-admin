'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Alert from '@/components/ui/alert/Alert'
import Label from '@/components/form/Label'
import Input from '@/components/form/input/InputField'
import { fetchApi } from '@/app/lib/data'

interface AFIPConfig {
  id: string
  cuit: string
  razon_social: string
  domicilio: string
  condicion_iva: string
  ingresos_brutos: string
  fecha_inicio_actividades: string | null
  punto_venta: number
  production_mode: boolean
  is_active: boolean
  certificate_path: string
  private_key_path: string
  created_at: string
  updated_at: string
}

type AlertState = { show: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }

const emptyForm = {
  cuit: '',
  razon_social: '',
  domicilio: '',
  condicion_iva: 'Responsable Inscripto',
  ingresos_brutos: '',
  fecha_inicio_actividades: '',
  punto_venta: '1',
  production_mode: false,
  is_active: true,
  certificate_path: '',
  private_key_path: '',
}

export default function AfipConfigPage() {
  const [configs, setConfigs] = useState<AFIPConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState<AlertState>({ show: false, type: 'info', title: '', message: '' })

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const showAlert = (type: AlertState['type'], title: string, message: string) => {
    setAlert({ show: true, type, title, message })
    setTimeout(() => setAlert(p => ({ ...p, show: false })), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchApi<{ results: AFIPConfig[] }>('/api/afip-configurations/')
      setConfigs(res?.results || [])
    } catch {
      showAlert('error', 'Error', 'No se pudieron cargar las configuraciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (c: AFIPConfig) => {
    setEditingId(c.id)
    setForm({
      cuit: c.cuit,
      razon_social: c.razon_social,
      domicilio: c.domicilio || '',
      condicion_iva: c.condicion_iva || 'Responsable Inscripto',
      ingresos_brutos: c.ingresos_brutos || '',
      fecha_inicio_actividades: c.fecha_inicio_actividades || '',
      punto_venta: String(c.punto_venta),
      production_mode: c.production_mode,
      is_active: c.is_active,
      certificate_path: c.certificate_path || '',
      private_key_path: c.private_key_path || '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.cuit.trim()) errs.cuit = 'CUIT requerido'
    else if (!/^\d{10,11}$/.test(form.cuit.replace(/-/g, ''))) errs.cuit = 'CUIT debe tener 11 dígitos sin guiones'
    if (!form.razon_social.trim()) errs.razon_social = 'Razón social requerida'
    if (!form.punto_venta || Number(form.punto_venta) < 1) errs.punto_venta = 'Punto de venta inválido'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        cuit: form.cuit.replace(/-/g, ''),
        razon_social: form.razon_social,
        domicilio: form.domicilio,
        condicion_iva: form.condicion_iva,
        ingresos_brutos: form.ingresos_brutos,
        fecha_inicio_actividades: form.fecha_inicio_actividades || null,
        punto_venta: Number(form.punto_venta),
        production_mode: form.production_mode,
        is_active: form.is_active,
        certificate_path: form.certificate_path,
        private_key_path: form.private_key_path,
      }
      if (editingId) {
        await fetchApi(`/api/afip-configurations/${editingId}/`, { method: 'PATCH', body: payload })
        showAlert('success', 'Guardado', 'Configuración actualizada correctamente')
      } else {
        await fetchApi('/api/afip-configurations/', { method: 'POST', body: payload })
        showAlert('success', 'Creada', 'Configuración AFIP creada correctamente')
      }
      setModalOpen(false)
      load()
    } catch (e: any) {
      showAlert('error', 'Error', e?.message || 'No se pudo guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await fetchApi(`/api/afip-configurations/${deleteId}/`, { method: 'DELETE' })
      showAlert('success', 'Eliminada', 'Configuración eliminada')
      setDeleteId(null)
      load()
    } catch {
      showAlert('error', 'Error', 'No se pudo eliminar la configuración')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/arca" className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Configuración AFIP / ARCA</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">CUIT emisor, punto de venta y certificados digitales</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva configuración
        </button>
      </div>

      {alert.show && (
        <div className="mb-4">
          <Alert variant={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(p => ({ ...p, show: false }))} />
        </div>
      )}

      {/* Info banner */}
      <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
        <p className="font-medium mb-1">Importante — Certificados digitales</p>
        <p>Los campos <strong>Certificate Path</strong> y <strong>Private Key Path</strong> deben ser rutas absolutas en el servidor donde está alojado el backend Django. Ejemplo: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">/app/certs/cert.crt</code> y <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">/app/certs/private.key</code>.</p>
        <p className="mt-1">El CUIT del emisor debe ingresarse <strong>sin guiones</strong> (11 dígitos).</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : configs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <svg className="mx-auto w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <p className="text-gray-500 dark:text-gray-400 mb-4">No hay configuraciones AFIP creadas</p>
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Crear primera configuración</button>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map(c => (
            <div key={c.id} className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-gray-900 dark:text-white text-base">{c.razon_social}</h2>
                    {c.is_active ? (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">Activa</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">Inactiva</span>
                    )}
                    {c.production_mode ? (
                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">PRODUCCIÓN</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">Homologación (testing)</span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">CUIT emisor</span>
                      <p className="font-mono text-gray-800 dark:text-gray-200">{c.cuit}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">Punto de venta</span>
                      <p className="font-mono text-gray-800 dark:text-gray-200">{String(c.punto_venta).padStart(5, '0')}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">Certificado</span>
                      <p className="text-gray-600 dark:text-gray-400 truncate" title={c.certificate_path}>{c.certificate_path || <span className="text-gray-400 italic">No configurado</span>}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">Clave privada</span>
                      <p className="text-gray-600 dark:text-gray-400 truncate" title={c.private_key_path}>{c.private_key_path || <span className="text-gray-400 italic">No configurado</span>}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(c)} className="px-3 py-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40">
                    Editar
                  </button>
                  <button onClick={() => setDeleteId(c.id)} className="px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40">
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingId ? 'Editar configuración AFIP' : 'Nueva configuración AFIP'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CUIT del emisor <span className="text-red-500">*</span></Label>
                  <Input
                    type="text"
                    name="cuit"
                    value={form.cuit}
                    onChange={e => setForm(p => ({ ...p, cuit: e.target.value }))}
                    placeholder="20123456789"
                    error={!!formErrors.cuit}
                  />
                  {formErrors.cuit && <p className="text-xs text-red-500 mt-1">{formErrors.cuit}</p>}
                  <p className="text-xs text-gray-400 mt-1">11 dígitos sin guiones</p>
                </div>
                <div>
                  <Label>Punto de venta <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    name="punto_venta"
                    value={form.punto_venta}
                    onChange={e => setForm(p => ({ ...p, punto_venta: e.target.value }))}
                    placeholder="1"
                    error={!!formErrors.punto_venta}
                  />
                  {formErrors.punto_venta && <p className="text-xs text-red-500 mt-1">{formErrors.punto_venta}</p>}
                </div>
              </div>

              <div>
                <Label>Razón social del emisor <span className="text-red-500">*</span></Label>
                <Input
                  type="text"
                  name="razon_social"
                  value={form.razon_social}
                  onChange={e => setForm(p => ({ ...p, razon_social: e.target.value }))}
                  placeholder="Ej: SÁNCHEZ JUAN CARLOS"
                  error={!!formErrors.razon_social}
                />
                {formErrors.razon_social && <p className="text-xs text-red-500 mt-1">{formErrors.razon_social}</p>}
              </div>

              <div>
                <Label>Domicilio comercial</Label>
                <Input
                  type="text"
                  name="domicilio"
                  value={form.domicilio}
                  onChange={e => setForm(p => ({ ...p, domicilio: e.target.value }))}
                  placeholder="Ej: AV. CORRIENTES 1234, CABA"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Condición frente al IVA</Label>
                  <Input
                    type="text"
                    name="condicion_iva"
                    value={form.condicion_iva}
                    onChange={e => setForm(p => ({ ...p, condicion_iva: e.target.value }))}
                    placeholder="Responsable Inscripto"
                  />
                </div>
                <div>
                  <Label>Nro. Ingresos Brutos</Label>
                  <Input
                    type="text"
                    name="ingresos_brutos"
                    value={form.ingresos_brutos}
                    onChange={e => setForm(p => ({ ...p, ingresos_brutos: e.target.value }))}
                    placeholder="Ej: 20123456789"
                  />
                </div>
              </div>

              <div>
                <Label>Fecha de inicio de actividades</Label>
                <Input
                  type="date"
                  name="fecha_inicio_actividades"
                  value={form.fecha_inicio_actividades}
                  onChange={e => setForm(p => ({ ...p, fecha_inicio_actividades: e.target.value }))}
                />
              </div>

              <div>
                <Label>Ruta del certificado (.crt)</Label>
                <Input
                  type="text"
                  name="certificate_path"
                  value={form.certificate_path}
                  onChange={e => setForm(p => ({ ...p, certificate_path: e.target.value }))}
                  placeholder="/app/certs/cert.crt"
                />
                <p className="text-xs text-gray-400 mt-1">Ruta absoluta en el servidor donde está el archivo .crt de AFIP</p>
              </div>

              <div>
                <Label>Ruta de la clave privada (.key)</Label>
                <Input
                  type="text"
                  name="private_key_path"
                  value={form.private_key_path}
                  onChange={e => setForm(p => ({ ...p, private_key_path: e.target.value }))}
                  placeholder="/app/certs/private.key"
                />
                <p className="text-xs text-gray-400 mt-1">Ruta absoluta en el servidor donde está la clave privada</p>
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.production_mode}
                    onChange={e => setForm(p => ({ ...p, production_mode: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Modo producción
                    <span className="ml-1 text-xs text-red-500">(usar solo cuando los certificados son de producción)</span>
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Configuración activa</span>
                </label>
              </div>

            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Guardando...' : (editingId ? 'Guardar cambios' : 'Crear configuración')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Eliminar configuración</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">¿Estás seguro? Esta acción no se puede deshacer. Las facturas existentes que la referencian quedarán sin config activa.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
