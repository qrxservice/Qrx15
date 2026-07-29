import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeColorInjector } from "@/components/ThemeColorInjector";
import { useGetAppSettings } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import BlogListPage from "@/pages/BlogListPage";
import BlogPostPage from "@/pages/BlogPostPage";
import DoctorsPage from "@/pages/DoctorsPage";
import DoctorDetailPage from "@/pages/DoctorDetailPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DoctorRegisterPage from "@/pages/DoctorRegisterPage";
import TrackQueuePage from "@/pages/TrackQueuePage";
import QueueDisplayPage from "@/pages/QueueDisplayPage";
import DisplayPage from "@/pages/DisplayPage";
import VerifyPrescriptionPage from "@/pages/VerifyPrescriptionPage";
import ShopPage from "@/pages/ShopPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import CartPage from "@/pages/CartPage";
import MyOrdersPage from "@/pages/MyOrdersPage";
import DoctorDashboardPage from "@/pages/doctor/DoctorDashboardPage";
import DoctorAppointmentsPage from "@/pages/doctor/DoctorAppointmentsPage";
import DoctorQueuePage from "@/pages/doctor/DoctorQueuePage";
import NewPrescriptionPage from "@/pages/doctor/NewPrescriptionPage";
import DoctorPatientsPage from "@/pages/doctor/DoctorPatientsPage";
import DoctorProfilePage from "@/pages/doctor/DoctorProfilePage";
import DoctorImportPage from "@/pages/doctor/DoctorImportPage";
import DoctorQueueDevicesPage from "@/pages/doctor/DoctorQueueDevicesPage";
import DoctorNoticesPage from "@/pages/doctor/DoctorNoticesPage";
import DoctorAvailabilityPage from "@/pages/doctor/DoctorAvailabilityPage";
import DoctorNetworkPage from "@/pages/doctor/DoctorNetworkPage";
import DoctorReferralsPage from "@/pages/doctor/DoctorReferralsPage";
import DoctorConsultationsPage from "@/pages/doctor/DoctorConsultationsPage";
import DoctorChatPage from "@/pages/doctor/DoctorChatPage";
import DoctorAssistantsPage from "@/pages/doctor/DoctorAssistantsPage";
import AssistantHomePage from "@/pages/assistant/AssistantHomePage";
import AssistantDashboardPage from "@/pages/assistant/AssistantDashboardPage";
import AssistantQueuePage from "@/pages/assistant/AssistantQueuePage";
import AssistantSettingsPage from "@/pages/assistant/AssistantSettingsPage";
import AssistantPatientsPage from "@/pages/assistant/AssistantPatientsPage";
import AssistantPrescriptionsPage from "@/pages/assistant/AssistantPrescriptionsPage";
import AssistantMessagesPage from "@/pages/assistant/AssistantMessagesPage";
import AssistantReportsPage from "@/pages/assistant/AssistantReportsPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminDoctorsPage from "@/pages/admin/AdminDoctorsPage";
import AdminPendingDoctorsPage from "@/pages/admin/AdminPendingDoctorsPage";
import AdminSubscriptionsPage from "@/pages/admin/AdminSubscriptionsPage";
import AdminReviewsPage from "@/pages/admin/AdminReviewsPage";
import AdminEmailLogsPage from "@/pages/admin/AdminEmailLogsPage";
import AdminAppointmentsPage from "@/pages/admin/AdminAppointmentsPage";
import AdminDonationsPage from "@/pages/admin/AdminDonationsPage";
import AdminDepartmentsPage from "@/pages/admin/AdminDepartmentsPage";
import AdminCountriesPage from "@/pages/admin/AdminCountriesPage";
import AdminBannersPage from "@/pages/admin/AdminBannersPage";
import AdminSlidersPage from "@/pages/admin/AdminSlidersPage";
import AdminVideoPromotionsPage from "@/pages/admin/AdminVideoPromotionsPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import AdminPaymentGatewaysPage from "@/pages/admin/AdminPaymentGatewaysPage";
import AdminMedicinesPage from "@/pages/admin/AdminMedicinesPage";
import AdminHubPage from "@/pages/admin/AdminHubPage";
import AdminAdvertisementsPage from "@/pages/admin/AdminAdvertisementsPage";
import AdminPrescriptionsPage from "@/pages/admin/AdminPrescriptionsPage";
import AdminAuditLogsPage from "@/pages/admin/AdminAuditLogsPage";
import AdminDisplaysPage from "@/pages/admin/AdminDisplaysPage";
import AdminPatientTimelinePage from "@/pages/admin/AdminPatientTimelinePage";
import AdminMigrationsPage from "@/pages/admin/AdminMigrationsPage";
import AdminBlogPage from "@/pages/admin/AdminBlogPage";
import AdminMenuPage from "@/pages/admin/AdminMenuPage";
import AdminCalculatorsPage from "@/pages/admin/AdminCalculatorsPage";
import AdminShopPage from "@/pages/admin/AdminShopPage";
import AdminToolsPage from "@/pages/admin/AdminToolsPage";
import AdminEmergencyContactsPage from "@/pages/admin/AdminEmergencyContactsPage";
import DoctorToolsPage from "@/pages/doctor/DoctorToolsPage";
import DoctorToolViewPage from "@/pages/doctor/DoctorToolViewPage";
import PaymentResultPage from "@/pages/PaymentResultPage";
import TrackOrderPage from "@/pages/TrackOrderPage";
import ToolsPage from "@/pages/ToolsPage";
import EmergencyContactsPage from "@/pages/EmergencyContactsPage";

import ToolsCalculatorPage from "@/pages/ToolsCalculatorPage";
import PatientDashboardPage from "@/pages/patient/PatientDashboardPage";
import PatientAppointmentsPage from "@/pages/patient/PatientAppointmentsPage";
import PatientPrescriptionsPage from "@/pages/patient/PatientPrescriptionsPage";
import PatientProfilePage from "@/pages/patient/PatientProfilePage";
import PatientOrdersPage from "@/pages/patient/PatientOrdersPage";
import PatientAddressesPage from "@/pages/patient/PatientAddressesPage";
import PatientNotificationsPage from "@/pages/patient/PatientNotificationsPage";
import PatientWishlistPage from "@/pages/patient/PatientWishlistPage";
import PatientBloodRequestsPage from "@/pages/patient/PatientBloodRequestsPage";
import BloodDonorsPage from "@/pages/BloodDonorsPage";
import AdminBloodDonorsPage from "@/pages/admin/AdminBloodDonorsPage";
import AdminAmbulancePage from "@/pages/admin/AdminAmbulancePage";
import AmbulancePage from "@/pages/AmbulancePage";
import DriverRegisterPage from "@/pages/driver/DriverRegisterPage";
import DriverPendingPage from "@/pages/driver/DriverPendingPage";
import DriverDashboardPage from "@/pages/driver/DriverDashboardPage";
import DriverTripsPage from "@/pages/driver/DriverTripsPage";
import DriverProfilePage from "@/pages/driver/DriverProfilePage";
import DriverEarningsPage from "@/pages/driver/DriverEarningsPage";
import DriverRatingsPage from "@/pages/driver/DriverRatingsPage";
import DriverDocumentsPage from "@/pages/driver/DriverDocumentsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ShopGuard({ component: Component }: { component: React.ComponentType }) {
  const { data: appSettings, isLoading } = useGetAppSettings();
  // While loading, show nothing briefly; if settings fail to load, default to allowing shop
  if (isLoading) return null;
  if (appSettings?.shopEnabled === false) return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={HomePage} />
      <Route path="/doctors" component={DoctorsPage} />
      <Route path="/doctors/:id" component={DoctorDetailPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/doctor-register" component={DoctorRegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/track" component={TrackQueuePage} />
      <Route path="/payment-result" component={PaymentResultPage} />
      <Route path="/queue-display" component={QueueDisplayPage} />
      <Route path="/display/:deviceId" component={DisplayPage} />
      <Route path="/verify/:ref" component={VerifyPrescriptionPage} />
      <Route path="/blog" component={BlogListPage} />
      <Route path="/emergency" component={EmergencyContactsPage} />
      <Route path="/blood-donors" component={BloodDonorsPage} />
      <Route path="/blog/:slug" component={BlogPostPage} />

      {/* Shop — guarded by shopEnabled setting */}
      <Route path="/shop">{() => <ShopGuard component={ShopPage} />}</Route>
      <Route path="/shop/cart">{() => <ShopGuard component={CartPage} />}</Route>
      <Route path="/shop/orders">{() => <ShopGuard component={MyOrdersPage} />}</Route>
      <Route path="/shop/:id">{() => <ShopGuard component={ProductDetailPage} />}</Route>
      <Route path="/track-order" component={TrackOrderPage} />

      {/* Doctor Dashboard */}
      <Route path="/doctor/dashboard" component={DoctorDashboardPage} />
      <Route path="/doctor/appointments" component={DoctorAppointmentsPage} />
      <Route path="/doctor/queue" component={DoctorQueuePage} />
      <Route path="/doctor/new-prescription" component={NewPrescriptionPage} />
      <Route path="/doctor/notices" component={DoctorNoticesPage} />
      <Route path="/doctor/availability" component={DoctorAvailabilityPage} />
      <Route path="/doctor/friends" component={DoctorNetworkPage} />
      <Route path="/doctor/network" component={DoctorNetworkPage} />
      <Route path="/doctor/referrals" component={DoctorReferralsPage} />
      <Route path="/doctor/consultations" component={DoctorConsultationsPage} />
      <Route path="/doctor/chat" component={DoctorChatPage} />
      <Route path="/doctor/patients" component={DoctorPatientsPage} />
      <Route path="/doctor/assistants" component={DoctorAssistantsPage} />
      <Route path="/doctor/profile" component={DoctorProfilePage} />
      <Route path="/doctor/import" component={DoctorImportPage} />
      <Route path="/doctor/queue-devices" component={DoctorQueueDevicesPage} />
      <Route path="/doctor/tools/:slug" component={DoctorToolViewPage} />
      <Route path="/doctor/tools" component={DoctorToolsPage} />

      {/* Assistant Portal */}
      <Route path="/assistant/dashboard" component={AssistantHomePage} />
      <Route path="/assistant/appointments" component={AssistantDashboardPage} />
      <Route path="/assistant/queue" component={AssistantQueuePage} />
      <Route path="/assistant/patients" component={AssistantPatientsPage} />
      <Route path="/assistant/prescriptions" component={AssistantPrescriptionsPage} />
      <Route path="/assistant/reports" component={AssistantReportsPage} />
      <Route path="/assistant/messages" component={AssistantMessagesPage} />
      <Route path="/assistant/settings" component={AssistantSettingsPage} />
      <Route path="/assistant/profile" component={AssistantSettingsPage} />

      {/* Admin Panel */}
      <Route path="/admin" component={AdminHubPage} />
      <Route path="/admin/hub" component={AdminHubPage} />
      <Route path="/admin/dashboard" component={AdminDashboardPage} />
      <Route path="/admin/doctors" component={AdminDoctorsPage} />
      <Route path="/admin/pending-doctors" component={AdminPendingDoctorsPage} />
      <Route path="/admin/subscriptions" component={AdminSubscriptionsPage} />
      <Route path="/admin/medicines" component={AdminMedicinesPage} />
      <Route path="/admin/reviews" component={AdminReviewsPage} />
      <Route path="/admin/email-logs" component={AdminEmailLogsPage} />
      <Route path="/admin/sms-logs" component={AdminEmailLogsPage} />
      <Route path="/admin/appointments" component={AdminAppointmentsPage} />
      <Route path="/admin/donations" component={AdminDonationsPage} />
      <Route path="/admin/departments" component={AdminDepartmentsPage} />
      <Route path="/admin/specialties" component={AdminDepartmentsPage} />
      <Route path="/admin/locations" component={AdminCountriesPage} />
      <Route path="/admin/banners" component={AdminBannersPage} />
      <Route path="/admin/sliders" component={AdminSlidersPage} />
      <Route path="/admin/video-promotions" component={AdminVideoPromotionsPage} />
      <Route path="/admin/advertisements" component={AdminAdvertisementsPage} />
      <Route path="/admin/prescriptions" component={AdminPrescriptionsPage} />
      <Route path="/admin/patient-timeline" component={AdminPatientTimelinePage} />
      <Route path="/admin/migrations" component={AdminMigrationsPage} />
      <Route path="/admin/audit-logs" component={AdminAuditLogsPage} />
      <Route path="/admin/displays" component={AdminDisplaysPage} />
      <Route path="/admin/settings" component={AdminSettingsPage} />
      <Route path="/admin/payment-gateways" component={AdminPaymentGatewaysPage} />
      <Route path="/admin/blog" component={AdminBlogPage} />
      <Route path="/admin/menu-links" component={AdminMenuPage} />
      <Route path="/admin/calculators" component={AdminCalculatorsPage} />
      <Route path="/admin/shop" component={AdminShopPage} />
      <Route path="/admin/tools" component={AdminToolsPage} />
      <Route path="/admin/emergency-contacts" component={AdminEmergencyContactsPage} />
      <Route path="/admin/blood-donors" component={AdminBloodDonorsPage} />
      <Route path="/admin/ambulance" component={AdminAmbulancePage} />

      {/* Patient Portal */}
      <Route path="/patient/dashboard" component={PatientDashboardPage} />
      <Route path="/patient/appointments" component={PatientAppointmentsPage} />
      <Route path="/patient/prescriptions" component={PatientPrescriptionsPage} />
      <Route path="/patient/profile" component={PatientProfilePage} />
      <Route path="/patient/orders" component={PatientOrdersPage} />
      <Route path="/patient/addresses" component={PatientAddressesPage} />
      <Route path="/patient/notifications" component={PatientNotificationsPage} />
      <Route path="/patient/wishlist" component={PatientWishlistPage} />
      <Route path="/patient/blood-requests" component={PatientBloodRequestsPage} />

      {/* Ambulance Service */}
      <Route path="/ambulance" component={AmbulancePage} />

      {/* Driver Portal */}
      <Route path="/driver/register" component={DriverRegisterPage} />
      <Route path="/driver/pending" component={DriverPendingPage} />
      <Route path="/driver/dashboard" component={DriverDashboardPage} />
      <Route path="/driver/trips" component={DriverTripsPage} />
      <Route path="/driver/earnings" component={DriverEarningsPage} />
      <Route path="/driver/ratings" component={DriverRatingsPage} />
      <Route path="/driver/documents" component={DriverDocumentsPage} />
      <Route path="/driver/profile" component={DriverProfilePage} />

      {/* Public Tools */}
      <Route path="/tools" component={ToolsPage} />
      <Route path="/tools/:slug" component={ToolsCalculatorPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <ThemeColorInjector />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AuthProvider>
                <Router />
              </AuthProvider>
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
