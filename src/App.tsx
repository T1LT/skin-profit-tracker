import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { SettingsProvider } from './providers/SettingsProvider'
import { ToastProvider } from './providers/ToastProvider'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Purchases from './pages/Purchases'
import Sales from './pages/Sales'
import Statistics from './pages/Statistics'
import SettingsPage from './pages/Settings'

export function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="purchases" element={<Purchases />} />
              <Route path="sales" element={<Sales />} />
              <Route path="statistics" element={<Statistics />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </ToastProvider>
    </SettingsProvider>
  )
}
