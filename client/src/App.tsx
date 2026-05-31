import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CityLanding from "./pages/CityLanding";
import LeadForm from "./pages/LeadForm";
import Dashboard from "./pages/Dashboard";
import LeadDetail from "./pages/LeadDetail";
import ThankYou from "./pages/ThankYou";

function Router() {
  return (
    <Switch>
      {/* Home — city selector hub */}
      <Route path="/" component={Home} />

      {/* City-specific landing pages */}
      <Route path="/naperville" component={() => <CityLanding citySlug="naperville" />} />
      <Route path="/willow-springs" component={() => <CityLanding citySlug="willow-springs" />} />
      <Route path="/sag-bridge" component={() => <CityLanding citySlug="sag-bridge" />} />
      <Route path="/palisades" component={() => <CityLanding citySlug="palisades" />} />

      {/* Multi-step lead capture form */}
      <Route path="/get-inspection" component={LeadForm} />
      <Route path="/get-inspection/:city" component={({ params }) => <LeadForm citySlug={params.city} />} />
      <Route path="/thank-you" component={ThankYou} />

      {/* Admin dashboard */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/leads/:id" component={({ params }) => <LeadDetail leadId={parseInt(params.id)} />} />

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
