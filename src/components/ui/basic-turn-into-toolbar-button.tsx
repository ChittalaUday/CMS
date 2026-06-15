'use client';

import * as React from 'react';

import type { DropdownMenuProps } from '@radix-ui/react-dropdown-menu';
import type { TElement } from 'platejs';

import { DropdownMenuItemIndicator } from '@radix-ui/react-dropdown-menu';
import {
  CheckIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  PilcrowIcon,
  QuoteIcon,
} from 'lucide-react';
import { KEYS } from 'platejs';
import { useEditorRef, useSelectionFragmentProp } from 'platejs/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getBlockType,
  setBlockType,
} from '@/components/editor/transforms';

import { ToolbarButton, ToolbarMenuGroup } from './toolbar';

export const basicTurnIntoItems = [
  {
    icon: <PilcrowIcon className="size-4" />,
    keywords: ['paragraph'],
    label: 'Text',
    value: KEYS.p,
  },
  {
    icon: <Heading1Icon className="size-4" />,
    keywords: ['title', 'h1'],
    label: 'Heading 1',
    value: 'h1',
  },
  {
    icon: <Heading2Icon className="size-4" />,
    keywords: ['subtitle', 'h2'],
    label: 'Heading 2',
    value: 'h2',
  },
  {
    icon: <Heading3Icon className="size-4" />,
    keywords: ['subtitle', 'h3'],
    label: 'Heading 3',
    value: 'h3',
  },
  {
    icon: <QuoteIcon className="size-4" />,
    keywords: ['citation', 'blockquote', '>'],
    label: 'Quote',
    value: KEYS.blockquote,
  },
];

export function BasicTurnIntoToolbarButton({
  orientation = 'horizontal',
  ...props
}: DropdownMenuProps & { orientation?: 'horizontal' | 'vertical' }) {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);
  const isVertical = orientation === 'vertical';

  const value = useSelectionFragmentProp({
    defaultValue: KEYS.p,
    getProp: (node) => getBlockType(node as TElement),
  });
  const selectedItem = React.useMemo(
    () =>
      basicTurnIntoItems.find((item) => item.value === (value ?? KEYS.p)) ??
      basicTurnIntoItems[0],
    [value]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton
          className={isVertical ? "size-9 p-0" : "min-w-[125px]"}
          pressed={open}
          tooltip="Turn into"
          isDropdown={!isVertical}
        >
          {isVertical ? selectedItem.icon : (
            <>
              {React.cloneElement(selectedItem.icon as React.ReactElement<any>, { className: "mr-2 size-4" })}
              {selectedItem.label}
            </>
          )}
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="ignore-click-outside/toolbar w-48"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          editor.tf.focus();
        }}
        align="start"
        side={isVertical ? "right" : "bottom"}
        sideOffset={isVertical ? 12 : 4}
      >
        <ToolbarMenuGroup
          value={value}
          onValueChange={(type) => {
            setBlockType(editor, type);
          }}
          label="Turn into"
        >
          {basicTurnIntoItems.map(({ icon, label, value: itemValue }) => (
            <DropdownMenuRadioItem
              key={itemValue}
              className="min-w-[180px] pl-2 *:first:[span]:hidden"
              value={itemValue}
            >
              <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
                <DropdownMenuItemIndicator>
                  <CheckIcon className="size-4" />
                </DropdownMenuItemIndicator>
              </span>
              {React.cloneElement(icon as React.ReactElement<any>, { className: "mr-2 size-4" })}
              {label}
            </DropdownMenuRadioItem>
          ))}
        </ToolbarMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
