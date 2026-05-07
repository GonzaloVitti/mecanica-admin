'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchApi } from '@/app/lib/data'

// ── tipos ────────────────────────────────────────────────────────────────────

interface StatusCount { name: string; count: number }

interface Metrics {
  total_sales: number
  today_sales: number
  current_month: {
    sales: number
    daily_average: number
    comparison_with_previous: { difference_percentage: number; is_increase: boolean }
  }
  sales_states?: Record<string, StatusCount>
}

interface WorkOrder {
  id: string
  work_order_number: string
  status: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  customer_name: string
  vehicle_license_plate: string
  vehicle_brand: string
  vehicle_model: string
  final_total: string
  promised_date?: string
  created_at: string
}

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Nuevo', DIAGNOSTIC: 'Diagnóstico', IN_PROGRESS: 'En progreso',
  WAITING_PARTS: 'Esperando repuestos', ON_HOLD: 'En pausa',
  COMPLETED: 'Completado', DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
}

const STATUS_COLOR: Record<string, { bg: string; text: string; bar: string }> = {
  NEW:           { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-700 dark:text-blue-300',    bar: 'bg-blue-500' },
  DIAGNOSTIC:    { bg: 'bg-purple-50 dark:bg-purple-900/20',text: 'text-purple-700 dark:text-purple-300', bar: 'bg-purple-500' },
  IN_PROGRESS:   { bg: 'bg-yellow-50 dark:bg-yellow-900/20',text: 'text-yellow-700 dark:text-yellow-300', bar: 'bg-yellow-500' },
  WAITING_PARTS: { bg: 'bg-orange-50 dark:bg-orange-900/20',text: 'text-orange-700 dark:text-orange-300', bar: 'bg-orange-500' },
  ON_HOLD:       { bg: 'bg-gray-50 dark:bg-gray-800',       text: 'text-gray-600 dark:text-gray-400',     bar: 'bg-gray-400' },
  COMPLETED:     { bg: 'bg-teal-50 dark:bg-teal-900/20',    text: 'text-teal-700 dark:text-teal-300',     bar: 'bg-teal-500' },
  DELIVERED:     { bg: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-700 dark:text-green-300',   bar: 'bg-green-500' },
  CANCELLED:     { bg: 'bg-red-50 dark:bg-red-900/20',      text: 'text-red-600 dark:text-red-400',       bar: 'bg-red-400' },
}

const ACTIVE_STATUSES = ['NEW', 'DIAGNOSTIC', 'IN_PROGRESS', 'WAITING_PARTS', 'ON_HOLD']

const fmt = (n: number | string) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(n) || 0)

const today = () =>
  new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

// ── componente ───────────────────────────────────────────────────────────────

export default function MechanicDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [recent, setRecent] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [m, wo] = await Promise.all([
          fetchApi<Metrics>('/api/sales/dashboard_metrics/'),
          fetchApi<{ results: WorkOrder[] }>('/api/work-orders/?limit=8&ordering=-created_at'),
        ])
        if (m) setMetrics(m)
        if (wo) setRecent(wo.results || [])
      } catch { /* silencioso */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const states = metrics?.sales_states ?? {}

  // conteos rápidos
  const activeCount   = ACTIVE_STATUSES.reduce((s, k) => s + (states[k]?.count ?? 0), 0)
  const completedCount = states['COMPLETED']?.count ?? 0
  const deliveredCount = states['DELIVERED']?.count ?? 0
  const cancelledCount = states['CANCELLED']?.count ?? 0

  // vencidos: activos con promised_date < hoy
  const nowIso = new Date().toISOString()
  const overdueCount = recent.filter(
    w => ACTIVE_STATUSES.includes(w.status) && w.promised_date && w.promised_date < nowIso
  ).length

  // barra de estados: excluimos CANCELLED para no ensuciar
  const barStatuses = ['NEW','DIAGNOSTIC','IN_PROGRESS','WAITING_PARTS','ON_HOLD','COMPLETED','DELIVERED']
  const barTotal = barStatuses.reduce((s, k) => s + (states[k]?.count ?? 0), 0) || 1

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* fecha */}
      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{today()}</p>

      {/* ── tarjetas superiores ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Activos',
            value: loading ? '—' : activeCount,
            sub: 'en taller ahora',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ),
            color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
          },
          {
            label: 'Para entregar',
            value: loading ? '—' : completedCount,
            sub: 'listos, sin retirar',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-400',
          },
          {
            label: 'Entregados',
            value: loading ? '—' : deliveredCount,
            sub: 'este período',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M5 13l4 4L19 7" />
              </svg>
            ),
            color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
          },
          {
            label: 'Vencidos',
            value: loading ? '—' : overdueCount,
            sub: 'fecha comprometida',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            color: overdueCount > 0
              ? 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
              : 'text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400',
          },
        ].map(card => (
          <div key={card.label}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] p-4 flex flex-col gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                {card.value}
              </p>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mt-1">{card.label}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── fila intermedia: estados + ingresos ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        {/* distribución por estado */}
        <div className="md:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Distribución por estado</h3>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2.5">
              {barStatuses.map(key => {
                const count = states[key]?.count ?? 0
                if (!count) return null
                const pct = Math.round((count / barTotal) * 100)
                const c = STATUS_COLOR[key]
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-36 text-xs text-gray-500 dark:text-gray-400 shrink-0">{STATUS_LABEL[key]}</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right text-xs font-medium text-gray-700 dark:text-gray-300 shrink-0">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* resumen económico */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] p-5 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Resumen económico</h3>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Servicios hoy</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                  {metrics?.today_sales ?? 0}
                  <span className="text-sm font-normal text-gray-400 ml-1">servs.</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Este mes</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                  {metrics?.current_month.sales ?? 0}
                  <span className="text-sm font-normal text-gray-400 ml-1">servs.</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Promedio diario</p>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-200 mt-0.5">
                  {(metrics?.current_month.daily_average ?? 0).toFixed(1)}
                  <span className="text-sm font-normal text-gray-400 ml-1">servs./día</span>
                </p>
              </div>
              {metrics && (
                <div className={`text-xs font-medium px-2 py-1 rounded-md w-fit ${
                  metrics.current_month.comparison_with_previous.is_increase
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {metrics.current_month.comparison_with_previous.is_increase ? '▲' : '▼'}{' '}
                  {Math.abs(metrics.current_month.comparison_with_previous.difference_percentage).toFixed(1)}% vs mes anterior
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── últimos servicios ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Últimos servicios</h3>
          <Link href="/services" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
            Ver todos →
          </Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}
          </div>
        ) : recent.length === 0 ? (
          <p className="px-5 py-8 text-sm text-center text-gray-400">No hay servicios registrados</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {recent.map(wo => {
              const c = STATUS_COLOR[wo.status] ?? STATUS_COLOR.CANCELLED
              const isOverdue = ACTIVE_STATUSES.includes(wo.status) && wo.promised_date && wo.promised_date < nowIso
              return (
                <li key={wo.id}>
                  <Link href={`/services/${wo.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                    {/* estado pill */}
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                      {STATUS_LABEL[wo.status] ?? wo.status}
                    </span>
                    {/* info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                        {wo.work_order_number}
                        {wo.customer_name && (
                          <span className="font-normal text-gray-500 dark:text-gray-400"> · {wo.customer_name}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {[wo.vehicle_license_plate, wo.vehicle_brand, wo.vehicle_model].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {/* vencido */}
                    {isOverdue && (
                      <span className="shrink-0 text-[10px] font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                        Vencido
                      </span>
                    )}
                    {/* total + flecha */}
                    <div className="shrink-0 text-right">
                      {Number(wo.final_total) > 0 && (
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{fmt(wo.final_total)}</p>
                      )}
                      <span className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors">→</span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

    </div>
  )
}
