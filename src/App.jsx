import { HashRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProjectHeader from "./components/ProjectHeader";
import ProtectedRoute from "./components/ProtectedRoute";
import Script from "./pages/Script";
import Contact from "./pages/Contact";
import ProjectDashboard from "./pages/ProjectDashboard";
import ScriptBreakdown from "./pages/ScriptBreakdown";
import ScriptBreakdownNew from "./pages/ScriptBreakdownNew";
import CastList from "./pages/CastList";
import Home from "./pages/Home";
import OrganizationDashboard from "./pages/OrganizationDashboard";
import CastOptions from "./pages/CastOptions";
import Locations from "./pages/Locations";
import Scheduling from "./pages/Scheduling";
import ManageDates from "./pages/ManageDates";
import ManageSchedules from "./pages/ManageSchedules";
import CallSheet from "./pages/CallSheet";
import CallSheetHome from "./pages/CallSheetHome";
import ManageShootDays from "./pages/ManageShootDays";
import Crew from "./pages/Crew";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import CreateProject from "./pages/CreateProject";
import CreateOrganization from "./pages/CreateOrganization";
import ForgotPassword from "./pages/ForgotPassword";
import ProjectLayout from "./components/ProjectLayout";
import UserSettings from "./pages/UserSettings";
import ProjectSettingsDashboard from "./pages/ProjectSettingsDashboard";

function AppContent() {
	const location = useLocation();
	const isAuthPage = location.pathname === "/" || location.pathname === "/signup";

	// Check if we're in a project route (pattern: /:user/:id/*)
	const pathParts = location.pathname.split("/").filter((part) => part);
	const isProjectPage =
		pathParts.length >= 2 && pathParts[1] && !["organizations", "create-project", "create-organization", "settings"].includes(pathParts[1]);

	return (
		<div>
			{!isAuthPage && !isProjectPage && <Navbar />}
			<Routes>
				<Route path="/" element={<Login />} />
				<Route path="/signup" element={<SignUp />} />
				<Route path="/forgot-password" element={<ForgotPassword />} />
				<Route
					path="/:user"
					element={
						<ProtectedRoute>
							<Home />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/:user/organizations/:organizationid"
					element={
						<ProtectedRoute>
							<OrganizationDashboard />
						</ProtectedRoute>
					}
				/>
				{/* <Route
					path="/:user/organizations/:organizationid/members"
					element={
						<ProtectedRoute>
							<OrgMembersPage />
						</ProtectedRoute>
					}
				/> */}
				<Route
					path="/:user/settings"
					element={
						<ProtectedRoute>
							<UserSettings />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/:user/create-project"
					element={
						<ProtectedRoute>
							<CreateProject />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/:user/create-organization"
					element={
						<ProtectedRoute>
							<CreateOrganization />
						</ProtectedRoute>
					}
				/>
				<Route path="/:user/:id" element={<ProjectLayout />}>
					<Route index element={<ProjectDashboard />} />

					<Route
						path="script"
						element={
							<ProtectedRoute>
								<Script />
							</ProtectedRoute>
						}
					/>

					<Route
						path="script-breakdown"
						element={
							<ProtectedRoute>
								<ScriptBreakdownNew />
							</ProtectedRoute>
						}
					/>
					<Route
						path="cast-list"
						element={
							<ProtectedRoute>
								<CastList />
							</ProtectedRoute>
						}
					/>
					<Route
						path="cast/:castId/options"
						element={
							<ProtectedRoute>
								<CastOptions />
							</ProtectedRoute>
						}
					/>
					<Route
						path="locations"
						element={
							<ProtectedRoute>
								<Locations />
							</ProtectedRoute>
						}
					/>
					<Route
						path="scheduling"
						element={
							<ProtectedRoute>
								<Scheduling />
							</ProtectedRoute>
						}
					/>
					<Route
						path="manage-dates"
						element={
							<ProtectedRoute>
								<ManageDates />
							</ProtectedRoute>
						}
					/>
					<Route
						path="scheduling/:scheduleId"
						element={
							<ProtectedRoute>
								<ManageSchedules />
							</ProtectedRoute>
						}
					/>
					<Route
						path="call-sheets"
						element={
							<ProtectedRoute>
								<CallSheetHome />
							</ProtectedRoute>
						}
					/>
					<Route
						path="settings"
						element={
							<ProtectedRoute>
								<ProjectSettingsDashboard />
							</ProtectedRoute>
						}
					/>
					<Route
						path="manage-shoot-days"
						element={
							<ProtectedRoute>
								<ManageShootDays />
							</ProtectedRoute>
						}
					/>
					<Route
						path="dpr"
						element={
							<ProtectedRoute>
								<Contact />
							</ProtectedRoute>
						}
					/>
					<Route
						path="call-sheets/:scheduleName"
						element={
							<ProtectedRoute>
								<CallSheet />
							</ProtectedRoute>
						}
					/>
					<Route
						path="crew"
						element={
							<ProtectedRoute>
								<Crew />
							</ProtectedRoute>
						}
					/>
				</Route>
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

export default App;
