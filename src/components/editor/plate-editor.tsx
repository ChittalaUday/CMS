'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Plate, usePlateEditor, type PlateElementProps } from 'platejs/react';
import type { Value, TElement } from 'platejs';
import { serializeMd } from '@platejs/markdown';
import { serializeHtml } from '@platejs/core/static';
import { ListPlugin, useListToolbarButton, useListToolbarButtonState } from '@platejs/list/react';
import { IndentPlugin } from '@platejs/indent/react';
import { TablePlugin, TableRowPlugin, TableCellPlugin, TableCellHeaderPlugin } from '@platejs/table/react';
import { ImagePlugin } from '@platejs/media/react';
import { FontColorPlugin, FontBackgroundColorPlugin } from '@platejs/basic-styles/react';

import {
  insertTableRow,
  insertTableColumn,
  deleteRow,
  deleteColumn,
  deleteTable,
  setCellBackground,
  getCellTypes,
  getEmptyTableNode
} from '@platejs/table';

import { BasicNodesKit } from '@/components/editor/plugins/basic-nodes-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { FixedToolbar } from '@/components/ui/fixed-toolbar';
import { ToolbarGroup, ToolbarButton } from '@/components/ui/toolbar';
import { MarkToolbarButton } from '@/components/ui/mark-toolbar-button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils/utils';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  ListIcon,
  ListOrderedIcon,
  TableIcon,
  ImageIcon,
  Type,
  Highlighter,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PaintBucket,
  X
} from 'lucide-react';
import { BaseBoldPlugin, BaseItalicPlugin, BaseUnderlinePlugin, BaseStrikethroughPlugin, BaseCodePlugin, BaseH1Plugin, BaseH2Plugin } from '@platejs/basic-nodes';
import { ListElement, ListItemElement } from '@/components/ui/list-node';
import { TableElement, TableRowElement, TableCellElement, TableCellHeaderElement } from '@/components/ui/table-element';
import { ImageElement } from '@/components/ui/image-element';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface PlateEditorProps {
  initialValue?: Value;
  onChange?: (html: string, json: Value, md?: string) => void;
}

const colors = [
  { name: 'Default', value: 'inherit' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
];

function ColorPicker({
  onSelect,
  activeValue,
  title
}: {
  onSelect: (value: string) => void;
  activeValue?: string;
  title: string;
}) {
  return (
    <div className="p-2 flex flex-col gap-2 w-48">
      <div className="text-xs font-semibold text-muted-foreground border-b border-border/40 pb-1 mb-1">
        {title}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {colors.map((c) => {
          const isDefault = c.value === 'inherit';
          const isActive = activeValue === c.value || (!activeValue && isDefault);
          return (
            <button
              key={c.name}
              title={c.name}
              onClick={() => onSelect(c.value)}
              className={cn(
                "w-7 h-7 rounded-md border border-border flex items-center justify-center cursor-pointer transition-all duration-100 hover:scale-105",
                isActive ? "ring-2 ring-primary ring-offset-1" : ""
              )}
              style={isDefault ? {} : { backgroundColor: c.value }}
            >
              {isDefault && (
                <X className="size-3.5 text-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ListToolbarButton({ nodeType, children, tooltip }: { nodeType: string, children: React.ReactNode, tooltip: string }) {
  const state = useListToolbarButtonState({ nodeType });
  const { props } = useListToolbarButton(state);
  return (
    <ToolbarButton tooltip={tooltip} {...props}>
      {children}
    </ToolbarButton>
  );
}

export function PlateEditor({ initialValue, onChange }: PlateEditorProps) {
  const [internalValue, setInternalValue] = useState<Value>(initialValue || [{ children: [{ text: '' }], type: 'p' }]);
  const [isTableActive, setIsTableActive] = useState(false);
  const [activeColor, setActiveColor] = useState('inherit');
  const [activeHighlight, setActiveHighlight] = useState('inherit');
  const [tableGrid, setTableGrid] = useState({ rows: 0, cols: 0 });
  const [isTablePopoverOpen, setIsTablePopoverOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressionDialog, setCompressionDialog] = useState<{
    isOpen: boolean;
    fileName: string;
    fileSizeMB: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    fileName: '',
    fileSizeMB: '0',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const editor = usePlateEditor({
    plugins: [
      ...BasicNodesKit,
      ListPlugin,
      IndentPlugin,
      TablePlugin,
      TableRowPlugin,
      TableCellPlugin,
      TableCellHeaderPlugin,
      ImagePlugin,
      FontColorPlugin,
      FontBackgroundColorPlugin,
    ],
    override: {
      components: {
        ul: (props: PlateElementProps) => <ListElement variant="ul" {...props} />,
        ol: (props: PlateElementProps) => <ListElement variant="ol" {...props} />,
        li: ListItemElement,
        table: TableElement,
        tr: TableRowElement,
        td: TableCellElement,
        th: TableCellHeaderElement,
        img: ImageElement,
      }
    },
    value: internalValue,
  });
  const uploadImageFn = useCallback(async (file: File, uploadId: string) => {
    const findNodePath = () => {
      const entries = editor.api.nodes({
        at: [],
        match: (n: TElement) => n.type === 'img' && n.uploadId === uploadId
      });
      const next = entries.next();
      return next.value ? next.value[1] : null;
    };

    let fileToUpload = file;
    if (file.size > 10 * 1024 * 1024 && file.type.startsWith('image/')) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const userConfirmed = await new Promise<boolean>((resolve) => {
        setCompressionDialog({
          isOpen: true,
          fileName: file.name,
          fileSizeMB,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      setCompressionDialog(prev => ({ ...prev, isOpen: false }));

      if (userConfirmed) {
        try {
          const { compressImageIfNeeded } = await import('@/lib/utils/image-compression');
          fileToUpload = await compressImageIfNeeded(file, 10);
        } catch (compErr) {
          console.error('Compression failed, trying original file:', compErr);
        }
      } else {
        const path = findNodePath();
        if (path) {
          editor.tf.removeNodes({ at: path });
        }
        return;
      }
    }

    const initialPath = findNodePath();
    if (initialPath) {
      editor.tf.setNodes(
        {
          uploading: true,
          error: false,
          progress: 10,
        },
        { at: initialPath }
      );
    }

    let progress = 10;
    const progressInterval = setInterval(() => {
      const path = findNodePath();
      if (!path) {
        clearInterval(progressInterval);
        return;
      }
      if (progress < 90) {
        progress += 10;
        editor.tf.setNodes({ progress }, { at: path });
      }
    }, 150);

    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
      const { uploadImageAction } = await import('./actions');
      const res = await uploadImageAction(formData);

      clearInterval(progressInterval);
      const path = findNodePath();
      if (path) {
        editor.tf.setNodes(
          {
            url: res.url,
            uploading: false,
            error: false,
            uploadId: undefined,
            file: undefined,
          },
          { at: path }
        );
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Editor image upload error:', err);
      const path = findNodePath();
      if (path) {
        editor.tf.setNodes(
          {
            uploading: false,
            error: true,
          },
          { at: path }
        );
      }
    }
  }, [editor]);

  // `editor.uploadImage` is a cross-file bridge: src/components/ui/image-element.tsx reads it to
  // retry a failed upload from within the plate node, so it must live on the editor instance itself.
  // usePlateEditor is third-party and doesn't expose a way to inject this at construction time, so
  // the bridge is attached here instead of mutated inline.
  // eslint-disable-next-line react-hooks/immutability -- see comment above
  (editor as typeof editor & { uploadImage: typeof uploadImageFn }).uploadImage = uploadImageFn;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    const uploadId = Math.random().toString(36).substring(7);

    editor.tf.insertNodes([
      {
        type: 'img',
        url: '',
        uploading: true,
        filename: file.name,
        uploadId,
        file,
        children: [{ text: '' }]
      }
    ]);

    (editor as typeof editor & { uploadImage: typeof uploadImageFn }).uploadImage(file, uploadId);
  };

  const handleInsertGridTable = (rows: number, cols: number) => {
    setIsTablePopoverOpen(false);
    const tableNode = getEmptyTableNode(editor, { rowCount: rows, colCount: cols, header: true });
    editor.tf.insertNodes([
      tableNode,
      { type: 'p', children: [{ text: '' }] }
    ]);
  };

  const renderGridSelector = () => {
    const squares = [];
    for (let r = 1; r <= 10; r++) {
      for (let c = 1; c <= 10; c++) {
        const isHighlighted = r <= tableGrid.rows && c <= tableGrid.cols;
        squares.push(
          <div
            key={`${r}-${c}`}
            className={cn(
              "w-4 h-4 border border-border/60 cursor-pointer transition-colors duration-700",
              isHighlighted ? "bg-primary border-primary" : "bg-muted/30 hover:bg-primary/20 hover:border-primary/50"
            )}
            onMouseEnter={() => setTableGrid({ rows: r, cols: c })}
            onClick={() => handleInsertGridTable(r, c)}
          />
        );
      }
    }
    return (
      <div className="p-2.5 flex flex-col gap-2 w-fit bg-popover rounded-lg">
        <div className="text-xs font-semibold text-muted-foreground border-b border-border/40 pb-1 mb-1">
          Insert Table
        </div>
        <div className="grid grid-cols-10 gap-0.5">
          {squares}
        </div>
        <div className="text-center text-xs font-semibold text-foreground/80 mt-1 select-none">
          {tableGrid.rows > 0 && tableGrid.cols > 0 ? `${tableGrid.rows} x ${tableGrid.cols}` : "Hover to select size"}
        </div>
      </div>
    );
  };

  return (
    <Plate
      editor={editor}
      onValueChange={(val) => {
        setInternalValue(val.value);

        // Dynamic active state updates
        setIsTableActive(editor.api.some({ match: { type: getCellTypes(editor) } }));
        setActiveColor((editor.api.marks()?.['color'] as string | undefined) || 'inherit');
        setActiveHighlight((editor.api.marks()?.['backgroundColor'] as string | undefined) || 'inherit');

        if (onChange) {
          let md = '';
          try {
            md = serializeMd(editor);
          } catch { /* ignore */ }

          serializeHtml(editor, { stripClassNames: true }).then((html) => {
            onChange(html, val.value, md);
          }).catch((e) => {
            console.error("HTML serialization error:", e);
            onChange('', val.value, md);
          });
        }
      }}
    >
      <EditorContainer>
        <FixedToolbar>
          <ToolbarGroup>
            <ToolbarButton tooltip="Heading 1" onClick={() => editor.tf.setNodes({ type: BaseH1Plugin.key })}>
              <Heading1Icon />
            </ToolbarButton>
            <ToolbarButton tooltip="Heading 2" onClick={() => editor.tf.setNodes({ type: BaseH2Plugin.key })}>
              <Heading2Icon />
            </ToolbarButton>
            <MarkToolbarButton nodeType={BaseBoldPlugin.key} tooltip="Bold (⌘+B)">
              <BoldIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={BaseItalicPlugin.key} tooltip="Italic (⌘+I)">
              <ItalicIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={BaseUnderlinePlugin.key} tooltip="Underline (⌘+U)">
              <UnderlineIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={BaseStrikethroughPlugin.key} tooltip="Strikethrough (⌘+Shift+M)">
              <StrikethroughIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={BaseCodePlugin.key} tooltip="Code (⌘+E)">
              <CodeIcon />
            </MarkToolbarButton>

            {/* Text Color Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <ToolbarButton tooltip="Text Color">
                  <div className="relative flex flex-col items-center justify-center">
                    <Type className="size-4" />
                    <span
                      className="absolute bottom-0 w-3.5 h-0.5 rounded-full"
                      style={{ backgroundColor: activeColor !== 'inherit' ? activeColor : 'currentColor' }}
                    />
                  </div>
                </ToolbarButton>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0 border border-border/80 rounded-lg shadow-md">
                <ColorPicker
                  title="Text Color"
                  activeValue={activeColor}
                  onSelect={(val) => {
                    if (val === 'inherit') {
                      editor.tf.removeMark('color');
                    } else {
                      editor.tf.addMark('color', val);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>

            {/* Highlight Color Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <ToolbarButton tooltip="Text Highlight">
                  <div className="relative flex flex-col items-center justify-center">
                    <Highlighter className="size-4" />
                    <span
                      className="absolute bottom-0 w-3.5 h-0.5 rounded-full"
                      style={{ backgroundColor: activeHighlight !== 'inherit' ? activeHighlight : 'transparent' }}
                    />
                  </div>
                </ToolbarButton>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0 border border-border/80 rounded-lg shadow-md">
                <ColorPicker
                  title="Text Highlight"
                  activeValue={activeHighlight}
                  onSelect={(val) => {
                    if (val === 'inherit') {
                      editor.tf.removeMark('backgroundColor');
                    } else {
                      editor.tf.addMark('backgroundColor', val);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>

            <ListToolbarButton nodeType="disc" tooltip="Bulleted List">
              <ListIcon />
            </ListToolbarButton>
            <ListToolbarButton nodeType="decimal" tooltip="Numbered List">
              <ListOrderedIcon />
            </ListToolbarButton>

            {/* Insert Table (Grid Popover) */}
            <Popover open={isTablePopoverOpen} onOpenChange={setIsTablePopoverOpen}>
              <PopoverTrigger asChild>
                <ToolbarButton tooltip="Table">
                  <TableIcon />
                </ToolbarButton>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0 border border-border/80 rounded-lg shadow-md">
                {renderGridSelector()}
              </PopoverContent>
            </Popover>

            <ToolbarButton tooltip="Insert Photo" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon />
            </ToolbarButton>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />

            {/* Contextual Table Tools */}
            {isTableActive && (
              <ToolbarGroup className="border-l border-border/50 pl-1.5 ml-1.5 flex items-center gap-0.5">
                <span className="text-[9px] uppercase font-extrabold text-muted-foreground/80 tracking-wider mr-1 select-none">Table:</span>
                <ToolbarButton tooltip="Insert Row Above" onClick={() => insertTableRow(editor, { before: true })}>
                  <ChevronUp className="size-4" />
                </ToolbarButton>
                <ToolbarButton tooltip="Insert Row Below" onClick={() => insertTableRow(editor)}>
                  <ChevronDown className="size-4" />
                </ToolbarButton>
                <ToolbarButton tooltip="Insert Column Left" onClick={() => insertTableColumn(editor, { before: true })}>
                  <ChevronLeft className="size-4" />
                </ToolbarButton>
                <ToolbarButton tooltip="Insert Column Right" onClick={() => insertTableColumn(editor)}>
                  <ChevronRight className="size-4" />
                </ToolbarButton>
                <ToolbarButton tooltip="Delete Row" onClick={() => deleteRow(editor)}>
                  <Trash2 className="size-4 text-destructive/80 hover:text-destructive" />
                </ToolbarButton>
                <ToolbarButton tooltip="Delete Column" onClick={() => deleteColumn(editor)}>
                  <Trash2 className="size-4 text-destructive/80 hover:text-destructive rotate-90" />
                </ToolbarButton>
                <ToolbarButton tooltip="Delete Table" onClick={() => deleteTable(editor)}>
                  <X className="size-4 text-destructive/85 hover:text-destructive border border-destructive/20 rounded-md p-px" />
                </ToolbarButton>

                {/* Cell Background Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <ToolbarButton tooltip="Cell Background">
                      <PaintBucket className="size-4" />
                    </ToolbarButton>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0 border border-border/80 rounded-lg shadow-md">
                    <ColorPicker
                      title="Cell Color"
                      onSelect={(val) => {
                        setCellBackground(editor, { color: val === 'inherit' ? '' : val });
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </ToolbarGroup>
            )}
          </ToolbarGroup>
        </FixedToolbar>
        <Editor variant="demo" placeholder="Type..." />
      </EditorContainer>
      <ConfirmDialog
        isOpen={compressionDialog.isOpen}
        title="Compress Image?"
        description={`The image "${compressionDialog.fileName}" is very large (${compressionDialog.fileSizeMB} MB). Next.js limits server action uploads to 10MB. Would you like to compress it to under 10MB to ensure it uploads successfully?`}
        confirmText="Compress & Upload"
        cancelText="Cancel Upload"
        onConfirm={compressionDialog.onConfirm}
        onClose={compressionDialog.onCancel}
      />
    </Plate>
  );
}
