import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar'
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

function App() {
  return (
    <Router>
      <div>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:id" element={<ProjectDashboard />} />
          <Route path="/:id/script" element={<Script />} />
          <Route path="/:id/script-breakdown" element={<ScriptBreakdown />} />
          <Route path="/:id/cast-list" element={<CastList />} />
          <Route path="/:id/cast/:castId/options" element={<CastOptions />} />
          <Route path="/:id/locations" element={<Locations />} />
          <Route path="/:id/scheduling" element={<Scheduling />} />
          <Route path="/:id/manage-dates" element={<ManageDates />} />
          <Route path="/:id/manage-schedules" element={<ManageSchedules />} />
          <Route path="/:id/call-sheets" element={<CallSheetHome />} />
          <Route path="/:id/manage-shoot-days" element={<ManageShootDays />} />
          <Route path="/:id/dpr" element={<Contact />} />
          <Route path="/:id/call-sheets/:scheduleName" element={<CallSheet />} />
          <Route path="/:id/crew" element={<Crew />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
