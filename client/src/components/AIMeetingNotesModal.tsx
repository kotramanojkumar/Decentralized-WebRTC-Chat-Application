import { useState } from 'react';
import { MeetingNotesEngine } from '../ai/MeetingNotesEngine';
import type { MeetingSummaryResult, ActionItem } from '../ai/MeetingNotesEngine';

interface AIMeetingNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: MeetingSummaryResult | null;
}

export default function AIMeetingNotesModal({
  isOpen,
  onClose,
  summary
}: AIMeetingNotesModalProps) {
  const [items, setItems] = useState<ActionItem[]>(summary?.actionItems || []);
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !summary) return null;

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const handleSaveToDashboard = () => {
    MeetingNotesEngine.saveToDashboard({ ...summary, actionItems: items });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary.fullMarkdown);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([summary.fullMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-minutes-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-[#0f111a]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg shadow-lg shadow-blue-500/20">
              🤖
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>AI Meeting Intelligence &amp; Action Notes</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  On-Device NLP
                </span>
              </h2>
              <p className="text-xs text-white/50">
                {summary.participantCount} participant(s) • ~{summary.durationMinutes} min session • 100% private
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Executive Summary Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 space-y-2">
            <div className="text-xs font-semibold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>📌 Executive Summary</span>
            </div>
            <p className="text-sm text-white/90 leading-relaxed">
              {summary.executiveSummary}
            </p>
          </div>

          {/* Key Discussion Points */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎯 Key Discussion Points ({summary.keyDiscussionPoints.length})</span>
            </h3>
            {summary.keyDiscussionPoints.length === 0 ? (
              <div className="p-3 rounded-lg bg-white/5 text-xs text-white/40 italic">
                No major discussion points captured in transcript.
              </div>
            ) : (
              <div className="space-y-2">
                {summary.keyDiscussionPoints.map((point, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-white/80 flex items-start gap-2.5">
                    <span className="text-blue-400 font-bold mt-0.5">•</span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Items with Checkboxes */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                <span>✅ Identified Action Items ({items.length})</span>
              </h3>
              <span className="text-[11px] text-white/40">Check off items as completed</span>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`p-3 rounded-xl border transition flex items-center gap-3 cursor-pointer ${
                    item.completed
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-white/50 line-through'
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-white/90'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer pointer-events-none"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-blue-300 mr-2">[{item.assignee}]</span>
                    <span>{item.task}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition cursor-pointer"
            >
              {isCopied ? '✓ Copied' : 'Copy (.md)'}
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition cursor-pointer"
            >
              Download Minutes
            </button>
          </div>

          <button
            onClick={handleSaveToDashboard}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-blue-500/20 transition cursor-pointer flex items-center gap-2"
          >
            <span>{isSaved ? '✓ Saved to Dashboard!' : '💾 Sync to Dashboard Tasks'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
