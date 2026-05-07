import React from "react";
import { X, BookOpen, ChevronRight } from "lucide-react";
import { guideSections } from "../constants/appConstants.js";

function GuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900 shadow-2xl transition-all flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">คู่มือการใช้งาน</h2>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">AutoPost Studio v0.2.0</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-white/10">
          {guideSections.map((section, idx) => (
            <div key={idx} className="space-y-4">
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <ChevronRight className="h-4 w-4" />
                {section.title}
              </h3>
              <ul className="space-y-3 pl-2">
                {section.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex gap-3 text-sm leading-relaxed text-slate-300">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 bg-slate-950/50 px-8 py-4">
           <p className="text-center text-[10px] text-slate-600 uppercase tracking-widest">
             &copy; 2026 AutoPost Studio — Production Dashboard
           </p>
        </div>
      </div>
    </div>
  );
}

export default GuideModal;
