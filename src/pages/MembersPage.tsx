import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Members from "./Members";
import Auth from "./Auth";

const MembersPage = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Auth />;
  return <AppLayout><Members /></AppLayout>;
};

export default MembersPage;
