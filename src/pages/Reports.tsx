import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText } from "lucide-react";

const Reports = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<any[]>([]);
  const [totals, setTotals] = useState({ totalAmount: 0, totalPayments: 0 });

  const generateReport = async () => {
    const { data: contributions } = await supabase
      .from("contributions")
      .select("*, profiles!contributions_member_id_fkey(full_name)")
      .eq("year", year)
      .order("week_number");

    if (!contributions) return;

    // Group by member
    const grouped: Record<string, { name: string; total: number; weeks: number[]; payments: number }> = {};
    let totalAmount = 0;

    contributions.forEach((c) => {
      const name = (c as any).profiles?.full_name ?? "Unknown";
      if (!grouped[c.member_id]) {
        grouped[c.member_id] = { name, total: 0, weeks: [], payments: 0 };
      }
      grouped[c.member_id].total += Number(c.amount);
      grouped[c.member_id].weeks.push(c.week_number);
      grouped[c.member_id].payments += 1;
      totalAmount += Number(c.amount);
    });

    setReport(Object.values(grouped).sort((a, b) => b.total - a.total));
    setTotals({ totalAmount, totalPayments: contributions.length });
  };

  useEffect(() => {
    generateReport();
  }, [year]);

  const downloadReport = () => {
    const headers = "Member,Total Contributions (UGX),Number of Payments,Weeks Paid\n";
    const rows = report.map((r) =>
      `"${r.name}",${r.total},${r.payments},"${r.weeks.join(", ")}"`
    ).join("\n");
    const summary = `\n\nSummary\nTotal Amount,UGX ${totals.totalAmount.toLocaleString()}\nTotal Payments,${totals.totalPayments}\n`;
    const blob = new Blob([headers + rows + summary], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bodasave-report-${year}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Year:</Label>
            <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-24" />
          </div>
          <Button size="sm" onClick={downloadReport}>
            <Download className="w-4 h-4 mr-1" /> Download
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Collected ({year})</p>
            <p className="text-3xl font-bold text-accent mt-1">UGX {totals.totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Payments</p>
            <p className="text-3xl font-bold mt-1">{totals.totalPayments}</p>
          </CardContent>
        </Card>
      </div>

      {/* Member breakdown */}
      <Card className="glass-card overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" /> Member Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">Member</th>
                  <th className="text-left p-3 font-medium">Total (UGX)</th>
                  <th className="text-left p-3 font-medium">Payments</th>
                  <th className="text-left p-3 font-medium">Weeks</th>
                </tr>
              </thead>
              <tbody>
                {report.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No data for {year}.</td></tr>
                ) : (
                  report.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground">{i + 1}</td>
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3 text-accent font-semibold">{r.total.toLocaleString()}</td>
                      <td className="p-3">{r.payments}</td>
                      <td className="p-3 text-muted-foreground text-xs">{r.weeks.join(", ")}</td>
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

export default Reports;
