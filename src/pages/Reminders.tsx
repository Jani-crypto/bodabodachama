import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Check, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Reminders = () => {
  const { isLeader, profile } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ member_id: "", week_number: "", message: "" });

  const fetchReminders = async () => {
    if (!profile) return;
    let query = supabase.from("reminders").select("*, profiles!reminders_member_id_fkey(full_name)").order("created_at", { ascending: false });
    if (!isLeader) {
      query = query.eq("member_id", profile.id);
    }
    const { data } = await query;
    setReminders(data ?? []);
  };

  useEffect(() => {
    fetchReminders();
    if (isLeader) {
      supabase.from("profiles").select("id, full_name").then(({ data }) => setMembers(data ?? []));
    }
  }, [isLeader, profile]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("reminders").insert({
      member_id: form.member_id,
      week_number: parseInt(form.week_number),
      message: form.message,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reminder sent!" });
      setOpen(false);
      setForm({ member_id: "", week_number: "", message: "" });
      fetchReminders();
    }
  };

  const sendToAll = async () => {
    const currentWeek = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000);
    // Get members who haven't paid this week
    const { data: paidMembers } = await supabase.from("contributions")
      .select("member_id")
      .eq("week_number", currentWeek)
      .eq("year", new Date().getFullYear());

    const paidIds = new Set((paidMembers ?? []).map((p) => p.member_id));
    const unpaid = members.filter((m) => !paidIds.has(m.id));

    if (unpaid.length === 0) {
      toast({ title: "All members have paid this week!" });
      return;
    }

    const inserts = unpaid.map((m) => ({
      member_id: m.id,
      week_number: currentWeek,
      message: `Hi ${m.full_name}, this is a reminder to make your weekly contribution for Week ${currentWeek}. Please pay as soon as possible.`,
    }));

    const { error } = await supabase.from("reminders").insert(inserts);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Reminders sent to ${unpaid.length} member(s)!` });
      fetchReminders();
    }
  };

  const markRead = async (id: string) => {
    await supabase.from("reminders").update({ is_read: true }).eq("id", id);
    fetchReminders();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Reminders</h1>
        {isLeader && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={sendToAll}>
              <AlertTriangle className="w-4 h-4 mr-1" /> Remind Unpaid
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Reminder</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Send Reminder</DialogTitle></DialogHeader>
                <form onSubmit={handleSend} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Member</Label>
                    <Select value={form.member_id} onValueChange={(v) => setForm({ ...form, member_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (<SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Week Number</Label>
                    <Input type="number" value={form.week_number} onChange={(e) => setForm({ ...form, week_number: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={3} />
                  </div>
                  <Button type="submit" className="w-full">Send Reminder</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {reminders.length === 0 ? (
          <Card className="glass-card"><CardContent className="p-8 text-center text-muted-foreground">No reminders.</CardContent></Card>
        ) : (
          reminders.map((r) => (
            <Card key={r.id} className={`glass-card transition-colors ${!r.is_read ? "border-l-4 border-l-warning" : ""}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${r.is_read ? "bg-muted" : "bg-warning/10"}`}>
                  <Bell className={`w-5 h-5 ${r.is_read ? "text-muted-foreground" : "text-warning"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{(r as any).profiles?.full_name}</span>
                    <Badge variant={r.is_read ? "secondary" : "outline"} className="text-xs">
                      {r.is_read ? "Read" : "Unread"}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">Wk {r.week_number}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.message}</p>
                </div>
                {!r.is_read && !isLeader && (
                  <Button size="sm" variant="ghost" onClick={() => markRead(r.id)}>
                    <Check className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Reminders;
