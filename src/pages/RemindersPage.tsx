import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Reminders from "./Reminders";
import Auth from "./Auth";

const RemindersPage = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Auth />;
  return <AppLayout><Reminders /></AppLayout>;
};

export default RemindersPage;
