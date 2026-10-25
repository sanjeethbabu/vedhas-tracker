import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { downloadCustomersCsv } from './csv'
import { isSupabaseConfigured, setRememberSession, supabase } from './supabase'
import type { Customer, CustomerFormValues, Page, Sector, UserProfile } from './types'
import { sectors } from './types'

type FormState = {
  customer_name: string
  sector: Sector | ''
  other_sector: string
  poc_name: string
  contact_number: string
  beat_no: string
  area: string
  city: string
  location: string
  room_count: string
  strength: string
  branches: string
  brands: string
  required_litres_per_month: string
  current_purchase: string
  remarks: string
}

type Notice = { text: string; kind: 'success' | 'error' | 'info' } | null

const emptyForm: FormState = {
  customer_name: '',
  sector: '',
  other_sector: '',
  poc_name: '',
  contact_number: '',
  beat_no: '',
  area: '',
  city: '',
  location: '',
  room_count: '',
  strength: '',
  branches: '',
  brands: '',
  required_litres_per_month: '',
  current_purchase: '',
  remarks: '',
}

function Icon({
  name,
  size = 18,
}: {
  name: 'grid' | 'users' | 'plus' | 'download' | 'search' | 'logout' | 'chevron' | 'arrow' | 'edit' | 'trash' | 'close' | 'check' | 'building' | 'menu' | 'refresh' | 'clock' | 'sparkles'
  size?: number
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }

  const paths: Record<typeof name, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.4" /><rect x="14" y="3" width="7" height="7" rx="1.4" /><rect x="3" y="14" width="7" height="7" rx="1.4" /><rect x="14" y="14" width="7" height="7" rx="1.4" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
    chevron: <><path d="m9 18 6-6-6-6" /></>,
    arrow: <><path d="M19 12H5M12 19l-7-7 7-7" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-.8 14H5.8L5 6m4 4v6m6-6v6" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    building: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 21v-4h6v4M8 7h1m6 0h1M8 11h1m6 0h1" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9A7 7 0 0 1 17.2 5L20 7M4 17l2.8 2A7 7 0 0 0 18.4 15" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z" /></>,
  }

  return <svg {...common}>{paths[name]}</svg>
}

function Logo({ className = '' }: { className?: string }) {
  return <img className={`brand-image ${className}`} src="/vedhas-logo.png" alt="Vedhas Chemicals logo" />
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function sectorLabel(customer: Customer): string {
  return customer.sector === 'Others' && customer.other_sector
    ? customer.other_sector
    : customer.sector
}

function customerToForm(customer: Customer): FormState {
  return {
    customer_name: customer.customer_name,
    sector: customer.sector,
    other_sector: customer.other_sector ?? '',
    poc_name: customer.poc_name ?? '',
    contact_number: customer.contact_number ?? '',
    beat_no: customer.beat_no ?? '',
    area: customer.area ?? '',
    city: customer.city ?? '',
    location: customer.location ?? '',
    room_count: customer.room_count ?? '',
    strength: customer.strength ?? '',
    branches: customer.branches ?? '',
    brands: customer.brands ?? '',
    required_litres_per_month:
      customer.required_litres_per_month == null
        ? ''
        : String(customer.required_litres_per_month),
    current_purchase: customer.current_purchase ?? '',
    remarks: customer.remarks ?? '',
  }
}

function formToCustomer(values: FormState): CustomerFormValues {
  return {
    customer_name: values.customer_name.trim(),
    sector: values.sector as Sector,
    other_sector: values.sector === 'Others' ? values.other_sector.trim() : null,
    poc_name: values.poc_name.trim() || null,
    contact_number: values.contact_number.trim() || null,
    beat_no: values.beat_no.trim() || null,
    area: values.area.trim() || null,
    city: values.city.trim() || null,
    location: values.location.trim() || null,
    room_count: values.room_count.trim() || null,
    strength: values.strength.trim() || null,
    branches: values.branches.trim() || null,
    brands: values.brands.trim() || null,
    required_litres_per_month: values.required_litres_per_month
      ? Number(values.required_litres_per_month)
      : null,
    current_purchase: values.current_purchase.trim() || null,
    remarks: values.remarks.trim() || null,
  }
}

async function loadAllCustomers(userId: string, isAdmin: boolean): Promise<Customer[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const pageSize = 1000
  const result: Customer[] = []

  for (let offset = 0; ; offset += pageSize) {
    let query = supabase
      .from('customers')
      .select('*')
      .order('serial_number', { ascending: false })
      .range(offset, offset + pageSize - 1)
    if (!isAdmin) query = query.eq('user_id', userId)
    const { data, error } = await query

    if (error) throw error
    result.push(...(data as Customer[]))
    if (!data || data.length < pageSize) break
  }

  return result
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [splash, setSplash] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [staff, setStaff] = useState<UserProfile[]>([])
  const [savedCustomer, setSavedCustomer] = useState<Customer | null>(null)
  const [customersLoading, setCustomersLoading] = useState(false)
  const [page, setPage] = useState<Page>('dashboard')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'create'>('login')
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [updateCheckState, setUpdateCheckState] = useState<'idle' | 'checking' | 'available' | 'current' | 'error'>('idle')
  const [availableVersion, setAvailableVersion] = useState('')

  const notify = useCallback((text: string, kind: NonNullable<Notice>['kind'] = 'success') => {
    setNotice({ text, kind })
    window.setTimeout(() => setNotice(null), 4500)
  }, [])

  const isAdmin = profile?.role === 'admin'

  const refreshCustomers = useCallback(async (userId: string, admin = false) => {
    setCustomersLoading(true)
    try {
      const records = await loadAllCustomers(userId, admin)
      setCustomers(records)
    } catch {
      notify('Customers could not be loaded. Check your connection and try again.', 'error')
    } finally {
      setCustomersLoading(false)
    }
  }, [notify])

  useEffect(() => {
    const splashTimer = window.setTimeout(() => setSplash(false), 700)
    if (!supabase) {
      setAuthLoading(false)
      return () => window.clearTimeout(splashTimer)
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError('We could not verify your session. Please refresh and try again.')
      setSession(data.session)
      setAuthLoading(false)
    }).catch(() => {
      setAuthError('We could not verify your session. Please refresh and try again.')
      setAuthLoading(false)
    })

    return () => {
      window.clearTimeout(splashTimer)
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true
    if (session?.user.id) {
      setProfile(null)
      setProfileError('')
      setProfileLoading(true)
      void (async () => {
        if (!supabase) return
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('user_id, employee_id, full_name, role, created_at')
            .eq('user_id', session.user.id)
            .single()
          if (error || !data || (data.role !== 'employee' && data.role !== 'admin')) {
            throw new Error('Profile unavailable')
          }
          if (!active) return
          const currentProfile = data as UserProfile
          setProfile(currentProfile)
          await refreshCustomers(session.user.id, currentProfile.role === 'admin')
          if (currentProfile.role === 'admin') {
            const { data: employees, error: employeesError } = await supabase
              .from('profiles')
              .select('user_id, employee_id, full_name, role, created_at')
              .eq('role', 'employee')
            if (employeesError) throw employeesError
            if (active) setStaff(employees as UserProfile[])
          } else {
            setStaff([])
          }
        } catch {
          if (active) setProfileError('This account is not set up for Vedhas Tracker. Contact your administrator.')
        } finally {
          if (active) setProfileLoading(false)
        }
      })()
    } else {
      setCustomers([])
      setProfile(null)
      setStaff([])
      setProfileLoading(false)
      setProfileError('')
    }
    return () => {
      active = false
    }
  }, [session?.user.id, refreshCustomers])

  useEffect(() => {
    if (!updateDialogOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUpdateDialogOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [updateDialogOpen, updateCheckState])

  const cities = useMemo(
    () =>
      [...new Set(customers.map((customer) => customer.city?.trim()).filter(Boolean) as string[])]
        .sort((a, b) => a.localeCompare(b)),
    [customers],
  )
  const staffNames = useMemo(
    () => new Map(staff.map((person) => [person.user_id, `${person.full_name} (${person.employee_id})`])),
    [staff],
  )

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const filtered = customers.filter((customer) => {
      const searchable = [
        customer.customer_name,
        customer.poc_name,
        customer.contact_number,
        customer.area,
        customer.city,
        customer.location,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
      return (
        (!query || searchable.includes(query)) &&
        (!sectorFilter || customer.sector === sectorFilter) &&
        (!cityFilter || customer.city === cityFilter)
      )
    })

    if (sortBy === 'oldest') return filtered.sort((a, b) => a.serial_number - b.serial_number)
    if (sortBy === 'name') {
      return filtered.sort((a, b) => a.customer_name.localeCompare(b.customer_name))
    }
    return filtered.sort((a, b) => b.serial_number - a.serial_number)
  }, [customers, search, sectorFilter, cityFilter, sortBy])

  const stats = useMemo(
    () => ({
      total: customers.length,
      hotels: customers.filter((customer) => customer.sector === 'Hotels & Residency').length,
      hospitals: customers.filter((customer) => customer.sector === 'Hospitals').length,
      schools: customers.filter((customer) => customer.sector === 'Schools').length,
      colleges: customers.filter((customer) => customer.sector === 'Colleges').length,
      others: customers.filter(
        (customer) => !['Hotels & Residency', 'Hospitals', 'Schools', 'Colleges'].includes(customer.sector),
      ).length,
    }),
    [customers],
  )

  if (splash || authLoading || (session && profileLoading)) {
    return (
      <div className="splash-screen">
        <Logo className="splash-logo" />
        <div className="splash-name">Vedhas <span>Tracker</span></div>
        <div className="loader-dots" aria-label="Loading"><i /><i /><i /></div>
        <span className="splash-caption">Preparing your workspace</span>
      </div>
    )
  }

  if (!session) {
    return (
      <LoginScreen
        configured={isSupabaseConfigured}
        mode={authMode}
        employeeId={employeeId}
        fullName={fullName}
        password={password}
        rememberMe={rememberMe}
        error={authError}
        message={authMessage}
        submitting={authSubmitting}
        onEmployeeId={setEmployeeId}
        onFullName={setFullName}
        onPassword={setPassword}
        onRememberMe={setRememberMe}
        onModeChange={(mode) => {
          setAuthMode(mode)
          setAuthError('')
          setAuthMessage('')
        }}
        onLogin={async (event) => {
          event.preventDefault()
          setAuthError('')
          setAuthMessage('')
          if (!supabase) {
            setAuthError('Connect Supabase to sign in. Add the project URL and publishable/anon key in your .env file.')
            return
          }
          const id = employeeId.trim().toLowerCase()
          if (!/^(emp|admin)[0-9]{3,}$/.test(id)) {
            setAuthError('Enter an employee ID such as emp001 or an admin ID such as admin001.')
            return
          }
          setAuthSubmitting(true)
          setRememberSession(rememberMe)
          try {
            const { error } = await supabase.auth.signInWithPassword({
              email: `${id}@accounts.vedhas.local`,
              password,
            })
            if (error) {
              setAuthError('Sign in failed. Check your ID and password, then try again.')
            }
          } catch {
            setAuthError('Sign in failed. Check your ID and password, then try again.')
          } finally {
            setAuthSubmitting(false)
          }
        }}
        onCreateAccount={async (event) => {
          event.preventDefault()
          setAuthError('')
          setAuthMessage('')
          if (!supabase) {
            setAuthError('Connect Supabase and deploy the account function before creating accounts.')
            return
          }
          const id = employeeId.trim().toLowerCase()
          if (!fullName.trim() || !/^emp[0-9]{3,}$/.test(id)) {
            setAuthError('Employee accounts need your name and an ID such as emp001.')
            return
          }
          if (password.length < 10 || new TextEncoder().encode(password).length > 72) {
            setAuthError('Use a password with at least 10 characters and no more than 72 UTF-8 bytes.')
            return
          }
          setAuthSubmitting(true)
          try {
            const { data, error } = await supabase.functions.invoke('create-employee-account', {
              body: { fullName: fullName.trim(), employeeId: id, password },
            })
            if (error) {
              const response = 'context' in error && error.context instanceof Response
                ? error.context
                : null
              const responseBody = response
                ? await response.json().catch(() => null) as { error?: string } | null
                : null
              setAuthError(responseBody?.error ?? data?.error ?? 'We could not create the account. Check the ID and try again.')
              return
            }
            if (!data?.message) {
              setAuthError('We could not create the account. Check the ID and try again.')
              return
            }
            setAuthMode('login')
            setPassword('')
            setAuthMessage('Employee account created. Sign in with your ID and password.')
          } catch {
            setAuthError('We could not create the account. Check your connection and try again.')
          } finally {
            setAuthSubmitting(false)
          }
        }}
      />
    )
  }

  if (profileError) {
    return (
      <div className="access-error-screen">
        <Logo className="access-error-logo" />
        <h1>Account setup needed</h1>
        <p>{profileError || 'Your account role could not be verified. Contact your administrator.'}</p>
        <button className="button button-outline" onClick={async () => { await supabase?.auth.signOut() }}>Sign out</button>
      </div>
    )
  }
  if (!profile) {
    return (
      <div className="splash-screen">
        <Logo className="splash-logo" />
        <div className="splash-name">Vedhas <span>Tracker</span></div>
        <div className="loader-dots" aria-label="Loading"><i /><i /><i /></div>
        <span className="splash-caption">Preparing your workspace</span>
      </div>
    )
  }

  const openAdd = () => {
    if (isAdmin) return
    setSelected(null)
    setEditing(false)
    setForm(emptyForm)
    setFormError('')
    setSavedCustomer(null)
    setPage('add')
    setMobileNavOpen(false)
  }

  const openCustomer = (customer: Customer) => {
    setSelected(customer)
    setEditing(false)
    setPage('detail')
    setMobileNavOpen(false)
  }

  const goTo = (nextPage: Page) => {
    setPage(nextPage)
    setEditing(false)
    setSavedCustomer(null)
    setMobileNavOpen(false)
    if (nextPage !== 'detail') setSelected(null)
  }

  const submitCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    if (isAdmin) {
      setFormError('Admin accounts are read-only and cannot submit customer records.')
      return
    }
    if (!form.customer_name.trim()) {
      setFormError('Enter the customer name to continue.')
      return
    }
    if (!form.sector) {
      setFormError('Choose a sector to continue.')
      return
    }
    if (form.sector === 'Others' && !form.other_sector.trim()) {
      setFormError('Enter the other sector name.')
      return
    }
    if (
      form.required_litres_per_month &&
      (!Number.isFinite(Number(form.required_litres_per_month)) ||
        Number(form.required_litres_per_month) < 0)
    ) {
      setFormError('Required litres must be a valid non-negative number.')
      return
    }
    if (!supabase) {
      setFormError('Supabase is not configured. Add the required environment variables to save customers.')
      return
    }

    setSubmitting(true)
    try {
      const customerData = formToCustomer(form)
      const response = editing && selected
        ? await supabase.from('customers').update(customerData).eq('id', selected.id).select().single()
        : await supabase
            .from('customers')
            .insert({ ...customerData, user_id: session.user.id })
            .select()
            .single()

      if (response.error || !response.data) {
        setFormError('We could not save this customer. Check your connection and try again.')
        return
      }

      const saved = response.data as Customer
      notify(editing ? 'Customer updated successfully.' : 'Customer saved successfully.')
      await refreshCustomers(session.user.id)
      if (editing) {
        setSelected(saved)
        setEditing(false)
        setPage('detail')
      } else {
        setSavedCustomer(saved)
      }
    } catch {
      setFormError('We could not save this customer. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteCustomer = async () => {
    if (!supabase || !selected) return
    if (!window.confirm(`Delete ${selected.customer_name}? This action cannot be undone.`)) return
    try {
      const { error } = await supabase.from('customers').delete().eq('id', selected.id)
      if (error) {
        notify('This customer could not be deleted. Please try again.', 'error')
        return
      }
      setSelected(null)
      setPage('customers')
      notify('Customer deleted.')
      await refreshCustomers(session.user.id)
    } catch {
      notify('This customer could not be deleted. Please try again.', 'error')
    }
  }

  const exportCsv = () => {
    if (!customers.length) {
      notify('There are no customer records to export yet.', 'info')
      return
    }
    try {
      downloadCustomersCsv(customers)
      notify('Your CSV export is ready.')
    } catch {
      notify('The CSV export could not be generated. Please try again.', 'error')
    }
  }

  const logout = async () => {
    if (!supabase) return
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        notify('We could not sign you out. Please try again.', 'error')
        return
      }
      setCustomers([])
      setPage('dashboard')
    } catch {
      notify('We could not sign you out. Please try again.', 'error')
    }
  }

  const checkForUpdates = async () => {
    setMobileNavOpen(false)
    setUpdateDialogOpen(true)
    setUpdateCheckState('checking')
    setAvailableVersion('')
    try {
      const response = await fetch(`/version.json?check=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!response.ok) throw new Error('Version check failed.')
      const published = await response.json() as { version?: unknown }
      if (typeof published.version !== 'string' || !published.version) {
        throw new Error('Published app version is unavailable.')
      }
      setAvailableVersion(published.version)
      setUpdateCheckState(published.version === __APP_VERSION__ ? 'current' : 'available')
    } catch {
      setUpdateCheckState('error')
    }
  }

  const applyUpdate = () => {
    if (updateCheckState !== 'available') return
    const url = new URL(window.location.href)
    url.searchParams.set('appUpdate', availableVersion)
    window.location.replace(url.toString())
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Logo className="sidebar-logo" />
          <div className="brand-title">Vedhas <span>Tracker</span></div>
          <div className="brand-subtitle">{isAdmin ? 'ADMIN REPORTING' : 'EMPLOYEE WORKSPACE'}</div>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          <p className="nav-caption">WORKSPACE</p>
          <NavButton icon="grid" label="Overview" active={page === 'dashboard'} onClick={() => goTo('dashboard')} />
          <NavButton icon="users" label={isAdmin ? 'Reports' : 'My customers'} active={page === 'customers' || page === 'detail'} onClick={() => goTo('customers')} />
          {!isAdmin && <NavButton icon="plus" label="Add customer" active={page === 'add'} onClick={openAdd} />}
          <p className="nav-caption nav-caption-spaced">YOUR ACCOUNT</p>
          <button className="nav-item" onClick={exportCsv}>
            <Icon name="download" /><span>Export CSV</span>
          </button>
          <button className="nav-item mobile-update-item" onClick={checkForUpdates}>
            <Icon name="refresh" /><span>Check for updates</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="secure-note"><span className="secure-dot" /> Your data is private</div>
          <button className="nav-item logout-item" onClick={logout}>
            <Icon name="logout" /><span>Sign out</span>
          </button>
          <div className="sidebar-version">Vedhas <strong>Tracker</strong> <span>·</span> v1.0</div>
        </div>
      </aside>
      {mobileNavOpen && <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>
            <Icon name="menu" size={21} />
          </button>
          <div className="topbar-crumb"><span>Workspace</span><Icon name="chevron" size={14} /><strong>{pageTitle(page, editing, isAdmin)}</strong></div>
          <div className="account-chip">
            <div className="avatar">{profile.full_name.slice(0, 1).toUpperCase()}</div>
              <div className="account-text"><strong>{profile.full_name}</strong><span>{profile.employee_id} · {isAdmin ? 'Admin' : 'Employee'}</span></div>
            <button className="account-logout icon-button" aria-label="Sign out" title="Sign out" onClick={logout}><Icon name="logout" size={17} /></button>
          </div>
        </header>

        <main className="page-content">
          {!isSupabaseConfigured && (
            <div className="setup-banner">
              <strong>Finish setup to enable saving.</strong>
              <span>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code>, then restart the app.</span>
            </div>
          )}
          {page === 'dashboard' && (
            <Dashboard
              profile={profile}
              admin={isAdmin}
              customers={customers}
              stats={stats}
              loading={customersLoading}
              onAdd={openAdd}
              onCustomers={() => goTo('customers')}
              onExport={exportCsv}
              onOpenCustomer={openCustomer}
            />
          )}
          {page === 'customers' && (
            <CustomerList
              customers={filteredCustomers}
              admin={isAdmin}
              staffNames={staffNames}
              allCount={customers.length}
              loading={customersLoading}
              search={search}
              sectorFilter={sectorFilter}
              cityFilter={cityFilter}
              sortBy={sortBy}
              cities={cities}
              onSearch={setSearch}
              onSectorFilter={setSectorFilter}
              onCityFilter={setCityFilter}
              onSort={setSortBy}
              onAdd={openAdd}
              onExport={exportCsv}
              onOpenCustomer={openCustomer}
              onClearFilters={() => {
                setSearch('')
                setSectorFilter('')
                setCityFilter('')
              }}
            />
          )}
          {page === 'add' && (
            <CustomerForm
              form={form}
              editing={editing}
              savedCustomer={savedCustomer}
              loading={submitting}
              error={formError}
              onChange={setForm}
              onSubmit={submitCustomer}
              onCancel={() => editing && selected ? openCustomer(selected) : goTo('customers')}
              onAddAnother={() => {
                setForm(emptyForm)
                setSavedCustomer(null)
                setFormError('')
              }}
              onViewCustomer={() => {
                if (!savedCustomer) return
                setSelected(savedCustomer)
                setSavedCustomer(null)
                setPage('detail')
              }}
            />
          )}
          {page === 'detail' && selected && !editing && (
            <CustomerDetail
              customer={selected}
              readOnly={isAdmin}
              createdBy={staffNames.get(selected.user_id)}
              onBack={() => goTo('customers')}
              onEdit={() => {
                setForm(customerToForm(selected))
                setFormError('')
                setEditing(true)
                setPage('add')
              }}
              onDelete={deleteCustomer}
            />
          )}
        </main>
        <footer className="page-footer">Vedhas <strong>Tracker</strong> <span>·</span> Simple customer tracking, thoughtfully done.</footer>
      </div>
      <div className="mobile-bottom-nav">
        <NavButton icon="grid" label="Home" active={page === 'dashboard'} onClick={() => goTo('dashboard')} />
        <NavButton icon="users" label={isAdmin ? 'Reports' : 'My records'} active={page === 'customers' || page === 'detail'} onClick={() => goTo('customers')} />
        {!isAdmin
          ? <NavButton icon="plus" label="Add" active={page === 'add'} onClick={openAdd} />
          : <button className="mobile-nav-button" onClick={exportCsv}><Icon name="download" /><span>Export</span></button>}
        <button className="mobile-nav-button" onClick={logout}><Icon name="logout" /><span>Sign out</span></button>
      </div>
      {updateDialogOpen && (
        <UpdateDialog
          state={updateCheckState}
          version={availableVersion}
          onClose={() => setUpdateDialogOpen(false)}
          onRetry={() => void checkForUpdates()}
          onUpdate={applyUpdate}
        />
      )}
      {notice && <div className={`toast toast-${notice.kind}`} role="status"><span className="toast-icon"><Icon name={notice.kind === 'success' ? 'check' : notice.kind === 'error' ? 'close' : 'download'} size={16} /></span>{notice.text}</div>}
    </div>
  )
}

function pageTitle(page: Page, editing: boolean, admin: boolean): string {
  if (page === 'dashboard') return 'Overview'
  if (page === 'customers') return admin ? 'Reports' : 'My customers'
  if (page === 'add') return editing ? 'Edit customer' : 'Add customer'
  return 'Customer details'
}

function UpdateDialog({
  state,
  version,
  onClose,
  onRetry,
  onUpdate,
}: {
  state: 'checking' | 'available' | 'current' | 'error' | 'idle'
  version: string
  onClose: () => void
  onRetry: () => void
  onUpdate: () => void
}) {
  const content = {
    checking: {
      title: 'Checking for updates',
      description: 'Looking for the latest Vedhas Tracker release.',
      icon: <span className="update-spinner" />,
    },
    available: {
      title: 'New update available',
      description: 'A newer version of Vedhas Tracker is ready. Update now to load the latest release.',
      icon: <Icon name="sparkles" size={22} />,
    },
    current: {
      title: "You're up to date",
      description: 'You already have the latest version of Vedhas Tracker.',
      icon: <Icon name="check" size={22} />,
    },
    error: {
      title: "Couldn't check for updates",
      description: 'Connect to the internet and try checking again.',
      icon: <Icon name="refresh" size={22} />,
    },
    idle: {
      title: 'Check for updates',
      description: 'Check for the latest version of Vedhas Tracker.',
      icon: <Icon name="refresh" size={22} />,
    },
  }[state]

  return (
    <div className="update-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && state !== 'checking') onClose()
    }}>
      <section className="update-modal" role="dialog" aria-modal="true" aria-labelledby="update-title" aria-describedby="update-description">
        <button className="update-close icon-button" onClick={onClose} aria-label="Close update dialog">
          <Icon name="close" size={18} />
        </button>
        <div className={`update-illustration update-illustration-${state}`}>{content.icon}</div>
        <span className="update-eyebrow">Vedhas <strong>Tracker</strong></span>
        <h2 id="update-title">{content.title}</h2>
        <p id="update-description">{content.description}</p>
        {state === 'available' && <div className="update-version"><span>NEW VERSION</span><strong>{version}</strong></div>}
        {state === 'checking' && <div className="update-progress"><span /></div>}
        <div className="update-modal-actions">
          {state === 'available' ? <>
            <button className="button button-outline" onClick={onClose}>Update later</button>
            <button className="button button-primary" onClick={onUpdate}><Icon name="refresh" size={16} /> Update now</button>
          </> : state === 'checking' ? (
            <button className="button button-outline" onClick={onClose} disabled>Checking…</button>
          ) : state === 'error' ? <>
            <button className="button button-outline" onClick={onClose}>Close</button>
            <button className="button button-primary" onClick={onRetry}><Icon name="refresh" size={16} /> Try again</button>
          </> : (
            <button className="button button-primary update-done" onClick={onClose}>Done</button>
          )}
        </div>
        <span className="update-footer">Your saved customer records are kept safe.</span>
      </section>
    </div>
  )
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: 'grid' | 'users' | 'plus'
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button className={`nav-item ${active ? 'nav-item-active' : ''}`} onClick={onClick}>
      <Icon name={icon} /><span>{label}</span>{active && <span className="nav-active-mark" />}
    </button>
  )
}

function LoginScreen({
  configured,
  mode,
  employeeId,
  fullName,
  password,
  rememberMe,
  error,
  message,
  submitting,
  onEmployeeId,
  onFullName,
  onPassword,
  onRememberMe,
  onModeChange,
  onLogin,
  onCreateAccount,
}: {
  configured: boolean
  mode: 'login' | 'create'
  employeeId: string
  fullName: string
  password: string
  rememberMe: boolean
  error: string
  message: string
  submitting: boolean
  onEmployeeId: (value: string) => void
  onFullName: (value: string) => void
  onPassword: (value: string) => void
  onRememberMe: (value: boolean) => void
  onModeChange: (mode: 'login' | 'create') => void
  onLogin: (event: FormEvent<HTMLFormElement>) => void
  onCreateAccount: (event: FormEvent<HTMLFormElement>) => void
}) {
  const creating = mode === 'create'
  return (
    <div className="login-screen">
      <section className="login-art">
        <div className="art-glow art-glow-one" /><div className="art-glow art-glow-two" />
        <div className="art-content">
          <div className="art-brand"><Logo className="login-art-logo" /><span>Vedhas <b>Tracker</b></span></div>
          <div className="art-message">
            <div className="eyebrow light-eyebrow"><span /> BUILT FOR YOUR FIELD TEAM</div>
            <h1>Good business<br />starts with<br /><em>good connections.</em></h1>
            <p>A simple, secure place to keep every customer detail close at hand.</p>
          </div>
          <div className="art-footnote"><span className="art-footnote-line" /> Private by design <span className="art-footnote-dot">·</span> Ready for the field</div>
        </div>
      </section>
      <section className="login-panel">
        <div className="mobile-login-brand"><Logo className="mobile-login-logo" /><span>Vedhas <b>Tracker</b></span></div>
        <form className="login-form" onSubmit={creating ? onCreateAccount : onLogin}>
          <div className="eyebrow"><span /> {creating ? 'EMPLOYEE REGISTRATION' : 'SECURE SIGN IN'}</div>
          <h2>{creating ? 'Create your account' : 'Welcome back'}</h2>
          <p className="login-intro">{creating ? 'Set up your employee access to Vedhas Tracker.' : 'Sign in with your employee or admin ID.'}</p>
          {!configured && <div className="config-reminder"><strong>Supabase setup needed</strong><span>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to a local <code>.env</code> file, then restart the app.</span></div>}
          {creating && <>
            <label className="field-label login-field-label" htmlFor="create-name">Full name</label>
            <input id="create-name" className="text-input" autoComplete="name" placeholder="Your full name" value={fullName} onChange={(event) => onFullName(event.target.value)} required />
          </>}
          <label className="field-label login-field-label" htmlFor="employee-id">{creating ? 'Employee ID' : 'Employee / admin ID'}</label>
          <input id="employee-id" className="text-input id-input" autoCapitalize="none" autoComplete="username" placeholder={creating ? 'e.g. emp001' : 'e.g. emp001 or admin001'} value={employeeId} onChange={(event) => onEmployeeId(event.target.value)} required />
          {creating && <span className="field-hint">Use the emp001 ID assigned and approved by your administrator. Admin accounts are created separately.</span>}
          <div className="password-label"><label className="field-label" htmlFor="login-password">Password</label>{creating && <span>10+ characters</span>}</div>
          <input id="login-password" className="text-input" type="password" autoComplete={creating ? 'new-password' : 'current-password'} placeholder={creating ? 'Choose a secure password' : 'Enter your password'} value={password} onChange={(event) => onPassword(event.target.value)} minLength={creating ? 10 : undefined} required />
          {!creating && <label className="remember-control"><input type="checkbox" checked={rememberMe} onChange={(event) => onRememberMe(event.target.checked)} /><span className="custom-checkbox"><Icon name="check" size={12} /></span><span>Remember me</span><small>This device</small></label>}
          {error && <div className="form-alert" role="alert">{error}</div>}
          {message && <div className="auth-success-message" role="status">{message}</div>}
          <button className="button button-primary login-submit" type="submit" disabled={submitting || !configured}>
            {submitting ? <><span className="button-spinner" /> {creating ? 'Creating account…' : 'Signing in…'}</> : <>{creating ? 'Create employee account' : 'Sign in'} <Icon name="chevron" size={16} /></>}
          </button>
          <div className="login-security"><span className="security-lock">✓</span> Your customer data is protected by row-level security.</div>
          <div className="auth-switch">{creating ? 'Already have an account?' : 'New employee?'} <button type="button" onClick={() => onModeChange(creating ? 'login' : 'create')}>{creating ? 'Sign in' : 'Create account'}</button></div>
        </form>
        <div className="login-footer">{creating ? 'Employee IDs must be approved by your administrator. Admin accounts are provisioned separately.' : 'Ask your administrator for an approved employee ID or account access.'}</div>
      </section>
    </div>
  )
}

function Dashboard({
  profile,
  admin,
  customers,
  stats,
  loading,
  onAdd,
  onCustomers,
  onExport,
  onOpenCustomer,
}: {
  profile: UserProfile
  admin: boolean
  customers: Customer[]
  stats: { total: number; hotels: number; hospitals: number; schools: number; colleges: number; others: number }
  loading: boolean
  onAdd: () => void
  onCustomers: () => void
  onExport: () => void
  onOpenCustomer: (customer: Customer) => void
}) {
  const metrics = [
    { label: 'Total customers', value: stats.total, icon: 'users', tone: 'blue', note: 'Your customer list' },
    { label: 'Hotels & residency', value: stats.hotels, icon: 'building', tone: 'amber', note: 'Hospitality sector' },
    { label: 'Hospitals', value: stats.hospitals, icon: 'building', tone: 'green', note: 'Healthcare sector' },
    { label: 'Schools', value: stats.schools, icon: 'building', tone: 'purple', note: 'Education sector' },
    { label: 'Colleges', value: stats.colleges, icon: 'building', tone: 'teal', note: 'Higher education' },
    { label: 'Other sectors', value: stats.others, icon: 'building', tone: 'rose', note: 'All other sectors' },
  ] as const

  return (
    <div className="dashboard-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow"><span /> YOUR WORKSPACE</div>
          <h1>{admin ? 'Admin reports' : `Welcome, ${profile.full_name.split(' ')[0]}`}<span className="welcome-period">.</span></h1>
          <p className="page-subtitle">{admin ? 'An overview of customer activity across your sales team.' : 'A clear view of your customer relationships, all in one place.'}</p>
        </div>
        {!admin && <button className="button button-primary add-top-button" onClick={onAdd}><Icon name="plus" size={18} /> Add customer</button>}
      </div>
      <section className="stats-grid" aria-label="Customer totals">
        {metrics.map((metric) => (
          <div key={metric.label} className="stat-card">
            <div className="stat-top"><span>{metric.label}</span><span className={`stat-icon stat-${metric.tone}`}><Icon name={metric.icon} size={17} /></span></div>
            <div className="stat-number">{loading ? <span className="skeleton-number" /> : metric.value}</div>
            <div className="stat-note"><span className={`stat-indicator stat-indicator-${metric.tone}`} />{metric.note}</div>
          </div>
        ))}
      </section>
      <section className="action-row">
        <div className="section-heading-block"><div className="eyebrow"><span /> {admin ? 'REPORTING' : 'QUICK ACTIONS'}</div><h2>{admin ? 'Review team activity' : 'What would you like to do?'}</h2></div>
        <div className={`quick-actions ${admin ? 'quick-actions-admin' : ''}`}>
          {!admin && <button className="quick-action primary-action" onClick={onAdd}>
            <span className="action-icon action-icon-light"><Icon name="plus" size={19} /></span>
            <span className="action-copy"><strong>Add a customer</strong><small>Record a new business contact</small></span>
            <Icon name="chevron" size={17} />
          </button>}
          <button className="quick-action" onClick={onCustomers}>
            <span className="action-icon action-icon-blue"><Icon name="users" size={18} /></span>
            <span className="action-copy"><strong>{admin ? 'View all reports' : 'View my customers'}</strong><small>{admin ? 'Review every employee submission' : 'Search and manage your list'}</small></span>
            <Icon name="chevron" size={17} />
          </button>
          <button className="quick-action" onClick={onExport}>
            <span className="action-icon action-icon-green"><Icon name="download" size={18} /></span>
            <span className="action-copy"><strong>Export data</strong><small>Download a CSV spreadsheet</small></span>
            <Icon name="chevron" size={17} />
          </button>
        </div>
      </section>
      <section className="recent-section">
        <div className="section-title-row">
          <div><div className="eyebrow"><span /> {admin ? 'TEAM ACTIVITY' : 'RECENT ACTIVITY'}</div><h2>{admin ? 'Recent submissions' : 'Recently added'}</h2></div>
          {customers.length > 0 && <button className="text-link" onClick={onCustomers}>{admin ? 'View all reports' : 'View all customers'} <Icon name="chevron" size={15} /></button>}
        </div>
        {loading ? <div className="loading-row"><span className="button-spinner" /> Loading your customers…</div> : customers.length === 0 ? (
          <div className="empty-state compact-empty">
            <span className="empty-icon"><Icon name="users" size={23} /></span>
            <strong>{admin ? 'No submissions yet' : 'Your customer list starts here'}</strong>
            <p>{admin ? 'Employee customer submissions will appear here.' : 'Add your first customer and their details will appear here.'}</p>
            {!admin && <button className="button button-soft" onClick={onAdd}><Icon name="plus" size={16} /> Add your first customer</button>}
          </div>
        ) : (
          <div className="recent-list">
            {customers.slice(0, 5).map((customer) => (
              <button className="recent-item" key={customer.id} onClick={() => onOpenCustomer(customer)}>
                <div className="customer-monogram">{customer.customer_name.slice(0, 1).toUpperCase()}</div>
                <div className="recent-main"><strong>{customer.customer_name}</strong><span>{sectorLabel(customer)}{customer.city ? ` · ${customer.city}` : ''}</span></div>
                <span className="recent-date">{formatDate(customer.created_at)}</span><Icon name="chevron" size={16} />
              </button>
            ))}
          </div>
        )}
      </section>
      <div className="dashboard-note"><span className="note-shield">✓</span><span><strong>{admin ? 'Admin reporting access' : 'Private to your account'}</strong> {admin ? 'You can view all employee submissions. Employees only see their own records.' : 'Only you and workspace admins can view your customer records.'}</span></div>
    </div>
  )
}

function CustomerList({
  customers,
  admin,
  staffNames,
  allCount,
  loading,
  search,
  sectorFilter,
  cityFilter,
  sortBy,
  cities,
  onSearch,
  onSectorFilter,
  onCityFilter,
  onSort,
  onAdd,
  onExport,
  onOpenCustomer,
  onClearFilters,
}: {
  customers: Customer[]
  admin: boolean
  staffNames: Map<string, string>
  allCount: number
  loading: boolean
  search: string
  sectorFilter: string
  cityFilter: string
  sortBy: string
  cities: string[]
  onSearch: (value: string) => void
  onSectorFilter: (value: string) => void
  onCityFilter: (value: string) => void
  onSort: (value: string) => void
  onAdd: () => void
  onExport: () => void
  onOpenCustomer: (customer: Customer) => void
  onClearFilters: () => void
}) {
  const hasFilters = Boolean(search || sectorFilter || cityFilter)
  return (
    <div className="list-page">
      <div className="page-heading-row">
        <div><div className="eyebrow"><span /> {admin ? 'TEAM REPORTS' : 'CUSTOMER DIRECTORY'}</div><h1>{admin ? 'All customer reports' : 'My customers'}</h1><p className="page-subtitle">{admin ? 'Review and export customer records submitted by your employees.' : 'These are the customers you have submitted.'}</p></div>
        <div className="heading-actions"><button className="button button-outline" onClick={onExport}><Icon name="download" size={17} /> Export CSV</button>{!admin && <button className="button button-primary" onClick={onAdd}><Icon name="plus" size={18} /> Add customer</button>}</div>
      </div>
      <section className="list-card">
        <div className="list-toolbar">
          <div className="list-count"><strong>{allCount}</strong> {allCount === 1 ? 'customer' : 'customers'} <span>·</span> {customers.length} shown</div>
          <div className="filter-controls">
            <label className="search-control"><Icon name="search" size={17} /><input aria-label="Search customers" placeholder="Search customers…" value={search} onChange={(event) => onSearch(event.target.value)} />{search && <button aria-label="Clear search" onClick={() => onSearch('')}><Icon name="close" size={14} /></button>}</label>
            <select aria-label="Filter by sector" value={sectorFilter} onChange={(event) => onSectorFilter(event.target.value)}><option value="">All sectors</option>{sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select>
            <select aria-label="Filter by city" value={cityFilter} onChange={(event) => onCityFilter(event.target.value)}><option value="">All cities</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select>
            <select aria-label="Sort customers" value={sortBy} onChange={(event) => onSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option></select>
          </div>
        </div>
        {loading ? <div className="list-loading"><span className="button-spinner" /> Loading customer records…</div> : customers.length === 0 ? (
          <div className="empty-state list-empty">
            <span className="empty-icon"><Icon name={hasFilters ? 'search' : 'users'} size={23} /></span>
            <strong>{hasFilters ? 'No matching customers' : 'No customers yet'}</strong>
            <p>{hasFilters ? 'Try changing your search or filters.' : 'Add a customer to start building your directory.'}</p>
            {hasFilters ? <button className="text-link" onClick={onClearFilters}>Clear filters</button> : <button className="button button-primary" onClick={onAdd}><Icon name="plus" size={17} /> Add customer</button>}
          </div>
        ) : (
          <>
            <div className="table-scroll"><table className="customer-table">
              <thead><tr><th>S.NO.</th>{admin && <th>SALES EMPLOYEE</th>}<th>CUSTOMER NAME</th><th>SECTOR</th><th>POC</th><th>CONTACT NUMBER</th><th>BEAT NO</th><th>AREA</th><th>CITY</th><th>LOCATION</th><th>ROOM COUNT</th><th>STRENGTH</th><th>BRANCHES</th><th>BRANDS</th><th>LITRES / MONTH</th><th>CURRENT PURCHASE</th><th>REMARKS</th><th aria-label="Open" /></tr></thead>
              <tbody>{customers.map((customer) => (
                <tr key={customer.id} onClick={() => onOpenCustomer(customer)}>
                  <td><span className="serial-pill">{customer.serial_number}</span></td>
                  {admin && <td>{staffNames.get(customer.user_id) ?? 'Employee'}</td>}
                  <td><strong className="table-customer-name">{customer.customer_name}</strong></td>
                  <td><span className="sector-pill">{sectorLabel(customer)}</span></td>
                  <td>{customer.poc_name || <span className="muted-dash">—</span>}</td>
                  <td>{customer.contact_number || <span className="muted-dash">—</span>}</td>
                  <td>{customer.beat_no || <span className="muted-dash">—</span>}</td>
                  <td>{customer.area || <span className="muted-dash">—</span>}</td>
                  <td>{customer.city || <span className="muted-dash">—</span>}</td>
                  <td className="table-truncate" title={customer.location ?? ''}>{customer.location || <span className="muted-dash">—</span>}</td>
                  <td>{customer.room_count || <span className="muted-dash">—</span>}</td>
                  <td>{customer.strength || <span className="muted-dash">—</span>}</td>
                  <td>{customer.branches || <span className="muted-dash">—</span>}</td>
                  <td>{customer.brands || <span className="muted-dash">—</span>}</td>
                  <td>{customer.required_litres_per_month ?? <span className="muted-dash">—</span>}</td>
                  <td className="table-truncate" title={customer.current_purchase ?? ''}>{customer.current_purchase || <span className="muted-dash">—</span>}</td>
                  <td className="table-truncate" title={customer.remarks ?? ''}>{customer.remarks || <span className="muted-dash">—</span>}</td>
                  <td><button className="row-open icon-button" aria-label={`View ${customer.customer_name}`}><Icon name="chevron" size={16} /></button></td>
                </tr>
              ))}</tbody>
            </table></div>
            <div className="mobile-customer-list">{customers.map((customer) => (
              <button className="mobile-customer-card" key={customer.id} onClick={() => onOpenCustomer(customer)}>
                <div className="mobile-customer-top"><div className="customer-monogram">{customer.customer_name.slice(0, 1).toUpperCase()}</div><div className="mobile-customer-main"><strong>{customer.customer_name}</strong><span>{sectorLabel(customer)}</span></div><Icon name="chevron" size={17} /></div>
                <div className="mobile-customer-meta"><span>{admin ? (staffNames.get(customer.user_id) ?? 'Employee') : (customer.poc_name || 'No contact')}</span><span>{[customer.city, customer.area].filter(Boolean).join(' · ') || 'Location not added'}</span></div>
              </button>
            ))}</div>
          </>
        )}
      </section>
      <p className="list-footnote"><span className="footnote-lock">✓</span> Showing only customers connected to your account.</p>
    </div>
  )
}

function CustomerForm({
  form,
  editing,
  savedCustomer,
  loading,
  error,
  onChange,
  onSubmit,
  onCancel,
  onAddAnother,
  onViewCustomer,
}: {
  form: FormState
  editing: boolean
  savedCustomer: Customer | null
  loading: boolean
  error: string
  onChange: (form: FormState) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  onAddAnother: () => void
  onViewCustomer: () => void
}) {
  const setField = (key: keyof FormState, value: string) => onChange({ ...form, [key]: value })
  return (
    <div className="form-page">
      <button className="back-link" onClick={onCancel}><Icon name="arrow" size={16} /> Back to customers</button>
      <div className="page-heading-row form-heading">
        <div><div className="eyebrow"><span /> CUSTOMER DETAILS</div><h1>{editing ? 'Edit customer' : 'Add a customer'}</h1><p className="page-subtitle">A few details now make every follow-up easier later.</p></div>
        {editing && <span className="editing-number">S.No. {form.customer_name ? '· Updating record' : ''}</span>}
      </div>
      {savedCustomer ? (
        <section className="save-success-card" role="status">
          <span className="save-success-icon"><Icon name="check" size={21} /></span>
          <div className="save-success-copy"><h2>Customer saved successfully</h2><p><strong>{savedCustomer.customer_name}</strong> is now in your customer list.</p></div>
          <div className="save-success-actions"><button className="button button-outline" onClick={onAddAnother}><Icon name="plus" size={16} /> Add another</button><button className="button button-primary" onClick={onViewCustomer}>View customer <Icon name="chevron" size={15} /></button></div>
        </section>
      ) : (
      <form className="customer-form" onSubmit={onSubmit}>
        <section className="form-section">
          <div className="form-section-heading"><span className="form-step">01</span><div><h2>Business details</h2><p>Who are you visiting?</p></div></div>
          <div className="form-grid">
            <Field label="Customer name" required wide><input autoFocus className="text-input" placeholder="e.g. The Grand Vedhas" value={form.customer_name} onChange={(event) => setField('customer_name', event.target.value)} /></Field>
            <Field label="Sector" required><select className="text-input select-input" value={form.sector} onChange={(event) => setField('sector', event.target.value)}><option value="">Select a sector</option>{sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select></Field>
            {form.sector === 'Others' && <Field label="Other sector" required><input className="text-input" placeholder="Enter sector name" value={form.other_sector} onChange={(event) => setField('other_sector', event.target.value)} /></Field>}
            <Field label="Room count"><input className="text-input" placeholder="e.g. 50, 100+, NA" value={form.room_count} onChange={(event) => setField('room_count', event.target.value)} /></Field>
            <Field label="Strength"><input className="text-input" placeholder="e.g. 500, 250 students" value={form.strength} onChange={(event) => setField('strength', event.target.value)} /></Field>
            <Field label="Branches"><input className="text-input" placeholder="e.g. 1, 5, Multiple branches" value={form.branches} onChange={(event) => setField('branches', event.target.value)} /></Field>
            <Field label="Brands currently used"><input className="text-input" placeholder="e.g. Bisleri, Kinley" value={form.brands} onChange={(event) => setField('brands', event.target.value)} /></Field>
          </div>
        </section>
        <section className="form-section">
          <div className="form-section-heading"><span className="form-step">02</span><div><h2>Point of contact</h2><p>Who should your team speak with?</p></div></div>
          <div className="form-grid">
            <Field label="POC (Point of Contact)"><input className="text-input" placeholder="Contact person's name" value={form.poc_name} onChange={(event) => setField('poc_name', event.target.value)} /></Field>
            <Field label="Contact number"><input className="text-input" type="tel" inputMode="tel" placeholder="Include area code if needed" value={form.contact_number} onChange={(event) => setField('contact_number', event.target.value)} /></Field>
            <Field label="Beat no."><input className="text-input" placeholder="e.g. 01, B01, BEAT-05" value={form.beat_no} onChange={(event) => setField('beat_no', event.target.value)} /></Field>
            <Field label="Current purchase"><input className="text-input" placeholder="e.g. Local supplier, Own plant" value={form.current_purchase} onChange={(event) => setField('current_purchase', event.target.value)} /></Field>
            <Field label="Required litres per month"><div className="input-suffix"><input className="text-input" type="number" min="0" step="any" placeholder="e.g. 1250.5" value={form.required_litres_per_month} onChange={(event) => setField('required_litres_per_month', event.target.value)} /><span>litres</span></div></Field>
          </div>
        </section>
        <section className="form-section">
          <div className="form-section-heading"><span className="form-step">03</span><div><h2>Location & notes</h2><p>Make this visit easy to find later.</p></div></div>
          <div className="form-grid">
            <Field label="Area"><input className="text-input" placeholder="e.g. Indiranagar" value={form.area} onChange={(event) => setField('area', event.target.value)} /></Field>
            <Field label="City"><input className="text-input" placeholder="e.g. Bengaluru" value={form.city} onChange={(event) => setField('city', event.target.value)} /></Field>
            <Field label="Location / address" wide><input className="text-input" placeholder="Street, landmark, building…" value={form.location} onChange={(event) => setField('location', event.target.value)} /></Field>
            <Field label="Remarks" wide><textarea className="text-input textarea-input" rows={4} placeholder="Add useful observations for your next visit…" value={form.remarks} onChange={(event) => setField('remarks', event.target.value)} /></Field>
          </div>
        </section>
        {error && <div className="form-alert form-alert-wide" role="alert">{error}</div>}
        <div className="form-footer"><span><span className="required-star">*</span> Required fields</span><div><button className="button button-outline" type="button" onClick={onCancel}>Cancel</button><button className="button button-primary" type="submit" disabled={loading}>{loading ? <><span className="button-spinner" /> Saving…</> : <><Icon name="check" size={17} /> {editing ? 'Save changes' : 'Save customer'}</>}</button></div></div>
      </form>
      )}
    </div>
  )
}

function Field({
  label,
  required = false,
  wide = false,
  children,
}: {
  label: string
  required?: boolean
  wide?: boolean
  children: ReactNode
}) {
  return <label className={`form-field ${wide ? 'field-wide' : ''}`}><span className="field-label">{label}{required && <span className="required-star"> *</span>}</span>{children}</label>
}

function CustomerDetail({
  customer,
  readOnly,
  createdBy,
  onBack,
  onEdit,
  onDelete,
}: {
  customer: Customer
  readOnly: boolean
  createdBy?: string
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const sections: { title: string; fields: [string, string | number | null][] }[] = [
    {
      title: 'Business details',
      fields: [
        ['Sector', sectorLabel(customer)],
        ['Room count', customer.room_count],
        ['Strength', customer.strength],
        ['Branches', customer.branches],
        ['Brands', customer.brands],
      ],
    },
    {
      title: 'Point of contact',
      fields: [
        ['POC (Point of Contact)', customer.poc_name],
        ['Contact number', customer.contact_number],
        ['Beat no.', customer.beat_no],
        ['Current purchase', customer.current_purchase],
        ['Required litres per month', customer.required_litres_per_month],
      ],
    },
    {
      title: 'Location & notes',
      fields: [
        ['Area', customer.area],
        ['City', customer.city],
        ['Location / address', customer.location],
        ['Remarks', customer.remarks],
      ],
    },
  ]
  return (
    <div className="detail-page">
      <button className="back-link" onClick={onBack}><Icon name="arrow" size={16} /> Back to customers</button>
      <div className="detail-hero">
        <div className="detail-identity"><div className="detail-monogram">{customer.customer_name.slice(0, 1).toUpperCase()}</div><div><div className="eyebrow"><span /> CUSTOMER PROFILE</div><h1>{customer.customer_name}</h1><div className="detail-meta"><span className="sector-pill">{sectorLabel(customer)}</span><span>Added {formatDate(customer.created_at)}</span><span>S.No. {customer.serial_number}</span></div></div></div>
        <div className="detail-actions">{readOnly
          ? <span className="read-only-badge">Read-only report</span>
          : <><button className="button button-outline" onClick={onEdit}><Icon name="edit" size={16} /> Edit</button><button className="button button-danger" onClick={onDelete}><Icon name="trash" size={16} /> Delete</button></>}</div>
      </div>
      <div className="detail-sections">
        {sections.map((section) => (
          <section className="detail-card" key={section.title}><div className="detail-section-title"><h2>{section.title}</h2></div><div className="detail-fields">{section.fields.map(([label, value]) => <div className="detail-field" key={label}><span>{label}</span><strong>{value === null || value === '' ? <span className="muted-dash">Not provided</span> : String(value)}</strong></div>)}</div></section>
        ))}
      </div>
      <div className="detail-updated">{createdBy && <>Submitted by {createdBy} · </>}Last updated {formatDate(customer.updated_at)}</div>
    </div>
  )
}
