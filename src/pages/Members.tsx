import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, Mail } from "lucide-react";

const Members = () => {
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("*").order("full_name");
      setMembers(data ?? []);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members ({members.length})</h1>
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
                      {m.role}
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
