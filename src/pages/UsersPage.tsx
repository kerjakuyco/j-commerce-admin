import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { Panel } from '../components/Panel'
import { useToken } from '../context/AuthContext'
import { request } from '../lib/api'
import { readError, shortDate } from '../lib/format'
import type { Paginated, User } from '../types'

export function UsersPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const usersQuery = useQuery({
    queryKey: ['users', deferredSearch],
    queryFn: () => request<Paginated<User>>(`/users?limit=80&search=${encodeURIComponent(deferredSearch)}`, { token }),
  })
  const toggleMutation = useMutation({
    mutationFn: (user: User) =>
      request<User>(`/users/${user.id}/active`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({ isActive: !user.isActive }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User access updated')
    },
    onError: (error) => toast.error(readError(error)),
  })

  if (usersQuery.isLoading) return <LoadingState />
  if (usersQuery.error) return <ErrorState message={readError(usersQuery.error)} />

  return (
    <Panel title="Customer ledger" eyebrow="access control">
      <div className="toolbar">
        <Search size={18} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone" />
      </div>
      <DataTable
        columns={['Name', 'Email', 'Role', 'Joined', 'Status', 'Action']}
        rows={(usersQuery.data?.data ?? []).map((user) => [
          user.name,
          user.email,
          user.role,
          shortDate(user.createdAt),
          <Badge key={`${user.id}-status`} tone={user.isActive ? 'good' : 'danger'}>{user.isActive ? 'ACTIVE' : 'DISABLED'}</Badge>,
          <button key={user.id} className="table-button" type="button" onClick={() => toggleMutation.mutate(user)}>
            {user.isActive ? 'Disable' : 'Enable'}
          </button>,
        ])}
      />
    </Panel>
  )
}
