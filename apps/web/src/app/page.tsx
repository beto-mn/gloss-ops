import { RequireGuest } from '@/components/auth/require-guest'

export default function Home() {
  return <RequireGuest>{null}</RequireGuest>
}
