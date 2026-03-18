import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Check, AlertTriangle, Calendar, Clock, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Reminders = () => {
  const { isAdmin, profile } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [form, setForm] = useState({ member_id: "", week_number: "", message: "" });
  const [deadlineForm, setDeadlineForm] = useState({ week_number: "", deadline_date: "", amount_due: "" });

  const fetchReminders = async () => {
    if (!profile) return;
    let query = supabase.from("reminders").select("*, profiles!reminders_member_id_fkey(full_name)").order("created_at", { ascending: false });
    if (!isAdmin) {
      query = query.eq("member_id", profile.id);
    }
    const { data } = await query;
    setReminders(data ?? []);
  };

  const fetchDeadlines = async () => {
    const { data } = await supabase.from("payment_deadlines")
      .select("*, profiles!payment_deadlines_created_by_fkey(full_name)")
      .order("deadline_date", { ascending: false })
      .limit(20);
    setDeadlines(data ?? []);
  };

  useEffect(() => {
    fetchReminders();
    fetchDeadlines();
    if (isAdmin) {
      supabase.from("profiles").select("id, full_name").then(({ data }) => setMembers(data ?? []));
    }
  }, [isAdmin, profile]);

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

  const handleSetDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const { error } = await supabase.from("payment_deadlines").insert({
      week_number: parseInt(deadlineForm.week_number),
      deadline_date: deadlineForm.deadline_date,
      amount_due: parseFloat(deadlineForm.amount_due),
      created_by: profile.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deadline set!" });
      setDeadlineOpen(false);
      setDeadlineForm({ week_number: "", deadline_date: "", amount_due: "" });
      fetchDeadlines();

      // Auto-send reminders to all members about the deadline
      const allMembers = members.length > 0 ? members : (await supabase.from("profiles").select("id, full_name")).data ?? [];
      const inserts = allMembers.map((m: any) => ({
        member_id: m.id,
        week_number: parseInt(deadlineForm.week_number),
        message: `Payment deadline reminder: KSH ${parseFloat(deadlineForm.amount_due).toLocaleString()} is due by ${deadlineForm.deadline_date} for Week ${deadlineForm.week_number}. Please pay on time.`,
      }));
      if (inserts.length > 0) {
        await supabase.from("reminders").insert(inserts);
        fetchReminders();
        toast({ title: `Deadline reminders sent to ${inserts.length} member(s)!` });
      }
    }
  };

  const sendToAll = async () => {
    const currentWeek = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000);
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

  const downloadReminders = () => {
    const headers = "Member,Week,Message,Status,Date\n";
    const rows = reminders.map((r) =>
      `"${(r as any).profiles?.full_name ?? ""}",${r.week_number},"${r.message}",${r.is_read ? "Read" : "Unread"},"${r.created_at}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reminders-report.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Reminders</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={downloadReminders}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={sendToAll}>
                <AlertTriangle className="w-4 h-4 mr-1" /> Remind Unpaid
              </Button>
              <Dialog open={deadlineOpen} onOpenChange={setDeadlineOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Calendar className="w-4 h-4 mr-1" /> Set Deadline
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Set Payment Deadline</DialogTitle></DialogHeader>
                  <form onSubmit={handleSetDeadline} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Week Number</Label>
                      <Input type="number" value={deadlineForm.week_number} onChange={(e) => setDeadlineForm({ ...deadlineForm, week_number: e.target.value })} required min="1" max="53" />
                    </div>
                    <div className="space-y-2">
                      <Label>Deadline Date</Label>
                      <Input type="date" value={deadlineForm.deadline_date} onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_date: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount Due (KSH)</Label>
                      <Input type="number" value={deadlineForm.amount_due} onChange={(e) => setDeadlineForm({ ...deadlineForm, amount_due: e.target.value })} required min="1" />
                    </div>
                    <Button type="submit" className="w-full">Set Deadline & Notify All</Button>
                  </form>
                </DialogContent>
              </Dialog>
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
            </>
          )}
        </div>
      </div>

      {/* Payment Deadlines */}
      {deadlines.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" /> Payment Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Week</th>
                    <th className="text-left p-3 font-medium">Deadline</th>
                    <th className="text-left p-3 font-medium">Amount (KSH)</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deadlines.map((d) => {
                    const isPast = new Date(d.deadline_date) < new Date();
                    return (
                      <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3">Wk {d.week_number}</td>
                        <td className="p-3">{d.deadline_date}</td>
                        <td className="p-3 text-accent font-semibold">KSH {Number(d.amount_due).toLocaleString()}</td>
                        <td className="p-3">
                          <Badge variant={isPast ? "destructive" : "default"} className="text-xs">
                            {isPast ? "Overdue" : "Upcoming"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reminders List */}
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
                {!r.is_read && !isAdmin && (
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
