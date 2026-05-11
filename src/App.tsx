import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { TaskProvider, useTaskContext } from "@/context/TaskContext";
import { TimerProvider } from "@/context/TimerContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Calendar from "./pages/Calendar";
import Exams from "./pages/Exams";
import Assignments from "./pages/Assignments";
import Study from "./pages/Study";
import Friends from "./pages/Friends";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { Component } from "react";

// Error Boundary Component
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }, Error> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">The app encountered an error. Check the console for details.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TaskProvider>
      <TimerProviderWithTaskContext>
        {children}
      </TimerProviderWithTaskContext>
    </TaskProvider>
  );
}

function TimerProviderWithTaskContext({ children }: { children: React.ReactNode }) {
  const { toggleSessionComplete } = useTaskContext();
  
  return (
    <TimerProvider onSessionComplete={toggleSessionComplete}>
      {children}
    </TimerProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const App = () => {
  console.log("App starting...");
  return (
  <ErrorBoundary>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppProviders>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
              <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
              <Route path="/assignments" element={<ProtectedRoute><Assignments /></ProtectedRoute>} />
              <Route path="/study" element={<ProtectedRoute><Study /></ProtectedRoute>} />
              <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppProviders>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ErrorBoundary>
  );
};

export default App;
