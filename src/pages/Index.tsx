import { AppLayout } from "@/components/layout/AppLayout";
import { StaffHome } from "@/components/dashboard/StaffHome";
import { ManagerHome } from "@/components/dashboard/ManagerHome";
import { AdminHome } from "@/components/dashboard/AdminHome";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { getRoleLevel } from "@/lib/roles";

// Lazy-load the heavy admin desktop dashboard
import { lazy, Suspense } from "react";
const AdminDesktopDashboard = lazy(() => import("@/components/dashboard/AdminDesktopDashboard"));

const Index = () => {
  const { role } = useAuth();
  const isMobile = useIsMobile();
  const userLevel = getRoleLevel(role);

  const isAdmin = userLevel >= getRoleLevel("admin");
  const isManager = userLevel >= getRoleLevel("manager");

  // Mobile: role-specific home screens
  if (isMobile) {
    if (isAdmin) {
      return <AppLayout><AdminHome /></AppLayout>;
    }
    if (isManager) {
      return <AppLayout><ManagerHome /></AppLayout>;
    }
    return <AppLayout><StaffHome /></AppLayout>;
  }

  // Desktop: full admin dashboard for admin/manager, staff home for staff
  if (isAdmin || isManager) {
    return (
      <Suspense fallback={<AppLayout><div className="p-8 text-muted-foreground">Loading...</div></AppLayout>}>
        <AdminDesktopDashboard />
      </Suspense>
    );
  }

  return <AppLayout><StaffHome /></AppLayout>;
};

export default Index;
