const ADMIN_AUTH_KEY = 'seb-sans-admin-auth-v1'

export function adminPin() {
  return import.meta.env.VITE_ADMIN_PIN ?? 'sebsans'
}

export function isAdminAuthenticated() {
  return sessionStorage.getItem(ADMIN_AUTH_KEY) === '1'
}

export function loginAdmin(pin: string) {
  if (pin !== adminPin()) return false
  sessionStorage.setItem(ADMIN_AUTH_KEY, '1')
  return true
}

export function logoutAdmin() {
  sessionStorage.removeItem(ADMIN_AUTH_KEY)
}
