import React, { useState } from "react";
import { Copy, CheckCircle2, MessageSquare, Info } from "lucide-react";
import { WORKSPACE_PAGES, CONTENT_TYPES, CONTENT_TONES, CONTENT_LENGTHS, CONTENT_CTAS } from "../constants/appConstants";

export default function PromptAssistCard({ settings, metadata }) {
  const [copied, setCopied] = useState(false);
  
  const pageLabel = WORKSPACE_PAGES.find(p => p.id === settings.activePageId)?.label || "Default Page";
  const typeLabel = CONTENT_TYPES.find(t => t.id === metadata.type)?.label || "General";
  const toneLabel = CONTENT_TONES.find(t => t.id === metadata.tone)?.label || "Friendly";
  const lengthLabel = CONTENT_LENGTHS.find(l => l.id === metadata.length)?.label || "Medium";
  const ctaLabel = CONTENT_CTAS.find(c => c.id === metadata.cta)?.label || "None";

  const brief = `Create a ${toneLabel.toLowerCase()} ${lengthLabel.toLowerCase()} ${typeLabel.toLowerCase()} for ${pageLabel}${ctaLabel !== 'None' ? ` with a ${ctaLabel.toLowerCase()} CTA` : ''}.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-cyan-400" />
          <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Prompt Assist Brief</h3>
        </div>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1 text-[9px] font-bold text-cyan-400 uppercase hover:text-white transition"
        >
          {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy Brief'}
        </button>
      </div>

      <div className="bg-slate-950/40 rounded-xl p-3 border border-white/5 mb-3">
        <p className="text-xs text-slate-300 leading-relaxed italic">
          "{brief}"
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 uppercase">Text: {settings.textProvider}</span>
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 uppercase">Image: {settings.imageProvider}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
           <Info className="h-3 w-3" />
           <p className="text-[9px] italic line-clamp-1">Phase A: Text routing is active. Image routing remains on the existing stable flow.</p>
        </div>
      </div>
    </div>
  );
}
