import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "wouter";

export function ProtectedRoute({ children, role }: { children: ReactNode, role?: "doctor" | "admin" }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (role && user.role !== role) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
