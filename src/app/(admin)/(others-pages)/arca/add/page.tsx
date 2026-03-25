'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Label from '@/components/form/Label'
import Input from '@/components/form/input/InputField'
import Alert from '@/components/ui/alert/Alert'
import { fetchApi } from '@/app/lib/data'

interface AFIPConfig {
  id: string
  cuit: string
  razon_social: string
  punto_venta: number
  production_mode: boolean
  is_active: boolean
}

interface WorkOrder {
  id: string
  work_order_number: string
  customer_name: string
  customer_cuit?: string
  items: Array<{
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
  }>
}

interface InvoiceItem {
  descripcion: string
  cantidad: string
  precio_unitario: string
  alicuota_iva: string
}

const TIPO_COMPROBANTE = [
  { value: '1',  label: 'Factura A' },
  { value: '6',  label: 'Factura B' },
  { value: '3',  label: 'Nota de Crédito A' },
  { value: '8',  label: 'Nota de Crédito B' },
  { value: '2',  label: 'Nota de Débito A' },
  { value: '7',  label: 'Nota de Débito B' },
]

const ALICUOTAS = [
  { value: '0',   label: '0% (Exento)' },
  { value: '10.5', label: '10.5%' },
  { value: '21',  label: '21%' },
  { value: '27',  label: '27%' },
]

const emptyItem = (): InvoiceItem => ({
  descripcion: '', cantidad: '1', precio_unitario: '0', alicuota_iva: '21',
})

export default function AddInvoicePage() {
  const router = useRouter()
  const [configs, setConfigs] = useState<AFIPConfig[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loadingConfigs, setLoadingConfigs] = useState(true)

  const [afipConfig, setAfipConfig] = useState('')
  const [tipoComprobante, setTipoComprobante] = useState('6') // Factura B default
  const [documentoTipo, setDocumentoTipo] = useState('80')   // CUIT default
  const [documentoNumero, setDocumentoNumero] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()])
  const [selectedWO, setSelectedWO] = useState('')

  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      const [cfgRes, woRes] = await Promise.all([
        fetchApi<{ results: AFIPConfig[] }>('/api/afip-configurations/?is_active=true'),
        fetchApi<{ results: any[] }>('/api/work-orders/?status=COMPLETED&limit=200'),
      ])
      const cfgs = cfgRes?.results || []
      setConfigs(cfgs)
      if (cfgs.length === 1) setAfipConfig(cfgs[0].id)

      const wos: WorkOrder[] = (woRes?.results || []).map((wo: any) => ({
        id: wo.id,
        work_order_number: wo.work_order_number,
        customer_name: wo.customer_name || '',
        customer_cuit: wo.customer_cuit || wo.customer_tax_id || '',
        items: (wo.items || []).map((it: any) => ({
          description: it.description || '',
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          tax_rate: Number(it.tax_rate) || 21,
        })),
      }))
      setWorkOrders(wos)
      setLoadingConfigs(false)
    }
    load()
  }, [])

  const handleSelectWorkOrder = async (woId: string) => {
    setSelectedWO(woId)
    if (!woId) return
    const wo = workOrders.find(w => w.id === woId)
    if (wo) {
      setRazonSocial(wo.customer_name || razonSocial)
      if (wo.customer_cuit) {
        setDocumentoNumero(wo.customer_cuit)
        setDocumentoTipo('80')
      }
      // Fetch full WO to get items
      const data = await fetchApi<any>(`/api/work-orders/${woId}/`)
      if (data?.items?.length) {
        setItems(data.items.map((it: any) => ({
          descripcion: it.description || '',
          cantidad: String(Number(it.quantity) || 1),
          precio_unitario: String(Number(it.unit_price) || 0),
          alicuota_iva: String(Number(it.tax_rate) || 21),
        })))
      }
    }
  }

  const updateItem = (i: number, field: keyof InvoiceItem, val: string) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  const total = items.reduce((sum, it) => {
    const base = Number(it.cantidad) * Number(it.precio_unitario)
    return sum + base + base * Number(it.alicuota_iva) / 100
  }, 0)

  const handleSubmit = async () => {
    if (!afipConfig) { setAlert({ type: 'error', msg: 'Seleccioná una configuración AFIP' }); return }
    if (!razonSocial.trim()) { setAlert({ type: 'error', msg: 'Ingresá la razón social del cliente' }); return }
    if (documentoTipo !== '99' && !documentoNumero.trim()) { setAlert({ type: 'error', msg: 'Ingresá el número de documento' }); return }
    if (items.some(it => !it.descripcion.trim())) { setAlert({ type: 'error', msg: 'Todos los ítems deben tener descripción' }); return }

    setSaving(true)
    try {
      const payload = {
        afip_config: afipConfig,
        tipo_comprobante: tipoComprobante,
        documento_tipo: documentoTipo,
        documento_numero: documentoTipo === '99' ? '0' : documentoNumero.replace(/-/g, ''),
        razon_social: razonSocial.trim().toUpperCase(),
        fecha_vencimiento: fechaVencimiento || null,
        items: items.map(it => ({
          descripcion: it.descripcion,
          cantidad: Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario),
          alicuota_iva: Number(it.alicuota_iva),
        })),
      }
      const res = await fetchApi<any>('/api/afip-invoices/', { method: 'POST', body: payload })
      if (res?.id) {
        // Creada — puede haber error de autorización (ej. sin internet)
        if (res.error_message) {
          const isNet = res.error_message.toLowerCase().includes('internet') ||
                        res.error_message.toLowerCase().includes('conexión')
          if (isNet) {
            // Factura guardada en borrador, sin internet para autorizar
            setAlert({
              type: 'error',
              msg: `⚠️ Sin conexión a internet — La factura fue guardada como borrador (ID ${res.id}) pero NO pudo ser autorizada por AFIP. Conectate a internet y usá "Reintentar autorización" desde el detalle de la factura.`,
            })
          } else {
            router.push(`/arca/${res.id}`)
          }
        } else {
          router.push(`/arca/${res.id}`)
        }
      } else {
        setAlert({ type: 'error', msg: 'Error al crear la factura' })
      }
    } catch (e: any) {
      if (!window.navigator.onLine) {
        setAlert({ type: 'error', msg: '⚠️ Sin conexión a internet. Conectate a la red y volvé a intentarlo.' })
      } else {
        setAlert({ type: 'error', msg: e?.message || 'Error al guardar' })
      }
    } finally {
      setSaving(false)
    }
  }

  const activeConfig = configs.find(c => c.id === afipConfig)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/arca" className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Nueva factura AFIP</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Se crea y autoriza contra ARCA en un solo paso</p>
        </div>
      </div>

      {alert && (
        <div className="mb-4">
          <Alert variant={alert.type} title={alert.type === 'error' ? 'Error' : 'OK'} message={alert.msg} onClose={() => setAlert(null)} />
        </div>
      )}

      <div className="space-y-5">

        {/* Config AFIP */}
        <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="font-medium text-gray-900 dark:text-white mb-4">Configuración AFIP</h2>
          {loadingConfigs ? (
            <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
          ) : configs.length === 0 ? (
            <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              No hay configuraciones AFIP activas. <Link href="/arca/config" className="underline font-medium">Configurar ahora</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {configs.length > 1 && (
                <div>
                  <Label>Configuración <span className="text-red-500">*</span></Label>
                  <select
                    value={afipConfig}
                    onChange={e => setAfipConfig(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Seleccionar...</option>
                    {configs.map(c => (
                      <option key={c.id} value={c.id}>{c.razon_social} — CUIT {c.cuit} — Pto. Vta. {String(c.punto_venta).padStart(5,'0')}</option>
                    ))}
                  </select>
                </div>
              )}
              {activeConfig && (
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-4 py-2.5">
                  <span className="font-medium text-gray-800 dark:text-gray-200">{activeConfig.razon_social}</span>
                  <span>CUIT {activeConfig.cuit}</span>
                  <span>Pto. Vta. {String(activeConfig.punto_venta).padStart(5,'0')}</span>
                  {activeConfig.production_mode
                    ? <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">PRODUCCIÓN</span>
                    : <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">Homologación</span>
                  }
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tipo comprobante */}
        <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="font-medium text-gray-900 dark:text-white mb-4">Tipo de comprobante</h2>
          <div className="grid grid-cols-2 gap-2">
            {['1','6'].map(v => {
              const opt = TIPO_COMPROBANTE.find(t => t.value === v)!
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTipoComprobante(v)}
                  className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    tipoComprobante === v
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <div className="mt-3">
            <select
              value={tipoComprobante}
              onChange={e => setTipoComprobante(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {TIPO_COMPROBANTE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <p className="mt-2 text-xs text-gray-400">Factura B para consumidores finales / monotributistas · Factura A para empresas Responsables Inscriptos</p>
        </div>

        {/* Datos del cliente */}
        <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-900 dark:text-white">Datos del receptor</h2>
            {workOrders.length > 0 && (
              <select
                value={selectedWO}
                onChange={e => handleSelectWorkOrder(e.target.value)}
                className="text-xs h-8 px-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              >
                <option value="">Cargar desde servicio...</option>
                {workOrders.map(wo => (
                  <option key={wo.id} value={wo.id}>#{wo.work_order_number} — {wo.customer_name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <Label>Razón social / Nombre <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              value={razonSocial}
              onChange={e => setRazonSocial(e.target.value)}
              placeholder="GARCÍA JUAN CARLOS"
            />
            <p className="text-xs text-gray-400 mt-1">En mayúsculas tal como figura en AFIP</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de documento</Label>
              <select
                value={documentoTipo}
                onChange={e => setDocumentoTipo(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="80">CUIT</option>
                <option value="86">CUIL</option>
                <option value="96">DNI</option>
                <option value="99">Sin identificar</option>
              </select>
            </div>
            <div>
              <Label>Número de documento {documentoTipo !== '99' && <span className="text-red-500">*</span>}</Label>
              <Input
                type="text"
                value={documentoTipo === '99' ? '' : documentoNumero}
                onChange={e => setDocumentoNumero(e.target.value)}
                placeholder={documentoTipo === '80' ? '20123456789' : documentoTipo === '96' ? '12345678' : ''}
                disabled={documentoTipo === '99'}
              />
            </div>
          </div>

        </div>

        {/* Items */}
        <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-gray-900 dark:text-white">Ítems / Conceptos</h2>
            <button
              type="button"
              onClick={() => setItems(prev => [...prev, emptyItem()])}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Agregar ítem
            </button>
          </div>

          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Ítem {i + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
                <div>
                  <Input
                    type="text"
                    value={it.descripcion}
                    onChange={e => updateItem(i, 'descripcion', e.target.value)}
                    placeholder="Descripción del servicio o producto"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Cantidad</label>
                    <Input type="number" value={it.cantidad} onChange={e => updateItem(i, 'cantidad', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Precio unit. (sin IVA)</label>
                    <Input type="number" value={it.precio_unitario} onChange={e => updateItem(i, 'precio_unitario', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">IVA</label>
                    <select
                      value={it.alicuota_iva}
                      onChange={e => updateItem(i, 'alicuota_iva', e.target.value)}
                      className="w-full h-10 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {ALICUOTAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                  Subtotal: <span className="font-medium text-gray-800 dark:text-gray-200">
                    ${(Number(it.cantidad) * Number(it.precio_unitario) * (1 + Number(it.alicuota_iva) / 100)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-0.5">Total con IVA</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link href="/arca" className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
            Cancelar
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || configs.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Enviando a AFIP...' : 'Crear y autorizar factura'}
          </button>
        </div>
      </div>
    </div>
  )
}
