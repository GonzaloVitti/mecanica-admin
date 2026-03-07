'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { fetchApi } from '@/app/lib/data'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Input from '@/components/form/input/InputField'
import Alert from '@/components/ui/alert/Alert'
import Badge from '@/components/ui/badge/Badge'

interface Account {
  id: string
  customer: string
  balance: string
  updated_at: string
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
  account_balance?: string
}

const AccountsPage = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [customers, setCustomers] = useState<Record<string, Customer>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alert, setAlert] = useState<{ show: boolean; type: 'success'|'error'|'warning'|'info'; title: string; message: string }>({ show: false, type: 'info', title: '', message: '' })
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null)
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null)

  const formatCurrency = (value: string | number) => {
    const n = typeof value === 'string' ? parseFloat(value) : value
    if (Number.isNaN(n)) return '—'
    return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
  }

  const loadAccounts = async (url = '/api/customer-accounts/?limit=50') => {
    try {
      setLoading(true)
      const res = await fetchApi<ApiResponse<Account>>(url)
      if (!res) return
      setAccounts(res.results || [])
      setNextPageUrl(res.next)
      setPrevPageUrl(res.previous)
      const pageSize = res.results.length || 1
      setTotalPages(Math.max(1, Math.ceil(res.count / pageSize)))
      const ids = Array.from(new Set((res.results || []).map(a => a.customer).filter(Boolean)))
      const map: Record<string, Customer> = { ...customers }
      for (const id of ids) {
        if (!map[id]) {
          const c = await fetchApi<Customer>(`/api/customers/${id}/`)
          if (c) map[id] = c
        }
      }
      setCustomers(map)
    } catch {
      setError('Error al cargar cuentas corrientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    let t: any
    if (alert.show) {
      t = setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 4000)
    }
    return () => clearTimeout(t)
  }, [alert.show])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter(a => {
      const c = customers[a.customer]
      const text = `${a.id} ${c?.name || ''} ${c?.email || ''}`.toLowerCase()
      return text.includes(q)
    })
  }, [accounts, customers, search])

  const goToPrevPage = () => {
    if (prevPageUrl) {
      loadAccounts(prevPageUrl)
      setCurrentPage(p => Math.max(1, p - 1))
    }
  }
  const goToNextPage = () => {
    if (nextPageUrl && currentPage < totalPages) {
      loadAccounts(nextPageUrl)
      setCurrentPage(p => p + 1)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {alert.show && (<div className="mb-4"><Alert variant={alert.type} title={alert.title} message={alert.message} /></div>)}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Cuentas Corrientes</h1>
        <div className="w-64">
          <Input type="text" name="q" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente o ID" />
        </div>
      </div>
      {loading && accounts.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400">Cargando...</div>
      ) : error ? (
        <Alert variant="error" title="Error" message={error} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">ID</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Cliente</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Saldo</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actualizado</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Acciones</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {filtered.map((a) => {
                    const c = customers[a.customer]
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="text-gray-500 text-theme-sm dark:text-gray-400">{a.id.slice(0, 8)}...</span>
                        </TableCell>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{c?.name || '—'}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{c?.email || '—'}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <Badge size="sm" color="warning">{formatCurrency(a.balance)}</Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {new Date(a.updated_at).toLocaleString('es-MX')}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                          <Link href={`/accounts/${a.id}`} className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400">Ver</Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">No hay cuentas</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {accounts.length > 0 && (
            <div className="mt-4 flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
              </div>
              <div className="flex space-x-2">
                <button onClick={goToPrevPage} disabled={!prevPageUrl} className={`px-3 py-1 rounded ${!prevPageUrl ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500" : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"}`}>Anterior</button>
                <button onClick={goToNextPage} disabled={!nextPageUrl || currentPage >= totalPages} className={`px-3 py-1 rounded ${!nextPageUrl || currentPage >= totalPages ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500" : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"}`}>Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AccountsPage
