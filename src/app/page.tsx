"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ActivityCalendar } from "react-activity-calendar";
import { supabase } from "@/lib/supabase";
import { Play, Pause, RotateCcw, Flame, Users } from "lucide-react";

type Session = {
  id: string;
  task_name: string;
  duration_mins: number;
  created_at: string;
};

export default function Home() {
  // Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins default
  const [isRunning, setIsRunning] = useState(false);
  const [isHardcore, setIsHardcore] = useState(false); // Pomodoro
  const [taskName, setTaskName] = useState("");
  
  // Data State
  const [sessions, setSessions] = useState<Session[]>([]);
  
  // Realtime Coworking
  const [coworkers, setCoworkers] = useState<number>(1);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Parse Supabase Key logic inside functions to avoid cascading errors
  const hasSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder" && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY_HERE";

  const handleSessionEnd = useCallback(async () => {
    setIsRunning(false);
    document.body.classList.remove("timer-active");
    if (isHardcore) {
      alert("🔥 Hardcore Focus Concluído! Bloqueios desativados. Modo de Descanso ativado.");
      setTimeLeft(5 * 60); // Auto 5 min break
    } else {
      alert("⏱️ Tempo concluído!");
    }

    // Save to Supabase
    const payload = {
      task_name: taskName || (isHardcore ? "Hardcore Session" : "Focus Session"),
      duration_mins: 25, 
    };
    
    if (hasSupabaseKey) {
      await supabase.from('sessions').insert([payload]);
    } else {
        // Fallback local memory if Supabase not ready
        setSessions(prev => [{ id: Date.now().toString(), created_at: new Date().toISOString(), ...payload }, ...prev]);
    }
  }, [isHardcore, taskName, hasSupabaseKey]);

  // Initialize
  useEffect(() => {
    // Fetch historical data
    const fetchHistory = async () => {
      if (!hasSupabaseKey) return;
      const { data, error } = await supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(50);
      if (data && !error) setSessions(data);
    };
    fetchHistory();

    // Setup Realtime Channel
    if (hasSupabaseKey) {
      const room = supabase.channel('coworking-room', {
        config: { presence: { key: 'user' } }
      });
      
      room.on('presence', { event: 'sync' }, () => {
        const state = room.presenceState();
        setCoworkers(Object.keys(state).length || 1); 
      }).subscribe();

      return () => { supabase.removeChannel(room); };
    }
  }, [hasSupabaseKey]);

  // Timer Tick
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setTimeout(() => handleSessionEnd(), 0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, timeLeft, handleSessionEnd]);


  const toggleTimer = () => {
    if (isHardcore && isRunning) {
      alert("🔥 Modo Hardcore Ativo: Não podes parar a meio!");
      return;
    }
    setIsRunning(!isRunning);
    if (!isRunning) document.body.classList.add("timer-active");
    else document.body.classList.remove("timer-active");
  };

  const formatTime = (secs: number) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Convert sessions for Heatmap
  const getLevel = (count: number): 0 | 1 | 2 | 3 | 4 => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 4;
  };

  const heatMapData = [
    { date: "2026-04-10", count: 4 },
    { date: "2026-04-11", count: 2 },
    { date: "2026-04-12", count: 6 },
    { date: "2026-04-13", count: 3 },
    { date: "2026-04-14", count: 7 },
    { date: new Date().toISOString().split("T")[0], count: sessions.length }
  ].map(d => ({ ...d, level: getLevel(d.count) }));

  return (
    <main className="max-w-6xl mx-auto py-12 px-6">
      
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-light tracking-widest uppercase">Time<span className="font-semibold text-[var(--color-gold-accent)]">Bank</span> Pro</h1>
          <p className="text-xs opacity-50 mt-1 flex items-center gap-2">
            <Users size={12} /> {coworkers} {coworkers === 1 ? "Coworker" : "Coworkers"} online na tua Room
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* TIMER SECTION */}
        <div className="lg:col-span-2 glass-panel p-12 flex flex-col items-center">
          
          <div className="w-full flex justify-between items-center mb-10">
            <input 
              type="text" 
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Foco atual..." 
              className="bg-transparent text-xl outline-none border-b border-white/20 focus:border-[var(--color-gold-accent)] pb-2 w-full max-w-lg text-center" 
            />
          </div>

          <div className="text-[8rem] font-light tabular-nums tracking-tighter mb-10">
            {formatTime(timeLeft)}
          </div>

          <div className="flex gap-4 w-full justify-center">
            <button onClick={toggleTimer} className={`px-12 py-4 rounded-2xl tracking-widest uppercase text-sm font-semibold flex items-center gap-2 transition-all ${isRunning ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}>
               {isRunning ? <Pause size={18} /> : <Play size={18} />} {isRunning ? "Pausar" : "Iniciar"}
            </button>
            <button onClick={() => {if(!isHardcore || !isRunning) setTimeLeft(25*60)}} className="px-6 py-4 rounded-2xl border border-current opacity-50 hover:opacity-100 flex items-center gap-2">
               <RotateCcw size={18} /> Reset
            </button>
          </div>

          <div className="mt-12 flex items-center gap-3 opacity-60">
            <input type="checkbox" id="hardcore" onChange={(e) => setIsHardcore(e.target.checked)} disabled={isRunning} />
            <label htmlFor="hardcore" className="text-sm font-medium flex items-center gap-1 cursor-pointer">
              <Flame size={16} className={isHardcore ? "text-orange-500" : ""} /> Modo Hardcore Pomodoro (Bloqueio)
            </label>
          </div>

        </div>

        {/* RIGHT SECTION */}
        <div className="space-y-8 flex flex-col">
          
          <div className="glass-panel p-8 h-[350px] overflow-y-auto">
            <h3 className="text-xs uppercase tracking-widest opacity-50 mb-6">Live History Bank</h3>
            <div className="space-y-3">
              {sessions.map((s, i) => (
                <div key={s.id || i} className="p-3 bg-black/5 rounded-xl border border-white/5 text-sm flex justify-between items-center">
                  <span className="truncate w-[120px]">{s.task_name || "Focus Session"}</span>
                  <span className="text-xs opacity-50">{new Date(s.created_at).toLocaleTimeString().slice(0,5)}</span>
                </div>
              ))}
              {sessions.length === 0 && <p className="text-xs opacity-30 italic">Nenhum registo ativo ou na base de dados.</p>}
            </div>
          </div>

          <div className="glass-panel p-8 flex-grow overflow-hidden flex flex-col items-center">
            <h3 className="text-xs uppercase tracking-widest opacity-50 mb-6 w-full text-left">Activity Heatmap</h3>
            <div className="scale-90">
              <ActivityCalendar 
                data={heatMapData} 
                theme={{ light: ['#e5e7eb', '#c9a66b'], dark: ['#fff2', '#c9a66b'] }}
                labels={{ legend: { less: "Low", more: "High" }, months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], totalCount: '{{count}} focus modules in {{year}}' }}
              />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
