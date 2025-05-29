import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Script from './pages/Script'
import Contact from './pages/Contact'
import ProjectDashboard from './pages/ProjectDashboard'
import ScriptBreakdown from './pages/ScriptBreakdown'
import CastList from './pages/CastList'
import Home from './pages/Home'
import CastOptions from './pages/CastOptions'
import Locations from './pages/Locations'
import Scheduling from './pages/Scheduling'
import ManageDates from './pages/ManageDates'
import ManageSchedules from './pages/ManageSchedules'
import CallSheet from './pages/CallSheet'
import CallSheetHome from './pages/CallSheetHome'
import ManageShootDays from './pages/ManageShootDays'
import Crew from './pages/Crew'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import CreateProject from './pages/CreateProject'

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/' || location.pathname === '/signup';

  return (
    <div>
      {!isAuthPage && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/:user" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/:user/create-project" element={<ProtectedRoute><CreateProject /></ProtectedRoute>} />
        <Route path="/:user/:id" element={<ProtectedRoute><ProjectDashboard /></ProtectedRoute>} />
        <Route path="/:user/:id/script" element={<ProtectedRoute><Script /></ProtectedRoute>} />
        <Route path="/:user/:id/script-breakdown" element={<ProtectedRoute><ScriptBreakdown /></ProtectedRoute>} />
        <Route path="/:user/:id/cast-list" element={<ProtectedRoute><CastList /></ProtectedRoute>} />
        <Route path="/:user/:id/cast/:castId/options" element={<ProtectedRoute><CastOptions /></ProtectedRoute>} />
        <Route path="/:user/:id/locations" element={<ProtectedRoute><Locations /></ProtectedRoute>} />
        <Route path="/:user/:id/scheduling" element={<ProtectedRoute><Scheduling /></ProtectedRoute>} />
        <Route path="/:user/:id/manage-dates" element={<ProtectedRoute><ManageDates /></ProtectedRoute>} />
        <Route path="/:user/:id/manage-schedules" element={<ProtectedRoute><ManageSchedules /></ProtectedRoute>} />
        <Route path="/:user/:id/call-sheets" element={<ProtectedRoute><CallSheetHome /></ProtectedRoute>} />
        <Route path="/:user/:id/manage-shoot-days" element={<ProtectedRoute><ManageShootDays /></ProtectedRoute>} />
        <Route path="/:user/:id/dpr" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
        <Route path="/:user/:id/call-sheets/:scheduleName" element={<ProtectedRoute><CallSheet /></ProtectedRoute>} />
        <Route path="/:user/:id/crew" element={<ProtectedRoute><Crew /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App
