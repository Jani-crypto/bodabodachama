import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, Bell, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const { isLeader, profile } = useAuth();
  const [stats, setStats] = useState({ members: 0, totalContributions: 0, unreadReminders: 0, thisWeek: 0 });
  const [recentContributions, setRecentContributions] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;

      if (isLeader) {
        const [membersRes, contribRes, remindersRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact" }),
          supabase.from("contributions").select("amount"),
          supabase.from("reminders").select("id", { count: "exact" }).eq("is_read", false),
        ]);

        const total = (contribRes.data ?? []).reduce((s, c) => s + Number(c.amount), 0);
        const currentWeek = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000);
        const recentRes = await supabase.from("contributions").select("*, profiles!contributions_member_id_fkey(full_name)").order("created_at", { ascending: false }).limit(5);

        setStats({
          members: membersRes.count ?? 0,
          totalContributions: total,
          unreadReminders: remindersRes.count ?? 0,
          thisWeek: currentWeek,
        });
        setRecentContributions(recentRes.data ?? []);
      } else {
        const [contribRes, remindersRes] = await Promise.all([
          supabase.from("contributions").select("amount").eq("member_id", profile.id),
          supabase.from("reminders").select("id", { count: "exact" }).eq("member_id", profile.id).eq("is_read", false),
        ]);

        const total = (contribRes.data ?? []).reduce((s, c) => s + Number(c.amount), 0);
        const recentRes = await supabase.from("contributions").select("*").eq("member_id", profile.id).order("created_at", { ascending: false }).limit(5);

        setStats({
          members: 0,
          totalContributions: total,
          unreadReminders: remindersRes.count ?? 0,
          thisWeek: 0,
        });
        setRecentContributions(recentRes.data ?? []);
      }
    };
    fetchStats();
  }, [isLeader, profile]);

  const statCards = isLeader
    ? [
        { label: "Total Members", value: stats.members, icon: Users, color: "text-primary" },
        { label: "Total Contributions", value: `KSH ${stats.totalContributions.toLocaleString()}`, icon: Wallet, color: "text-accent" },
        { label: "Pending Reminders", value: stats.unreadReminders, icon: Bell, color: "text-warning" },
        { label: "Current Week", value: `Week ${stats.thisWeek}`, icon: TrendingUp, color: "text-primary" },
      ]
    : [
        { label: "My Total Contributions", value: `KSH ${stats.totalContributions.toLocaleString()}`, icon: Wallet, color: "text-accent" },
        { label: "Unread Reminders", value: stats.unreadReminders, icon: Bell, color: "text-warning" },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {profile?.full_name?.split(" ")[0]}!</h1>
        <p className="text-muted-foreground">Here's your overview for today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Recent Contributions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentContributions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No contributions yet.</p>
          ) : (
            <div className="space-y-3">
              {recentContributions.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">
                      {(c as any).profiles?.full_name ?? "You"}
                    </p>
                    <p className="text-xs text-muted-foreground">Week {c.week_number}, {c.year}</p>
                  </div>
                  <span className="font-semibold text-accent">UGX {Number(c.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
