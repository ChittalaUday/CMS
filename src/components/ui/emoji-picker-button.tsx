'use client';

import * as React from 'react';
import { useEmojiDropdownMenuState, FrequentEmojiStorage } from '@platejs/emoji/react';
import { insertEmoji } from '@platejs/emoji';
import { useEditorRef } from 'platejs/react';
import { SmilePlus, Search, X, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToolbarButton } from '@/components/ui/toolbar';
import { cn } from '@/lib/utils/utils';

const SIDE_RIGHT = { side: 'right' as const };

// Shared storage instance (same key the plugin uses internally)
const frequentStorage = new FrequentEmojiStorage({});

function EmojiButton({
  emoji,
  onMouseOver,
  onSelect,
}: {
  emoji: any;
  onMouseOver: (e?: any) => void;
  onSelect: (e: any) => void;
}) {
  return (
    <button
      type="button"
      title={emoji.id}
      className="flex items-center justify-center w-8 h-8 rounded-lg text-lg hover:bg-muted transition-colors cursor-pointer"
      onMouseEnter={() => onMouseOver(emoji)}
      onMouseLeave={() => onMouseOver(undefined)}
      onClick={() => onSelect(emoji)}
    >
      {emoji.skins?.[0]?.native ?? ''}
    </button>
  );
}

export function EmojiPickerButton() {
  const editor = useEditorRef();
  const { emojiPickerState, isOpen, setIsOpen } = useEmojiDropdownMenuState({
    closeOnSelect: true,
  });

  const {
    searchValue,
    setSearch,
    hasFound,
    isSearching,
    searchResult,
    emojiLibrary,
    visibleCategories,
    clearSearch,
    onMouseOver,
    i18n,
    refs,
  } = emojiPickerState;

  // --- Recently used ---
  const [recentIds, setRecentIds] = React.useState<string[]>([]);

  // Reload recent list whenever picker opens
  React.useEffect(() => {
    if (isOpen) {
      try {
        setRecentIds(frequentStorage.getList());
      } catch {
        setRecentIds([]);
      }
    }
  }, [isOpen]);

  const recentEmojis = React.useMemo(() => {
    return recentIds
      .map((id) => {
        try { return emojiLibrary.getEmoji(id); } catch { return null; }
      })
      .filter(Boolean)
      .slice(0, 16);
  }, [recentIds, emojiLibrary]);

  // --- Insert handler (also updates recent list) ---
  const handleSelect = React.useCallback(
    (emoji: any) => {
      editor.tf.focus();
      insertEmoji(editor as any, emoji);
      // Persist to FrequentEmojiStorage so future opens show it
      try { frequentStorage.update(emoji.id); } catch { /* ignore */ }
      setIsOpen(false);
    },
    [editor, setIsOpen]
  );

  // --- Category browsing (non-search mode) ---
  const categories = React.useMemo(() => {
    if (isSearching) return [];
    const result: { label: string; emojis: any[] }[] = [];
    visibleCategories?.forEach((isVisible: boolean, categoryId: string) => {
      // Skip the built-in frequent section — we render our own above
      if (categoryId === 'frequent' || !isVisible) return;
      try {
        const section = (emojiLibrary.getGrid().sections as any).get(categoryId as any);
        if (!section) return;
        const emojiIds: string[] = (section as any).elements ?? [];
        const emojis = emojiIds.map((id) => {
          try { return emojiLibrary.getEmoji(id); } catch { return null; }
        }).filter(Boolean);
        if (emojis.length > 0) {
          const label =
            (i18n.categories as Record<string, string>)?.[categoryId] ?? categoryId;
          result.push({ label, emojis });
        }
      } catch { /* skip */ }
    });
    return result;
  }, [isSearching, visibleCategories, emojiLibrary, i18n]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton
          tooltip="Emoji (Cmd+:)"
          tooltipContentProps={SIDE_RIGHT}
          size="sm"
          pressed={isOpen}
        >
          <SmilePlus className="size-4 text-foreground/80" />
        </ToolbarButton>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="right"
        sideOffset={6}
        className="w-72 p-0 border border-border/70 bg-popover shadow-xl rounded-xl overflow-hidden"
      >
        {/* Search bar */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-border/40">
          <Search className="size-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emoji…"
            className="flex-1 text-xs bg-transparent outline-none border-none text-foreground placeholder:text-muted-foreground/60"
            autoFocus
          />
          {searchValue && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Body */}
        <div
          className="overflow-y-auto max-h-64 p-2 space-y-3"
          ref={refs.current?.content as any}
        >
          {isSearching ? (
            /* ── Search results ── */
            hasFound ? (
              <div className="grid grid-cols-8 gap-0.5">
                {searchResult.map((emoji: any) => (
                  <EmojiButton
                    key={emoji.id}
                    emoji={emoji}
                    onMouseOver={onMouseOver}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-6">
                No emoji found for "{searchValue}"
              </p>
            )
          ) : (
            /* ── Browse mode ── */
            <>
              {/* Recently used — shown first */}
              {recentEmojis.length > 0 && (
                <div>
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1 px-1">
                    <Clock className="size-2.5" />
                    Recently used
                  </p>
                  <div className="grid grid-cols-8 gap-0.5">
                    {recentEmojis.map((emoji: any) => (
                      <EmojiButton
                        key={emoji.id}
                        emoji={emoji}
                        onMouseOver={onMouseOver}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All categories */}
              {categories.map(({ label, emojis }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1 px-1">
                    {label}
                  </p>
                  <div className="grid grid-cols-8 gap-0.5">
                    {emojis.slice(0, 32).map((emoji: any) => (
                      <EmojiButton
                        key={emoji.id}
                        emoji={emoji}
                        onMouseOver={onMouseOver}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {recentEmojis.length === 0 && categories.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-6">
                  Type to search emoji
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer — hovered emoji preview */}
        {emojiPickerState.emoji && (
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border/40 bg-muted/20">
            <span className="text-2xl leading-none">
              {emojiPickerState.emoji.skins?.[0]?.native ?? ''}
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">
                :{emojiPickerState.emoji.id}:
              </p>
              <p className="text-[10px] text-muted-foreground">
                {emojiPickerState.emoji.name}
              </p>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
