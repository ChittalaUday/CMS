'use client';

import { createPlatePlugin } from 'platejs/react';

import { FixedToolbar } from '@/components/ui/fixed-toolbar';
import { BasicToolbarButtons } from '@/components/ui/basic-toolbar-buttons';

export const BasicToolbarKit = [
  createPlatePlugin({
    key: 'fixed-toolbar',
    render: {
      beforeEditable: () => (
        <FixedToolbar>
          <BasicToolbarButtons />
        </FixedToolbar>
      ),
    },
  }),
];
