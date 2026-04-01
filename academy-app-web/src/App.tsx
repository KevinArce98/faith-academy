import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import AuthLayout from '@/layouts/AuthLayout';
import { StudioCssVars } from '@/components/layout/StudioCssVars';

// Auth pages
import SignIn from '@/pages/auth/SignIn';
import SignUp from '@/pages/auth/SignUp';
import ForgotPassword from '@/pages/auth/ForgotPassword';

// Dashboard pages (Fase 4)
import Dashboard from '@/pages/Dashboard';
import Students from '@/pages/Students';
import Teachers from '@/pages/Teachers';
import Classes from '@/pages/Classes';
import Payments from '@/pages/Payments';
import Plans from '@/pages/Plans';
import Reports from '@/pages/Reports';
import VideoLibrary from '@/pages/VideoLibrary';
import Scanner from '@/pages/Scanner';
import NoAccess from '@/pages/NoAccess';

export default function App() {
  return (
    <>
      <StudioCssVars />
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
        </Route>

        {/* ── Fallback ─────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
