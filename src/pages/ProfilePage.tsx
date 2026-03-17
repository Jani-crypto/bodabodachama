import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Profile from "./Profile";
import Auth from "./Auth";

const ProfilePage = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Auth />;
  return <AppLayout><Profile /></AppLayout>;
};

export default ProfilePage;
