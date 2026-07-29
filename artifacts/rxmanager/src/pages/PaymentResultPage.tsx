import { Link, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Ban } from "lucide-react";

export default function PaymentResultPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const status = params.get("status") ?? "failed";
  const tranId = params.get("tranId") ?? "";

  const config = {
    success: {
      icon: <CheckCircle2 className="h-12 w-12 text-green-600" />,
      title: "Payment Successful",
      message: "Your subscription payment was received and your subscription has been updated.",
      color: "border-green-200 bg-green-50/50 dark:bg-green-950/20",
    },
    cancelled: {
      icon: <Ban className="h-12 w-12 text-amber-600" />,
      title: "Payment Cancelled",
      message: "You cancelled the payment before it was completed. No charge was made.",
      color: "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20",
    },
    failed: {
      icon: <XCircle className="h-12 w-12 text-destructive" />,
      title: "Payment Failed",
      message: "We couldn't complete this payment. Please try again or contact the admin.",
      color: "border-destructive/30 bg-destructive/5",
    },
  } as const;

  const c = config[(status as keyof typeof config)] ?? config.failed;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <Card className={`max-w-md w-full ${c.color}`}>
        <CardContent className="p-8 flex flex-col items-center text-center gap-4">
          {c.icon}
          <h1 className="text-xl font-bold">{c.title}</h1>
          <p className="text-sm text-muted-foreground">{c.message}</p>
          {tranId && <p className="text-xs text-muted-foreground">Transaction ID: {tranId}</p>}
          <Link href="/doctor/profile">
            <Button className="mt-2">Back to Profile</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
