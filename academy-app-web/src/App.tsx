import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import AuthLayout from '@/layouts/AuthLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FullPageSpinner } from '@/components/ui/Spinner';

// Auth pages (eager — son el entry point)
import SignIn from '@/pages/auth/SignIn';
import SignUp from '@/pages/auth/SignUp';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import NoAccess from '@/pages/NoAccess';

// Dashboard pages (lazy — carga bajo demanda)
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Students = lazy(() => import('@/pages/Students'));
const Teachers = lazy(() => import('@/pages/Teachers'));
const Classes = lazy(() => import('@/pages/Classes'));
const Payments = lazy(() => import('@/pages/Payments'));
const Plans = lazy(() => import('@/pages/Plans'));
const Reports = lazy(() => import('@/pages/Reports'));
const VideoLibrary = lazy(() => import('@/pages/VideoLibrary'));
const Scanner = lazy(() => import('@/pages/Scanner'));
const Settings = lazy(() => import('@/pages/Settings'));

export default function App() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        {/* ── Auth ─────────────────────────────────────────── */}
        <Route element={<AuthLayout />}>
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* ── No access ────────────────────────────────────── */}
        <Route path="/no-access" element={<NoAccess />} />

        {/* ── Scanner (layout propio) ───────────────────────── */}
        <Route path="/teacher/scanner" element={<Scanner />} />

        {/* ── Dashboard (protegido) ────────────────────────── */}
        <Route element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/video-library" element={<VideoLibrary />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* ── Fallback ─────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}
