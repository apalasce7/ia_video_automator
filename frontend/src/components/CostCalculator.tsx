"use client";

import React, { useEffect, useState } from "react";
import { 
  Wallet, 
  TrendingUp, 
  RefreshCcw, 
  Receipt, 
  Video, 
  Image as ImageIcon, 
  MessageSquare,
  Mic
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface CostLog {
  timestamp: string;
  provider: string;
  model: string;
  cost: number;
  quantity?: number;
  resolution?: string;
}

interface CostCalculatorProps {
  jobId: string | null;
  duration?: number;
  resolution?: string;
}

export function CostCalculator({ jobId, duration, resolution }: CostCalculatorProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [projectCost, setProjectCost] = useState<number>(0);
  const [logs, setLogs] = useState<CostLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      // 1. Obtener Balance real de Wavespeed
      const balanceRes = await fetch("http://localhost:8000/api/balance");
      const balanceData = await balanceRes.json();
      setBalance(balanceData.balance);

      // 2. Obtener Gasto acumulado del proyecto
      const costRes = await fetch(`http://localhost:8000/api/costs/${jobId}`);
      const costData = await costRes.json();
      setProjectCost(costData.total_cost);
      setLogs(costData.details || []);
    } catch (error) {
      console.error("Error fetching cost data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto-update cada 30s
    return () => clearInterval(interval);
  }, [jobId]);

  const getIcon = (model: string) => {
    const m = model.toLowerCase();
    if (m.includes("seedance")) return <Video className="w-3 h-3" />;
    if (m.includes("nano") || m.includes("image")) return <ImageIcon className="w-3 h-3" />;
    if (m.includes("voice")) return <Mic className="w-3 h-3" />;
    return <MessageSquare className="w-3 h-3" />;
  };

  if (!jobId) return null;

  return (
    <Card className="bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          CONTROL DE COSTES IA
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-slate-500 hover:text-emerald-400 transition-colors"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-800/50">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Duración Total</p>
            <p className="text-sm font-black text-white">{duration || 0}s</p> 
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-emerald-500/50 uppercase font-bold tracking-wider">Resolución</p>
            <p className="text-sm font-black text-emerald-400">{resolution || "---"}</p>
          </div>
        </div>

        {/* Balance & Costs */}
        <div className="space-y-4">
          <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20 space-y-4">
            <div>
              <p className="text-[10px] text-emerald-400 uppercase font-black tracking-widest mb-1">Gasto Real Acumulado</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  <span className="text-2xl font-mono font-black text-white">
                    ${projectCost.toFixed(3)}
                  </span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px] font-black uppercase">Sincronizado</Badge>
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-500/10">
              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Inversión Estimada (Plan inicial)</p>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-white/20" />
                <span className="text-lg font-mono font-bold text-white/60">
                  ${((duration || 0) * (resolution === "1080p" ? 0.60 : resolution === "720p" ? 0.24 : 0.12)).toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-white/30 leading-tight">
              El gasto real incluye regeneraciones y variaciones del plan original.
            </p>
          </div>

          <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/50">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Saldo Disponible (Wavespeed)</p>
            <div className="flex items-center gap-2 text-white">
              <Wallet className="w-4 h-4 text-emerald-500/50" />
              <span className="text-lg font-mono font-black">
                {balance !== null ? `$${balance.toFixed(2)}` : "---"}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Logs */}
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Últimas operaciones</p>
          <div className="max-h-[120px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
            {logs.slice(-5).reverse().map((log, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-slate-950/20 p-2 rounded border border-slate-800/30">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{getIcon(log.model)}</span>
                  <div className="flex flex-col">
                    <span className="text-slate-300 font-medium">{log.model.split('/').pop()}</span>
                    {log.resolution && <span className="text-[9px] text-slate-500">{log.resolution}</span>}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/5 text-emerald-400 border-emerald-500/20">
                  +${log.cost.toFixed(3)}
                </Badge>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-xs text-slate-600 italic text-center py-2">Sin gastos registrados aún</p>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/50 flex justify-between items-center">
          <div className="flex items-center gap-1.5" title="Costes calculados según tarifas oficiales y balance real de API.">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-medium">REAL-TIME TRACKING</span>
          </div>
          <span className="text-[9px] text-slate-600 font-mono">UGC PIPELINE V3.2</span>
        </div>
      </CardContent>
    </Card>
  );
}
