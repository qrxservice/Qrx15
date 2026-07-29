import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Ambulance } from "lucide-react";

export default function DriverPendingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 p-3 bg-orange-100 rounded-full w-fit">
            <Ambulance className="h-8 w-8 text-orange-500" />
          </div>
          <CardTitle>Application Under Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-orange-600">
            <Clock className="h-5 w-5 animate-pulse" />
            <span className="font-medium">Pending Admin Approval</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Your ambulance driver application has been submitted. Our admin team will review
            your documents and approve your account within 24–48 hours.
          </p>
          <p className="text-muted-foreground text-sm">
            You'll receive a notification once your account is approved or if additional
            information is needed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
