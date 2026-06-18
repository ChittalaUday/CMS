'use client';

import * as React from 'react';
import { PlateElement, PlateElementProps } from 'platejs/react';
import { cn } from '@/lib/utils';

export function ListElement({ className, variant, ...props }: PlateElementProps & { variant?: 'ul' | 'ol' }) {
  const Component = variant === 'ol' ? 'ol' : 'ul';
  return (
    <PlateElement
      as={Component}
      className={cn(className, 'my-2 ml-8 pl-2', variant === 'ol' ? 'list-decimal' : 'list-disc')}
      {...props}
    >
      {props.children}
    </PlateElement>
  );
}

export function ListItemElement({ className, ...props }: PlateElementProps) {
  return (
    <PlateElement
      as="li"
      className={cn(className, 'my-1')}
      {...props}
    >
      {props.children}
    </PlateElement>
  );
}
