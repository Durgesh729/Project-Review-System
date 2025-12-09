import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AcademicYearProvider } from './contexts/AcademicYearContext';
import { OfflineSyncProvider } from './contexts/OfflineSyncContext';
import Banner from './components/Banner';
import Footer from './components/Footer';
import Features from './components/Features';
import HODDashboard from './components/HODDashboard';
import Login from './components/Login';
import MenteeDashboard from './components/MenteeDashboard';
import MentorDashboard from './components/MentorDashboard';
import Navbar from './components/Navbar';
import ProjectCoordinatorDashboard from './components/ProjectCoordinatorDashboard';
import Projects from './components/Projects';
import Signup from './components/Signup';
import ReviewPage from './components/ReviewPage';
import ProjectDetails from './components/ProjectDetails';
import About from './components/About';
import Contact from './components/Contact';
import AuthCallback from './components/AuthCallback';
import RoleSelection from './components/RoleSelection';
import EmailVerification from './components/EmailVerification';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardRedirect from './components/DashboardRedirect';

function App() {
  return (
    <AuthProvider>
      <OfflineSyncProvider>
        <Router>
          <AcademicYearProvider>
            <Navbar />
            <Routes>
              <Route path="/" element={<><Banner /><Features /><Footer /></>} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              <Route path="/projects/:id/review" element={<ReviewPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/select-role" element={<RoleSelection />} />
              <Route path="/verify-email" element={<EmailVerification />} />

              {/* Role-based dashboard routes */}
              <Route path="/components/dashboard/mentee" element={
                <ProtectedRoute requiredRole="mentee">
                  <MenteeDashboard />
                </ProtectedRoute>
              } />
              <Route path="/components/dashboard/mentor" element={
                <ProtectedRoute requiredRole="mentor">
                  <MentorDashboard />
                </ProtectedRoute>
              } />
              <Route path="/components/dashboard/hod" element={
                <ProtectedRoute requiredRole="hod">
                  <HODDashboard />
                </ProtectedRoute>
              } />
              <Route path="/components/dashboard/coordinator" element={
                <ProtectedRoute requiredRole="project_coordinator">
                  <ProjectCoordinatorDashboard />
                </ProtectedRoute>
              } />

              {/* Legacy routes for backward compatibility */}
              <Route path="/mentee-dashboard" element={
                <ProtectedRoute requiredRole="mentee">
                  <MenteeDashboard />
                </ProtectedRoute>
              } />
              <Route path="/mentor-dashboard" element={
                <ProtectedRoute requiredRole="mentor">
                  <MentorDashboard />
                </ProtectedRoute>
              } />
              <Route path="/hod-dashboard" element={
                <ProtectedRoute requiredRole="hod">
                  <HODDashboard />
                </ProtectedRoute>
              } />
              <Route path="/project-coordinator-dashboard" element={
                <ProtectedRoute requiredRole="project_coordinator">
                  <ProjectCoordinatorDashboard />
                </ProtectedRoute>
              } />

              {/* Dashboard redirect for authenticated users */}
              <Route path="/dashboard" element={<DashboardRedirect />} />
            </Routes>
          </AcademicYearProvider>
        </Router>
      </OfflineSyncProvider>
    </AuthProvider>
  );
}

export default App;