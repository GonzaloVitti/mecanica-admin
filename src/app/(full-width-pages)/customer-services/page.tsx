'use client'
import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import Badge from '@/components/ui/badge/Badge'
 
 interface WorkOrder {
   id: string
   work_order_number: string
   status: 'NEW' | 'DIAGNOSTIC' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'ON_HOLD' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED'
   customer_name: string
   customer_phone: string
   vehicle_license_plate: string
   vehicle_brand: string
   vehicle_model: string
   final_total: string | number
   created_at: string
 }
 
 function CustomerServicesContent() {
   const params = useSearchParams()
   const [code, setCode] = useState('')
   const [items, setItems] = useState<WorkOrder[]>([])
   const [loading, setLoading] = useState(false)
   const [error, setError] = useState<string | null>(null)
 
   const statusColor = (s: WorkOrder['status']) => {
     if (s === 'NEW') return 'info'
     if (s === 'IN_PROGRESS') return 'warning'
     if (s === 'WAITING_PARTS' || s === 'ON_HOLD') return 'warning'
     if (s === 'COMPLETED' || s === 'DELIVERED') return 'success'
     if (s === 'CANCELLED') return 'error'
     return 'info'
   }
   const statusLabel = (s: WorkOrder['status']) => {
     if (s === 'NEW') return 'Nueva'
     if (s === 'DIAGNOSTIC') return 'Diagnóstico'
     if (s === 'IN_PROGRESS') return 'En Proceso'
     if (s === 'WAITING_PARTS') return 'Esperando Repuestos'
     if (s === 'ON_HOLD') return 'En Espera'
     if (s === 'COMPLETED') return 'Completada'
     if (s === 'DELIVERED') return 'Entregada'
     if (s === 'CANCELLED') return 'Cancelada'
     return s
   }
 
   const loadItems = async (c: string) => {
     try {
       setLoading(true)
       setError(null)
       const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim()
       const res = await fetch(`${baseUrl}/api/work-orders/public_by_code/?code=${encodeURIComponent(c)}`)
       if (!res.ok) {
         setItems([])
         setError('Código inválido o sin servicios')
         return
       }
       const data = await res.json()
       if (Array.isArray(data)) {
         setItems(data)
       } else if (data && 'results' in data) {
         setItems(data.results)
       } else {
         setItems([])
       }
     } catch {
       setError('No se pudieron cargar servicios')
     } finally {
       setLoading(false)
     }
   }
 
   const onSubmit = (e: React.FormEvent) => {
     e.preventDefault()
     if (!code.trim()) return
     loadItems(code.trim())
     const url = new URL(window.location.href)
     url.searchParams.set('code', code.trim())
     window.history.replaceState(null, '', url.toString())
   }
 
   useEffect(() => {
     const c = params.get('code') || ''
     if (c) {
       setCode(c)
       loadItems(c)
     }
   }, [params])
 
   return (
     <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
       <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
         <h1 className="text-2xl font-semibold mb-4">Ver mis servicios</h1>
         <form onSubmit={onSubmit} className="flex gap-2 mb-4">
           <input
             className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
             placeholder="Ingresa tu código"
             value={code}
             onChange={(e) => setCode(e.target.value)}
           />
           <button
             type="submit"
             className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
           >
             Ver servicios
           </button>
         </form>
         {error && <div className="mb-4 text-red-600">{error}</div>}
         <div className="rounded-lg border border-gray-200 dark:border-gray-800">
           <Table>
             <TableHeader>
               <tr className="text-gray-400 dark:text-gray-500">
                 <th className="px-4 py-3 text-start font-medium">Orden</th>
                 <th className="px-4 py-3 text-start font-medium">Vehículo</th>
                 <th className="px-4 py-3 text-start font-medium">Estado</th>
                 <th className="px-4 py-3 text-start font-medium">Total</th>
                 <th className="px-4 py-3 text-start font-medium">Fecha</th>
               </tr>
             </TableHeader>
             <TableBody>
               {loading ? (
                 <TableRow>
                   <TableCell className="px-4 py-3 text-start">Cargando...</TableCell>
                 </TableRow>
               ) : items.length === 0 ? (
                 <TableRow>
                   <TableCell className="px-4 py-3 text-start">Sin servicios</TableCell>
                 </TableRow>
               ) : (
                 items.map((item) => (
                   <TableRow key={item.id}>
                     <TableCell className="px-4 py-3 text-start">OT-{item.work_order_number}</TableCell>
                     <TableCell className="px-4 py-3 text-start">{item.vehicle_license_plate} • {item.vehicle_brand} {item.vehicle_model}</TableCell>
                     <TableCell className="px-4 py-3 text-start">
                       <Badge size="sm" color={statusColor(item.status)}>{statusLabel(item.status)}</Badge>
                     </TableCell>
                     <TableCell className="px-4 py-3 text-start">
                       {typeof item.final_total === 'number' ? item.final_total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : item.final_total}
                     </TableCell>
                     <TableCell className="px-4 py-3 text-start">
                       {new Date(item.created_at).toLocaleString('es-MX')}
                     </TableCell>
                   </TableRow>
                 ))
               )}
             </TableBody>
           </Table>
         </div>
       </div>
     </div>
   )
}

export default function CustomerServicesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <CustomerServicesContent />
    </Suspense>
  )
}
