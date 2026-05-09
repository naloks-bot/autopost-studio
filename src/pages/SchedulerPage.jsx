import React from "react";
import { Calendar, Clock, LayoutGrid, Info, AlertTriangle, CheckCircle2, ListFilter, PlayCircle } from "lucide-react";
import { QUEUE_STATUSES } from "../constants/appConstants";

export default function SchedulerPage({ settings }) {
  // Mock data for display only
  const mockQueue = [
    { id: 1, title: "Morning Brand Story", page: "Default Page", time: "09:00 AM", status: "scheduled" },
    { id: 2, title: "Product Promo Blitz", page: "Default Page", time: "01:30 PM", status: "queued" },
    { id: 3, title: "Community Engagement", page: "Demo Page", time: "05:00 PM", status: "draft" },
    { id: 4, title: "Late Night Reflections", page: "Default Page", time: "10:00 PM", status: "failed" },
  ];

  const getStatus = (id) => QUEUE_STATUSES.find(s => s.id === id) || QUEUE_STATUSES[0];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                 <Calendar className="h-6 w-6" />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-white tracking-tight">Scheduler Dashboard</h2>
                 <p className="text-xs text-slate-400">Manage your automated publishing queue</p>
              </div>
           </div>
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">System Live: V1 (Legacy Mode)</span>
           </div>
        </div>
        
        <div className="mt-6 flex items-start gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
           <Info className="h-5 w-5 text-blue-400 mt-0.5" />
           <div>
              <p className="text-xs font-semibold text-blue-300">Queue V2 Planning Active</p>
              <p className="text-[10px] text-blue-400/80 leading-relaxed">
                The UI below represents the upcoming Scheduler V2 architecture. Your current scheduled posts continue to run through the stable V1 background processor.
              </p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue Overview */}
        <div className="lg:col-span-2 space-y-6">
           <div className="rounded-2xl border border-white/5 bg-slate-900/40 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <ListFilter className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Queue: Today's Schedule</h3>
                 </div>
                 <span className="text-[10px] font-bold text-slate-500 uppercase">May 10, 2026</span>
              </div>
              <div className="divide-y divide-white/5">
                 {mockQueue.map(item => {
                    const status = getStatus(item.status);
                    return (
                       <div key={item.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition group">
                          <div className="flex items-center gap-4">
                             <div className="flex flex-col items-center justify-center h-10 w-10 rounded-xl bg-slate-950/50 border border-white/10 group-hover:border-cyan-500/30">
                                <span className="text-[10px] font-bold text-slate-300 leading-none">{item.time.split(' ')[0]}</span>
                                <span className="text-[8px] font-bold text-slate-500 uppercase">{item.time.split(' ')[1]}</span>
                             </div>
                             <div>
                                <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                                <p className="text-[10px] text-slate-500">{item.page}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter ${status.color}`}>
                                {status.label}
                             </span>
                             <button className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition opacity-0 group-hover:opacity-100">
                                <PlayCircle className="h-4 w-4" />
                             </button>
                          </div>
                       </div>
                    );
                 })}
              </div>
              <div className="p-4 bg-white/5 text-center">
                 <button className="text-[10px] font-bold text-slate-400 uppercase hover:text-cyan-400 transition tracking-widest">
                    View Complete Queue →
                 </button>
              </div>
           </div>

           {/* Retry / Failure Section (Mock) */}
           <div className="rounded-2xl border border-rose-500/10 bg-rose-500/5 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                 <AlertTriangle className="h-5 w-5 text-rose-400" />
                 <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Failure Recovery (Planned)</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                 An automated retry system is being designed to handle temporary Facebook API outages or token expirations.
              </p>
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase">
                 <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Auto-Retry (3x)</span>
                 <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Email Alerts</span>
                 <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Manual Force-Push</span>
              </div>
           </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
           <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                 <Clock className="h-5 w-5 text-cyan-400" />
                 <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Posting Slots</h3>
              </div>
              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Posts Per Day</label>
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5">
                       <span className="text-sm font-semibold text-white">3</span>
                       <span className="text-[10px] text-slate-500">Recommended</span>
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Preferred Timeframe</label>
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5">
                       <span className="text-sm font-semibold text-white">09:00 - 21:00</span>
                    </div>
                 </div>
                 <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Auto Spacing</span>
                    <div className="h-5 w-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 relative overflow-hidden">
                       <div className="absolute right-1 top-1 h-3 w-3 rounded-full bg-cyan-400"></div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                 <LayoutGrid className="h-5 w-5 text-slate-400" />
                 <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Timezone</h3>
              </div>
              <div className="px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5">
                 <p className="text-xs font-semibold text-slate-300">Asia/Bangkok (GMT+7)</p>
                 <p className="text-[9px] text-slate-500 mt-1 italic">Based on your current location</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
