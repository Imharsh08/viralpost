'use client';

import React, { useState } from 'react';
import {
  Bold, Italic, Heading2, List, Quote, Link2, AlignLeft, Minus
} from 'lucide-react';

const toolbarGroups = [
  [
    { id: 'bold', icon: Bold, label: 'Bold', shortcut: 'Ctrl+B' },
    { id: 'italic', icon: Italic, label: 'Italic', shortcut: 'Ctrl+I' },
  ],
  [
    { id: 'h2', icon: Heading2, label: 'Heading', shortcut: 'Ctrl+Alt+2' },
    { id: 'list', icon: List, label: 'Bullet list', shortcut: 'Ctrl+Shift+8' },
    { id: 'quote', icon: Quote, label: 'Blockquote', shortcut: 'Ctrl+Shift+B' },
  ],
  [
    { id: 'link', icon: Link2, label: 'Add link', shortcut: 'Ctrl+K' },
    { id: 'divider', icon: Minus, label: 'Divider' },
  ],
  [
    { id: 'align', icon: AlignLeft, label: 'Align left' },
  ],
];

export default function EditorToolbar() {
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<string | null>(null);

  const toggleFormat = (id: string) => {
    setActiveFormats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Integration point: tiptap editor.chain().focus().toggleBold().run() etc.
  };

  return (
    <div className="card px-3 py-2 flex items-center gap-1 flex-wrap">
      {toolbarGroups.map((group, gi) => (
        <React.Fragment key={`toolbar-group-${gi}`}>
          {gi > 0 && (
            <div className="w-px h-5 bg-border mx-1 shrink-0" />
          )}
          {group.map((item) => (
            <div key={`toolbar-${item.id}`} className="relative">
              <button
                onClick={() => toggleFormat(item.id)}
                onMouseEnter={() => setTooltip(item.id)}
                onMouseLeave={() => setTooltip(null)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-95 ${
                  activeFormats.has(item.id)
                    ? 'bg-secondary text-primary' :'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                aria-label={item.label}
              >
                <item.icon size={15} />
              </button>
              {tooltip === item.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded-lg whitespace-nowrap z-20 pointer-events-none animate-fade-in">
                  {item.label}
                  {'shortcut' in item && item.shortcut && (
                    <span className="ml-1.5 opacity-60 font-mono text-[10px]">{item.shortcut}</span>
                  )}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground" />
                </div>
              )}
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}