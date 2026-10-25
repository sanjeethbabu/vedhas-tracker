export const sectors = [
  'Hotels & Residency',
  'Hospitals',
  'Schools',
  'Colleges',
  'Café & Restaurants',
  'IT Parks & Offices',
  'Showrooms & services',
  'Institute',
  'Fun Parks',
  'Clubs',
  'Others',
] as const

export type Sector = (typeof sectors)[number]
export type CountType = 'room' | 'floor'

export interface SalesOption {
  id: string
  option_type: 'beat_name' | 'approached_for'
  value: string
}

export interface Customer {
  id: string
  serial_number: number
  user_id: string
  customer_name: string
  sector: Sector
  other_sector: string | null
  poc_name: string | null
  contact_number: string | null
  alternative_poc_name: string | null
  alternative_poc_contact: string | null
  beat_name: string | null
  approached_for: string | null
  area: string | null
  city: string | null
  location: string | null
  room_count: string | null
  count_type: CountType
  strength: string | null
  branches: string | null
  required_litres_per_month: number | null
  current_purchase: string | null
  remarks: string | null
  created_at: string
  updated_at: string
}

export interface UserProfile {
  user_id: string
  employee_id: string
  full_name: string
  role: 'employee' | 'admin'
  created_at: string
}

export type CustomerFormValues = Omit<
  Customer,
  'id' | 'serial_number' | 'user_id' | 'created_at' | 'updated_at'
>

export type Page = 'dashboard' | 'customers' | 'add' | 'detail' | 'settings'
