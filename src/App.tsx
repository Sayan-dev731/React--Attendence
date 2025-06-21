import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Attendance from './pages/Attendance';
import Employees from './pages/Employees';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import LoadingSpinner from './components/LoadingSpinner';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login\" replace />;
  }

  return <>{children}</>;
};

// Role-based Route Component
const RoleBasedRoute = ({
  children,
  allowedRoles
}: {
  children: React.ReactNode;
  allowedRoles: string[]
}) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/dashboard\" replace />}
          />
          <Route
            path="/signup"
            element={!user ? <Signup /> : <Navigate to="/dashboard\" replace />}
          />
          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard\" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route
              path="admin"
              element={
                <RoleBasedRoute allowedRoles={['admin', 'hr']}>
                  <AdminDashboard />
                </RoleBasedRoute>
              }
            />
            <Route path="attendance" element={<Attendance />} />
            <Route
              path="employees"
              element={
                <RoleBasedRoute allowedRoles={['admin', 'hr']}>
                  <Employees />
                </RoleBasedRoute>
              }
            />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard\" replace />} />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1B263B',
              color: '#fff',
            },
          }}
        />
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;