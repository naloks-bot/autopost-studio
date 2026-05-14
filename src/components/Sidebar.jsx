import { Calendar, ChevronRight, HelpCircle, Layers3, ListTodo, PlusCircle, Settings, Sparkles, Terminal } from "lucide-react";

function Sidebar({ activeTab, setActiveTab, workspaceName, onOpenGuide }) {
  const menuItems = [
    { id: "create", label: "สร้างโพสต์", icon: PlusCircle },
    { id: "pages", label: "จัดการเพจ", icon: Layers3 },
    { id: "status", label: "สถานะระบบ", icon: ListTodo },
    { id: "scheduler", label: "ระบบโพสต์อัตโนมัติ", icon: Calendar },
    { id: "logs", label: "ประวัติระบบ", icon: Terminal },
    { id: "settings", label: "ตั้งค่า", icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 hidden h-full w-64 flex-col border-r border-white/10 bg-slate-950 lg:flex">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-600 shadow-lg shadow-sky-900/40">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">{workspaceName}</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 shadow-sm shadow-cyan-500/5"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span>{item.label}</span>
              </div>
              {isActive ? <ChevronRight className="h-4 w-4" /> : null}
            </button>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4">
        <button
          onClick={onOpenGuide}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition-all hover:bg-white/5 hover:text-slate-200"
        >
          <HelpCircle className="h-5 w-5 text-slate-500" />
          <span>คู่มือใช้งาน</span>
        </button>

        <div className="rounded-xl bg-white/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AutoPost Studio v0.3.0</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">พร้อมใช้งาน</span>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
