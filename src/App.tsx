import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { SurveyPage } from './survey/SurveyPage'

const DashboardPage = lazy(() => import('./dashboard/DashboardPage'))

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/survey" replace />} />
      <Route path="/survey" element={<SurveyPage />} />
      <Route
        path="/dashboard"
        element={
          <Suspense fallback={<main className="centered-page">Opening dashboard…</main>}>
            <DashboardPage />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/survey" replace />} />
    </Routes>
  )
}
