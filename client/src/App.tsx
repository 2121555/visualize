import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useParams } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CityLanding from "./pages/CityLanding";
import LeadForm from "./pages/LeadForm";
import Dashboard from "./pages/Dashboard";
import LeadDetail from "./pages/LeadDetail";
import ThankYou from "./pages/ThankYou";
import InspectionMode from "./pages/InspectionMode";

function LeadFormWithCity() {
  const params = useParams<{ city: string }>();
  return <LeadForm citySlug={params.city} />;
}

function LeadDetailWithId() {
  const params = useParams<{ id: string }>();
  return <LeadDetail leadId={parseInt(params.id || "0")} />;
}

function InspectionModeWithId() {
  const params = useParams<{ id: string }>();
  return <InspectionMode leadId={parseInt(params.id || "0")} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      {/* City-specific landing pages */}
      <Route path="/naperville" component={() => <CityLanding citySlug="naperville" />} />
      <Route path="/willow-springs" component={() => <CityLanding citySlug="willow-springs" />} />
      <Route path="/sag-bridge" component={() => <CityLanding citySlug="sag-bridge" />} />
      <Route path="/palisades" component={() => <CityLanding citySlug="palisades" />} />

      {/* Multi-step lead capture form */}
      <Route path="/get-inspection" component={() => <LeadForm />} />
      <Route path="/get-inspection/:city" component={LeadFormWithCity} />
      <Route path="/thank-you" component={ThankYou} />

      {/* Admin dashboard */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/leads/:id" component={LeadDetailWithId} />
      <Route path="/dashboard/inspect/:id" component={InspectionModeWithId} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
