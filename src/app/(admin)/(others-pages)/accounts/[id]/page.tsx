'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { fetchApi } from '@/app/lib/data'
import Alert from '@/components/ui/alert/Alert'
import Input from '@/components/form/input/InputField'
import Label from '@/components/form/Label'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Badge from '@/components/ui/badge/Badge'
import Button from '@/components/ui/button/Button'

interface Account {
  id: string
  customer: string
  balance: string
  updated_at: string
}

interface Movement {
  id: string
  account: string
  type: 'DEBIT' | 'CREDIT'
  reference: string
  amount: string
  date: string
}

interface ApiResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

interface Customer {
  id: string
  name: string
  email: string
  phone: string
}

const AccountDetailPage = () => {
  const params = useParams()
  const id = params?.id as string
  const [account, setAccount] = useState<Account | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alert, setAlert] = useState<{ show: boolean; type: 'success'|'error'|'warning'|'info'; title: string; message: string }>({ show: false, type: 'info', title: '', message: '' })

  const [payAmount, setPayAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formatCurrency = (value: string | number) => {
    const n = typeof value === 'string' ? parseFloat(value) : value
    if (Number.isNaN(n)) return '—'
    return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const acc = await fetchApi<Account>(`/api/customer-accounts/${id}/`)
      if (!acc) throw new Error('Cuenta no encontrada')
      setAccount(acc)
      const cust = await fetchApi<Customer>(`/api/customers/${acc.customer}/`)
      if (cust) setCustomer(cust)
      const mv = await fetchApi<ApiResponse<Movement>>(`/api/account-movements/?account=${id}&limit=200`)
      setMovements(mv?.results || [])
    } catch (e) {
      setError('Error al cargar la cuenta')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) loadData()
  }, [id])

  useEffect(() => {
    let t: any
    if (alert.show) {
      t = setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000)
    }
    return () => clearTimeout(t)
  }, [alert.show])

  const registerPaymentToAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account || !customer) return
    const amount = Number(payAmount || '0')
    if (!amount || amount <= 0) {
      setAlert({ show: true, type: 'warning', title: 'Monto inválido', message: 'Ingresa un monto mayor a 0' })
      return
    }
    try {
      setIsSubmitting(true)
      const payment = await fetchApi<any>('/api/payments/', {
        method: 'POST',
        body: {
          customer: customer.id,
          work_order: null,
          amount,
          method: 'ACCOUNT',
          status: 'COMPLETED',
          notes: 'Pago a cuenta'
        }
      })
      if (payment) {
        setAlert({ show: true, type: 'success', title: 'Pago registrado', message: 'Se imputó el pago a la cuenta corriente' })
        setPayAmount('')
        await loadData()
      }
    } catch {
      setAlert({ show: true, type: 'error', title: 'Error', message: 'No se pudo registrar el pago' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-gray-500 dark:text-gray-400">Cargando...</div>
  }
  if (error || !account) {
    return <div className="p-6 text-red-600">{error || 'Cuenta no encontrada'}</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Link href="/accounts" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg><span>Volver a cuentas</span></Link>
      </div>
      {alert.show && (<div className="mb-4"><Alert variant={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(prev => ({ ...prev, show: false }))} /></div>)}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="p-5 lg:p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Cuenta Corriente</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Cliente</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{customer?.name || '—'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{customer?.email || '—'}</p>
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Saldo</p>
              <Badge size="md" color="warning">{formatCurrency(account.balance)}</Badge>
            </div>
          </div>
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Registrar pago a cuenta</h4>
            <form onSubmit={registerPaymentToAccount} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Monto</Label>
                <Input type="number" step="0.01" name="pay_amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button type="submit" disabled={isSubmitting}>Registrar pago</Button>
              </div>
            </form>
          </div>
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Movimientos</h4>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="max-w-full overflow-x-auto">
                <div className="min-w-[720px]">
                  <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                      <TableRow>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Fecha</TableCell>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tipo</TableCell>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Referencia</TableCell>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Monto</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {movements.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="px-5 py-4 sm:px-6 text-start">
                            <span className="text-gray-500 text-theme-sm dark:text-gray-400">{new Date(m.date).toLocaleString('es-MX')}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                            <Badge size="sm" color={m.type === 'DEBIT' ? 'warning' : 'success'}>{m.type === 'DEBIT' ? 'Débito' : 'Crédito'}</Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{m.reference || '—'}</TableCell>
                          <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatCurrency(m.amount)}</TableCell>
                        </TableRow>
                      ))}
                      {movements.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">Sin movimientos</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountDetailPage
