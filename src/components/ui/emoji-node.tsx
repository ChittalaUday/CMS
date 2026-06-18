'use client';

import * as React from 'react';

import type { PlateElementProps } from 'platejs/react';

import { PlateElement } from 'platejs/react';
import { cn } from '@/lib/utils/utils';

/**
 * EmojiInputElement – renders the inline `:query` pill while the user
 * searches for an emoji. The EmojiPlugin (withTriggerCombobox) drives
 * selection/insertion — this component only provides the visual shell.
 */
export function EmojiInputElement({ className, ...props }: PlateElementProps) {
  const { children, element } = props;
  const query = (element as any).value ?? '';

  return (
    <PlateElement
      as="span"
      className={cn('inline-block', className)}
      {...props}
    >
      <span
        contentEditable={false}
        className="select-none inline-flex items-center gap-0.5 rounded-sm bg-primary/10 border border-primary/20 px-1 text-sm text-primary"
      >
        <span className="font-bold">:</span>
        <span>{query}</span>
      </span>
      {children}
    </PlateElement>
  );
}
