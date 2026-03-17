import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download } from "lucide-react";

const Contributions = () => {
  const { isAdmin, profile } = useAuth();
  const { toast } = useToast();
  const [contributions, setContributions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ member_id: "", amount: "", week_number: "", notes: "" });

  const fetchContributions = async () => {
    if (!profile) return;
    let query = supabase.from("contributions")
      .select("*, profiles!contributions_member_id_fkey(full_name)")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("member_id", profile.id);
    }
    const { data } = await query;
    setContributions(data ?? []);
  };

  const fetchMembers = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name");
    setMembers(data ?? []);
  };

  useEffect(() => {
    fetchContributions();
    if (isAdmin) fetchMembers();
  }, [isAdmin, profile]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const { error } = await supabase.from("contributions").insert({
      member_id: form.member_id,
      amount: parseFloat(form.amount),
      week_number: parseInt(form.week_number),
      recorded_by: profile.id,
      notes: form.notes || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contribution recorded!" });
      setOpen(false);
      setForm({ member_id: "", amount: "", week_number: "", notes: "" });
      fetchContributions();
    }
  };

  const downloadCSV = () => {
    const headers = "Member,Amount,Week,Year,Date,Notes\n";
    const rows = contributions.map((c) =>
      `"${(c as any).profiles?.full_name ?? ""}",${c.amount},${c.week_number},${c.year},${c.payment_date},"${c.notes ?? ""}"`
    ).join("\n");
    const blob = new Blob([headers.replace("Amount", "Amount (KSH)") + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contributions.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Contributions</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Record Payment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Contribution</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Member</Label>
                    <Select value={form.member_id} onValueChange={(v) => setForm({ ...form, member_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (KSH)</Label>
                    <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Week Number</Label>
                    <Input type="number" value={form.week_number} onChange={(e) => setForm({ ...form, week_number: e.target.value })} required min="1" max="53" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full">Save Contribution</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Member</th>
                  <th className="text-left p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Week</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {contributions.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No contributions found.</td></tr>
                ) : (
                  contributions.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{(c as any).profiles?.full_name ?? "—"}</td>
                      <td className="p-3 text-accent font-semibold">KSH {Number(c.amount).toLocaleString()}</td>
                      <td className="p-3">Wk {c.week_number}</td>
                      <td className="p-3 text-muted-foreground">{c.payment_date}</td>
                      <td className="p-3 text-muted-foreground">{c.notes ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Contributions;
