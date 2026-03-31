import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Phone, UserPlus, CheckCircle, XCircle } from "lucide-react";

const Members = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", phone: "" });
  const [registering, setRegistering] = useState(false);

  const currentWeek = Math.ceil((((new Date()).getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
  const currentYear = new Date().getFullYear();

  const fetchMembers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("full_name");
    setMembers(data ?? []);
  };

  const fetchContributions = async () => {
    const { data } = await supabase
      .from("contributions")
      .select("member_id, week_number, year")
      .eq("year", currentYear)
      .eq("week_number", Math.floor(currentWeek));
    setContributions(data ?? []);
  };

  const hasPaidCurrentWeek = (memberId: string) => {
    return contributions.some(c => c.member_id === memberId);
  };

  useEffect(() => {
    fetchMembers();
    if (isAdmin) fetchContributions();
  }, [isAdmin]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.full_name, phone: form.phone },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast({ title: "Member registered!", description: `${form.full_name} has been added.` });
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", phone: "" });
      // Refresh after a short delay for profile trigger
      setTimeout(fetchMembers, 1500);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Members ({members.length})</h1>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="w-4 h-4 mr-1" /> Register Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="John Kamau" required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="member@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 700 000000" />
                </div>
                <Button type="submit" className="w-full" disabled={registering}>
                  {registering ? "Registering..." : "Register Member"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m) => (
          <Card key={m.id} className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {m.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{m.full_name}</h3>
                    <Badge variant={m.role === "leader" ? "default" : "secondary"} className="text-xs">
                      {m.role === "leader" ? "Admin" : "Member"}
                    </Badge>
                  </div>
                  {m.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" /> {m.phone}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Members;
