import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FullPageSpinner } from '@/components/ui/Spinner';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import NoAccess from '@/pages/NoAccess';
import ForgotPassword from '@/pages/auth/ForgotPassword';
// Auth pages (eager — son el entry point)
import SignIn from '@/pages/auth/SignIn';
import SignUp from '@/pages/auth/SignUp';

// Dashboard pages (lazy — carga bajo demanda)
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Students = lazy(() => import('@/pages/Students'));
const Teachers = lazy(() => import('@/pages/Teachers'));
const Classes = lazy(() => import('@/pages/Classes'));
const MonthlyAttendance = lazy(() => import('@/pages/MonthlyAttendance'));
const ClassAttendance = lazy(() => import('@/pages/ClassAttendance'));
const MyClasses = lazy(() => import('@/pages/MyClasses'));
const Payouts = lazy(() => import('@/pages/Payouts'));
const Payments = lazy(() => import('@/pages/Payments'));
const Plans = lazy(() => import('@/pages/Plans'));
const Reports = lazy(() => import('@/pages/Reports'));
const VideoLibrary = lazy(() => import('@/pages/VideoLibrary'));
const Account = lazy(() => import('@/pages/Account'));

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

          {/* ── Dashboard (protegido) ────────────────────────── */}
          <Route element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/attendance" element={<MonthlyAttendance />} />
            <Route path="/class-attendance" element={<ClassAttendance />} />
            <Route path="/my-classes" element={<MyClasses />} />
            <Route path="/payouts" element={<Payouts />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/video-library" element={<VideoLibrary />} />
            <Route path="/account" element={<Account />} />
          </Route>

          {/* ── Fallback ─────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
