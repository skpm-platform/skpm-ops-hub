import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense } from "react";

const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Members = lazy(() => import("./pages/Members"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Finance = lazy(() => import("./pages/Finance"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Documents = lazy(() => import("./pages/Documents"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const Projects = lazy(() => import("./pages/Projects"));
const Clients = lazy(() => import("./pages/Clients"));
const WorkOrders = lazy(() => import("./pages/WorkOrders"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const Quotations = lazy(() => import("./pages/Quotations"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Expenses = lazy(() => import("./pages/Expenses"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Employees = lazy(() => import("./pages/Employees"));
const Manpower = lazy(() => import("./pages/Manpower"));
const Payroll = lazy(() => import("./pages/Payroll"));
const Assets = lazy(() => import("./pages/Assets"));
const Warehouse = lazy(() => import("./pages/Warehouse"));
const HSE = lazy(() => import("./pages/HSE"));
const Training = lazy(() => import("./pages/Training"));
const Facilities = lazy(() => import("./pages/Facilities"));
const Sites = lazy(() => import("./pages/Sites"));
const Accommodation = lazy(() => import("./pages/Accommodation"));
const Transport = lazy(() => import("./pages/Transport"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Reports = lazy(() => import("./pages/Reports"));
const VisitorLog = lazy(() => import("./pages/VisitorLog"));
const Helpdesk = lazy(() => import("./pages/Helpdesk"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const LeaveManagement = lazy(() => import("./pages/LeaveManagement"));
const Requisitions2 = lazy(() => import("./pages/Requisitions"));
const Deployments = lazy(() => import("./pages/Deployments"));
const GatePasses = lazy(() => import("./pages/GatePasses"));
const Timesheets = lazy(() => import("./pages/Timesheets"));
const DutyRoster = lazy(() => import("./pages/DutyRoster"));
const MPBilling = lazy(() => import("./pages/MPBilling"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const Loading = () => <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="my-profile" element={<MyProfile />} />
                <Route path="projects" element={<Projects />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="work-orders" element={<WorkOrders />} />
                <Route path="maintenance" element={<Maintenance />} />
                <Route path="finance" element={<Finance />} />
                <Route path="quotations" element={<Quotations />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="purchase-orders" element={<PurchaseOrders />} />
                <Route path="clients" element={<Clients />} />
                <Route path="contracts" element={<Contracts />} />
                <Route path="employees" element={<Employees />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="manpower" element={<Manpower />} />
                <Route path="leave" element={<LeaveManagement />} />
                <Route path="requisitions" element={<Requisitions2 />} />
                <Route path="deployments" element={<Deployments />} />
                <Route path="payroll" element={<Payroll />} />
                <Route path="timesheets" element={<Timesheets />} />
                <Route path="duty-roster" element={<DutyRoster />} />
                <Route path="gate-passes" element={<GatePasses />} />
                <Route path="mp-billing" element={<MPBilling />} />
                <Route path="assets" element={<Assets />} />
                <Route path="warehouse" element={<Warehouse />} />
                <Route path="hse" element={<HSE />} />
                <Route path="training" element={<Training />} />
                <Route path="facilities" element={<Facilities />} />
                <Route path="sites" element={<Sites />} />
                <Route path="accommodation" element={<Accommodation />} />
                <Route path="transport" element={<Transport />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="announcements" element={<Announcements />} />
                <Route path="documents" element={<Documents />} />
                <Route path="reports" element={<Reports />} />
                <Route path="visitor-log" element={<VisitorLog />} />
                <Route path="helpdesk" element={<Helpdesk />} />
                <Route path="members" element={<Members />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
