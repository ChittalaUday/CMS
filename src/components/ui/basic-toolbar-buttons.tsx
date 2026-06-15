'use client';

import * as React from 'react';

import {
  BoldIcon,
  Code2Icon,
  HighlighterIcon,
  ItalicIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from 'lucide-react';
import { KEYS } from 'platejs';
import { useEditorReadOnly } from 'platejs/react';

import { cn } from '@/lib/utils';
import { RedoToolbarButton, UndoToolbarButton } from './history-toolbar-button';
import { MarkToolbarButton } from './mark-toolbar-button';
import { BasicTurnIntoToolbarButton } from './basic-turn-into-toolbar-button';
import { TableToolbarButton } from './table-toolbar-button';

export function BasicToolbarButtons({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
  const readOnly = useEditorReadOnly();
  const isVertical = orientation === 'vertical';

  return (
    <div className={cn("flex", isVertical ? "flex-col gap-4 items-center" : "w-full")}>
      {!readOnly && (
        <>
          <div className={cn("flex", isVertical ? "flex-col gap-1 items-center" : "items-center")}>
            <UndoToolbarButton />
            <RedoToolbarButton />
          </div>

          {isVertical ? <div className="h-px w-6 bg-border" /> : <div className="mx-1.5 w-px h-6 bg-border" />}

          <div className={cn("flex", isVertical ? "flex-col gap-1 items-center" : "items-center")}>
            <BasicTurnIntoToolbarButton orientation={orientation} />
            <TableToolbarButton orientation={orientation} />
          </div>


          {isVertical ? <div className="h-px w-6 bg-border" /> : <div className="mx-1.5 w-px h-6 bg-border" />}

          <div className={cn("flex flex-wrap justify-center", isVertical ? "flex-col gap-1 items-center" : "items-center")}>
            <MarkToolbarButton nodeType={KEYS.bold} tooltip="Bold (⌘+B)">
              <BoldIcon className="size-4" />
            </MarkToolbarButton>

            <MarkToolbarButton nodeType={KEYS.italic} tooltip="Italic (⌘+I)">
              <ItalicIcon className="size-4" />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.underline}
              tooltip="Underline (⌘+U)"
            >
              <UnderlineIcon className="size-4" />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.strikethrough}
              tooltip="Strikethrough (⌘+⇧+M)"
            >
              <StrikethroughIcon className="size-4" />
            </MarkToolbarButton>

            <MarkToolbarButton nodeType={KEYS.code} tooltip="Code (⌘+E)">
              <Code2Icon className="size-4" />
            </MarkToolbarButton>

            <MarkToolbarButton nodeType={KEYS.highlight} tooltip="Highlight">
              <HighlighterIcon className="size-4" />
            </MarkToolbarButton>
          </div>
        </>
      )}
    </div>
  );
}
