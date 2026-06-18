'use client';

import * as React from 'react';
import { PlateElement, PlateElementProps } from 'platejs/react';
import { cn } from '@/lib/utils';

export function TableElement({ className, ...props }: PlateElementProps) {
  return (
    <div className="w-full my-4 overflow-x-auto">
      <PlateElement
        as="table"
        className={cn('w-full border-collapse border border-border text-sm', className)}
        {...props}
      >
        <tbody className="divide-y divide-border">
          {props.children}
        </tbody>
      </PlateElement>
    </div>
  );
}

export function TableRowElement({ className, ...props }: PlateElementProps) {
  return (
    <PlateElement
      as="tr"
      className={cn('hover:bg-muted/10', className)}
      {...props}
    >
      {props.children}
    </PlateElement>
  );
}

export function TableCellElement({ className, ...props }: PlateElementProps) {
  const { background } = props.element as any;
  return (
    <PlateElement
      as="td"
      style={{ backgroundColor: background }}
      className={cn('border border-border p-2 min-w-[100px] text-foreground/80 focus-within:outline-none focus:outline-none', className)}
      {...props}
    >
      {props.children}
    </PlateElement>
  );
}

export function TableCellHeaderElement({ className, ...props }: PlateElementProps) {
  const { background } = props.element as any;
  return (
    <PlateElement
      as="th"
      style={{ backgroundColor: background }}
      className={cn('border border-border bg-muted/40 p-2 min-w-[100px] text-left font-semibold text-foreground focus-within:outline-none focus:outline-none', className)}
      {...props}
    >
      {props.children}
    </PlateElement>
  );
}
