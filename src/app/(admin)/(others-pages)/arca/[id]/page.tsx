'use client'
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Alert from '@/components/ui/alert/Alert'
import { fetchApi } from '@/app/lib/data'

interface InvoiceItem {
  id: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  alicuota_iva: number
  importe_neto: number
  importe_iva: number
  importe_total: number
}

interface Invoice {
  id: string
  afip_config: string
  tipo_comprobante: string
  tipo_comprobante_display: string
  punto_venta: number
  numero_comprobante: number | null
  numero_completo: string | null
  fecha_comprobante: string
  fecha_vencimiento: string | null
  documento_tipo: string
  documento_numero: string
  razon_social: string
  importe_total: string
  importe_neto: string
  importe_iva: string
  estado: string
  estado_display: string
  cae: string | null
  fecha_vencimiento_cae: string | null
  error_message: string | null
  items: InvoiceItem[]
  created_at: string
}

const ESTADO_COLORS: Record<string, string> = {
  draft:      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  pending:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled:  'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}

const fmt = (n: string | number) =>
  Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [authorizing, setAuthorizing] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; title: string; msg: string } | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetchApi<Invoice>(`/api/afip-invoices/${id}/`)
    setInvoice(res)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleAuthorize = async () => {
    if (!confirm('¿Autorizar esta factura contra AFIP/ARCA? Esta acción no se puede deshacer.')) return
    setAuthorizing(true)
    try {
      const res = await fetchApi<any>(`/api/afip-invoices/${id}/authorize/`, { method: 'POST' })
      if (res?.cae || res?.estado === 'approved') {
        setAlert({ type: 'success', title: 'Factura autorizada', msg: `CAE: ${res.cae} — Vence: ${res.fecha_vencimiento_cae}` })
        load()
      } else {
        setAlert({ type: 'error', title: 'Rechazo AFIP', msg: res?.error_message || res?.detail || 'AFIP rechazó la factura' })
        load()
      }
    } catch (e: any) {
      setAlert({ type: 'error', title: 'Error', msg: e?.message || 'No se pudo conectar con AFIP' })
    } finally {
      setAuthorizing(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('token') || ''
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
      const url = `${baseUrl}/api/afip-invoices/${id}/pdf/`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`Error ${res.status}: ${txt.slice(0, 120)}`)
      }
      const buf  = await res.arrayBuffer()
      const blob = new Blob([buf], { type: 'application/pdf' })
      const blobUrl = URL.createObjectURL(blob)
      // Obtener el filename del header Content-Disposition si viene
      const cd    = res.headers.get('Content-Disposition') || ''
      const match = cd.match(/filename="?([^";]+)"?/)
      const fname = match ? match[1] : `factura_${id}.pdf`
      const a = document.createElement('a')
      a.href     = blobUrl
      a.target   = '_blank'
      a.download = fname
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000)
    } catch (e: any) {
      setAlert({ type: 'error', title: 'Error al descargar PDF', msg: e.message })
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-[40vh]">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!invoice) return (
    <div className="p-6 text-center text-gray-500">No se encontró la factura</div>
  )

  const isDraft = invoice.estado === 'draft'
  const isApproved = invoice.estado === 'approved'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/arca" className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {invoice.numero_completo || `Borrador — ${invoice.tipo_comprobante_display}`}
              </h1>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${ESTADO_COLORS[invoice.estado] || ''}`}>
                {invoice.estado_display || invoice.estado}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {invoice.tipo_comprobante_display} · Creada {new Date(invoice.created_at).toLocaleDateString('es-AR')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isApproved && (
            <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              PDF
            </button>
          )}
          {(isDraft || invoice.estado === 'rejected') && (
            <button
              onClick={handleAuthorize}
              disabled={authorizing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {authorizing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {authorizing ? 'Enviando a AFIP...' : 'Reintentar autorización'}
            </button>
          )}
        </div>
      </div>

      {alert && (
        <div className="mb-4">
          <Alert variant={alert.type} title={alert.title} message={alert.msg} onClose={() => setAlert(null)} />
        </div>
      )}

      {/* CAE info */}
      {isApproved && invoice.cae && (
        <div className="mb-5 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">Factura autorizada por AFIP</p>
          <div className="grid grid-cols-2 gap-3 text-sm text-green-700 dark:text-green-400">
            <div>
              <span className="text-xs text-green-500">CAE</span>
              <p className="font-mono font-medium">{invoice.cae}</p>
            </div>
            <div>
              <span className="text-xs text-green-500">Vencimiento CAE</span>
              <p className="font-medium">{invoice.fecha_vencimiento_cae}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {invoice.error_message && (
        <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          <p className="font-medium mb-1">Mensaje de AFIP</p>
          <p>{invoice.error_message}</p>
        </div>
      )}

      {/* Datos principales */}
      <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
        <h2 className="font-medium text-gray-900 dark:text-white mb-4">Datos del comprobante</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-gray-400">Receptor</span>
            <p className="font-medium text-gray-800 dark:text-gray-200">{invoice.razon_social}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Documento</span>
            <p className="font-mono text-gray-800 dark:text-gray-200">
              {invoice.documento_tipo === '80' ? 'CUIT' : invoice.documento_tipo === '96' ? 'DNI' : 'Doc.'} {invoice.documento_numero}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Fecha</span>
            <p className="text-gray-800 dark:text-gray-200">{invoice.fecha_comprobante}</p>
          </div>
          {invoice.fecha_vencimiento && (
            <div>
              <span className="text-xs text-gray-400">Vencimiento pago</span>
              <p className="text-gray-800 dark:text-gray-200">{invoice.fecha_vencimiento}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
        <h2 className="font-medium text-gray-900 dark:text-white mb-4">Ítems</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                <th className="pb-2 text-xs text-gray-400 font-medium">Descripción</th>
                <th className="pb-2 text-xs text-gray-400 font-medium text-right">Cant.</th>
                <th className="pb-2 text-xs text-gray-400 font-medium text-right">Precio unit.</th>
                <th className="pb-2 text-xs text-gray-400 font-medium text-right">IVA</th>
                <th className="pb-2 text-xs text-gray-400 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {invoice.items.map(it => (
                <tr key={it.id}>
                  <td className="py-2 text-gray-800 dark:text-gray-200">{it.descripcion}</td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-400">{it.cantidad}</td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-400">${fmt(it.precio_unitario)}</td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-400">{it.alicuota_iva}%</td>
                  <td className="py-2 text-right font-medium text-gray-800 dark:text-gray-200">${fmt(it.importe_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Neto gravado</span>
            <span>${fmt(invoice.importe_neto)}</span>
          </div>
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>IVA</span>
            <span>${fmt(invoice.importe_iva)}</span>
          </div>
          <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
            <span>TOTAL</span>
            <span>${fmt(invoice.importe_total)}</span>
          </div>
        </div>
      </div>

      {/* Info homologación */}
      {isDraft && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
          <p className="font-medium mb-1">Pendiente de autorización</p>
          <p>La autorización automática falló o está en proceso. Usá "Reintentar autorización" para volver a enviarla a AFIP.</p>
        </div>
      )}
    </div>
  )
}
