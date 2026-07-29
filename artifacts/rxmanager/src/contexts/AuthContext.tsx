import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetMe, useLogin, useLogout, useVerifyLoginOtp, useResendLoginOtp, User, LoginInput } from "@workspace/api-client-react";
import { useLocation } from "wouter";

export interface LoginOtpChallenge {
  pendingToken: string;
  otpMethod: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<LoginOtpChallenge | null>;
  verifyOtp: (pendingToken: string, code: string) => Promise<void>;
  resendOtp: (pendingToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("auth_token"));
  const [, setLocation] = useLocation();

  const { data: user, isLoading: isUserLoading, refetch: refetchUser } = useGetMe({
    query: {
      queryKey: ["me", token],
      enabled: !!token,
      retry: false,
    }
  });

  const loginMutation = useLogin();
  const verifyOtpMutation = useVerifyLoginOtp();
  const resendOtpMutation = useResendLoginOtp();
  const logoutMutation = useLogout();

  const applyAuthResult = async (result: { token?: string | null; user: User }) => {
    if (!result.token) return;
    setToken(result.token);
    await refetchUser();

    if (result.user.role === "admin") {
      setLocation("/admin/dashboard");
    } else if (result.user.role === "doctor") {
      setLocation("/doctor/dashboard");
    } else if (result.user.role === "assistant") {
      setLocation("/assistant/dashboard");
    } else if (result.user.role === "patient") {
      setLocation("/patient/dashboard");
    } else if (result.user.role === "driver") {
      setLocation("/driver/dashboard");
    } else {
      setLocation("/");
    }
  };

  useEffect(() => {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }, [token]);

  const login = async (data: LoginInput): Promise<LoginOtpChallenge | null> => {
    try {
      const result = await loginMutation.mutateAsync({ data });
      if (result.requiresOtp && result.pendingToken) {
        return { pendingToken: result.pendingToken, otpMethod: result.otpMethod ?? "email" };
      }
      await applyAuthResult(result as { token: string; user: User });
      return null;
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const verifyOtp = async (pendingToken: string, code: string) => {
    try {
      const result = await verifyOtpMutation.mutateAsync({ data: { pendingToken, code } });
      await applyAuthResult(result as { token: string; user: User });
    } catch (error) {
      console.error("OTP verification failed", error);
      throw error;
    }
  };

  const resendOtp = async (pendingToken: string) => {
    await resendOtpMutation.mutateAsync({ data: { pendingToken } });
  };

  const logout = async () => {
    try {
      if (token) {
        await logoutMutation.mutateAsync();
      }
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setToken(null);
      setLocation("/login");
    }
  };

  const isLoading = isUserLoading && !!token;

  return (
    <AuthContext.Provider value={{ user: user || null, token, isLoading, login, verifyOtp, resendOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
