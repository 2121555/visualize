import { Link } from "wouter";
import { CheckCircle, Clock, Phone, Shield } from "lucide-react";
import { CLAIM_DEADLINE } from "../../../shared/stormData";

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center animate-fade-in-up">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <h1 className="font-display text-3xl font-bold text-foreground mb-3">
          You're All Set!
        </h1>

        <p className="text-muted-foreground mb-6">
          Your free storm inspection request has been submitted. We'll reach out within 24 hours to schedule your appointment.
        </p>

        <div className="bg-white border border-border rounded-xl p-5 mb-6 text-left space-y-3">
          <h3 className="font-semibold text-foreground text-sm">What happens next:</h3>
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              We'll call or text you at your preferred time to schedule a free, no-obligation roof inspection.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              A licensed inspector will document any hail damage with photos and measurements.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              If damage is found, we'll help you file your insurance claim before the <strong>{CLAIM_DEADLINE}</strong> deadline.
            </p>
          </div>
        </div>

        <Link href="/">
          <span className="text-sm text-primary font-medium hover:underline cursor-pointer">
            ← Back to Home
          </span>
        </Link>
      </div>
    </div>
  );
}
