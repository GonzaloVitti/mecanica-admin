 'use client'
 import React, { useEffect, useState } from 'react'
 import { fetchApi } from '@/app/lib/data'
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
 
 export default function MyServicesPage() {
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
 
   const loadItems = async () => {
     try {
       setLoading(true)
       setError(null)
       const res = await fetchApi<{ results: WorkOrder[] } | WorkOrder[]>('/api/work-orders/my/')
       if (Array.isArray(res)) {
         setItems(res)
       } else if (res && 'results' in res) {
         setItems(res.results)
       } else {
         setItems([])
       }
     } catch {
       setError('No se pudieron cargar tus servicios')
     } finally {
       setLoading(false)
     }
   }
 
   useEffect(() => {
     loadItems()
   }, [])
 
   return (
     <div className="p-6">
       <h1 className="text-2xl font-semibold mb-4">Mis Servicios</h1>
       {error && <div className="mb-4 text-red-600">{error}</div>}
       <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
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
                 <TableCell className="px-4 py-3 text-start">No tienes servicios registrados</TableCell>
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
   )
 }
