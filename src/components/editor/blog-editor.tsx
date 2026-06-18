'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Plate, usePlateEditor, PlateElement, PlateElementProps } from 'platejs/react';
import { LinkPlugin } from '@platejs/link/react';
import { serializeMd } from '@platejs/markdown';
import { serializeHtml } from '@platejs/core/static';
import { ListPlugin, useListToolbarButton, useListToolbarButtonState } from '@platejs/list/react';
import { IndentPlugin } from '@platejs/indent/react';
import { TablePlugin, TableRowPlugin, TableCellPlugin, TableCellHeaderPlugin } from '@platejs/table/react';
import { ImagePlugin } from '@platejs/media/react';
import { FontColorPlugin, FontBackgroundColorPlugin } from '@platejs/basic-styles/react';

import {
  insertTable,
  insertTableRow,
  insertTableColumn,
  deleteRow,
  deleteColumn,
  deleteTable,
  setCellBackground,
  getCellTypes,
  getEmptyTableNode
} from '@platejs/table';

import { Badge } from '@/components/ui/badge';
import { useWritingAssist } from '@/components/editor/hooks/useWritingAssist';
import { useEditorPrefsStore } from '@/lib/stores/editor-prefs-store';
import { BasicNodesKit } from '@/components/editor/plugins/basic-nodes-kit';
import { EmojiKit } from '@/components/editor/plugins/emoji-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { Toolbar, ToolbarButton } from '@/components/ui/toolbar';
import { MarkToolbarButton } from '@/components/ui/mark-toolbar-button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MediaSelectorModal } from '@/components/MediaSelectorModal';
import { EmojiPickerButton } from '@/components/ui/emoji-picker-button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

import { RevisionCompareDialog } from '@/app/dashboard/blogs/RevisionCompareDialog'
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
  X,
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  Rocket,
  Plus,
  Settings,
  Sparkles,
  Link2,
  Wand2,
  BarChart2,
  BotOff,
} from 'lucide-react';
import { BaseBoldPlugin, BaseItalicPlugin, BaseUnderlinePlugin, BaseStrikethroughPlugin, BaseCodePlugin, BaseH1Plugin, BaseH2Plugin } from '@platejs/basic-nodes';
import { ListElement, ListItemElement } from '@/components/ui/list-node';
import { TableElement, TableRowElement, TableCellElement, TableCellHeaderElement } from '@/components/ui/table-element';
import { ImageElement } from '@/components/ui/image-element';

interface Category {
  id: string;
  name: string;
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
    <div className="p-2.5 flex flex-col gap-2 w-48 bg-popover rounded-xl border border-border/60">
      <div className="text-xs font-semibold text-muted-foreground border-b border-border/30 pb-1 mb-1">
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
                "w-7 h-7 rounded-lg border border-border flex items-center justify-center cursor-pointer transition-all duration-100 hover:scale-105",
                isActive ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
              )}
              style={isDefault ? {} : { backgroundColor: c.value }}
            >
              {isDefault && (
                <X className="size-3 text-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const SIDE_RIGHT = { side: 'right' as const };

function LinkElement({ className, ...props }: PlateElementProps) {
  const url = (props.element as any)?.url || '';
  const PlateElementAny = PlateElement as any;
  return (
    <PlateElementAny
      as="a"
      className={cn(className, 'text-primary underline cursor-pointer hover:opacity-80')}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {props.children}
    </PlateElementAny>
  );
}



function ListToolbarButton({ nodeType, children, tooltip }: { nodeType: string, children: React.ReactNode, tooltip: string }) {
  const state = useListToolbarButtonState({ nodeType });
  const { props } = useListToolbarButton(state);
  return (
    <ToolbarButton tooltip={tooltip} size="sm" tooltipContentProps={SIDE_RIGHT} {...props}>
      {children}
    </ToolbarButton>
  );
}

export function BlogEditor({ aiConfigured = true, isAdmin = false }: { aiConfigured?: boolean; isAdmin?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPostId = searchParams.get('id');

  // Core Post State
  const [id, setId] = useState<string | null>(initialPostId);
  const [featured, setFeatured] = useState(false);
  // parentPostId is set when editing a draft revision of a published post
  const [parentPostId, setParentPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [contentJson, setContentJson] = useState<any[]>([{ children: [{ text: '' }], type: 'p' }]);
  const [published, setPublished] = useState(false);
  const [featuredImageId, setFeaturedImageId] = useState<string | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [tagInputValue, setTagInputValue] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  // Editor states
  const [isTableActive, setIsTableActive] = useState(false);
  const [activeColor, setActiveColor] = useState('inherit');
  const [activeHighlight, setActiveHighlight] = useState('inherit');
  const [tableGrid, setTableGrid] = useState({ rows: 0, cols: 0 });
  const [isTablePopoverOpen, setIsTablePopoverOpen] = useState(false);

  // Categories management
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [isAddCatDialogOpen, setIsAddCatDialogOpen] = useState(false);

  // Auto save and publishing states
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isPublishing, setIsPublishing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialLoadDone = useRef(false);
  const skipNextLoadRef = useRef(false);
  const ghostSpanRef = useRef<HTMLSpanElement | null>(null);

  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteDialogOpen, setRewriteDialogOpen] = useState(false);
  const [rewriteResult, setRewriteResult] = useState('');
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [isLoadingTitles, setIsLoadingTitles] = useState(false);
  const [analysisPopoverOpen, setAnalysisPopoverOpen] = useState(false);
  const [titlePopoverOpen, setTitlePopoverOpen] = useState(false);

  // Extract plain text from contentJson for writing assist
  const plainTextForAssist = React.useMemo(() => {
    function extract(nodes: any[]): string {
      return nodes.map(n => {
        if (typeof n.text === 'string') return n.text;
        if (n.children) return extract(n.children);
        return '';
      }).join(' ').replace(/\s+/g, ' ').trim();
    }
    return extract(contentJson);
  }, [contentJson]);

  const { aiEnabled: aiEnabledPref, toggleAI } = useEditorPrefsStore();
  const aiEnabled = aiConfigured ? aiEnabledPref : false;
  const { grammarIssues, ghostSuggestion, ghostPartial, isGrammarChecking, dismissGhost, readabilityStats } = useWritingAssist(plainTextForAssist, aiEnabled);

  // Inject ghost text span directly at cursor position in the DOM
  const removeGhostSpan = React.useCallback(() => {
    if (ghostSpanRef.current) {
      try { ghostSpanRef.current.remove(); } catch { /* ignore */ }
      ghostSpanRef.current = null;
    }
  }, []);

  // Keep refs in sync so native event handlers always see the latest values
  const ghostSuggestionRef = useRef('');
  const ghostPartialRef = useRef('');
  useEffect(() => { ghostSuggestionRef.current = ghostSuggestion; }, [ghostSuggestion]);
  useEffect(() => { ghostPartialRef.current = ghostPartial; }, [ghostPartial]);

  useEffect(() => {
    removeGhostSpan();
    if (!ghostSuggestion) return;

    const timer = setTimeout(() => {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const range = sel.getRangeAt(0).cloneRange();
      range.collapse(false);
      const rect = range.getBoundingClientRect();
      if (!rect.left && !rect.top) return;

      const span = document.createElement('span');
      span.setAttribute('data-ghost-overlay', '1');
      span.textContent = ghostSuggestion;
      span.style.cssText = [
        'position:fixed',
        `top:${rect.top}px`,
        `left:${rect.right + 1}px`,
        'color:#9ca3af',
        'font-style:italic',
        'pointer-events:none',
        'user-select:none',
        'z-index:9999',
        'font-size:1rem',
        `line-height:${rect.height}px`,
      ].join(';');
      document.body.appendChild(span);
      ghostSpanRef.current = span;
    }, 50);

    return () => {
      clearTimeout(timer);
      removeGhostSpan();
    };
  }, [ghostSuggestion, removeGhostSpan]);

  const editor = usePlateEditor({
    plugins: [
      ...BasicNodesKit,
      ...EmojiKit,
      ListPlugin,
      IndentPlugin,
      TablePlugin,
      TableRowPlugin,
      TableCellPlugin,
      TableCellHeaderPlugin,
      ImagePlugin,
      FontColorPlugin,
      FontBackgroundColorPlugin,
      LinkPlugin,
    ],
    override: {
      components: {
        ul: (props: any) => <ListElement variant="ul" {...props} />,
        ol: (props: any) => <ListElement variant="ol" {...props} />,
        li: ListItemElement,
        table: TableElement,
        tr: TableRowElement,
        td: TableCellElement,
        th: TableCellHeaderElement,
        img: ImageElement,
        a: LinkElement,
      }
    },
    value: contentJson,
  });

  const uploadImageFn = useCallback(async (file: File, uploadId: string) => {
    const findNodePath = () => {
      const entries = editor.api.nodes({
        at: [],
        match: (n: any) => n.type === 'img' && n.uploadId === uploadId
      });
      const next = entries.next();
      return next.value ? next.value[1] : null;
    };

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
    formData.append('file', file);

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

  (editor as any).uploadImage = uploadImageFn;


  // Capture-phase Tab handler — fires before Plate's IndentPlugin
  useEffect(() => {
    const onTabCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const suggestion = ghostSuggestionRef.current;
      if (!suggestion) return;
      e.preventDefault();
      e.stopPropagation();
      removeGhostSpan();

      const partial = ghostPartialRef.current;
      const { selection } = editor;

      try {
        if (partial && selection) {
          // Mid-word: delete the partial the user already typed, insert the full word
          const [leaf] = editor.api.node(selection.focus.path) as [any, any];
          const textBefore = (leaf?.text as string || '').slice(0, selection.focus.offset);
          const actualPartial = textBefore.match(/\S+$/)?.[0] || '';
          const deleteLen = actualPartial.length;

          if (deleteLen > 0) {
            editor.tf.delete({
              at: {
                anchor: { path: selection.focus.path, offset: selection.focus.offset - deleteLen },
                focus: selection.focus,
              },
            });
          }
          editor.tf.insertText(suggestion);
        } else if (selection) {
          // Next-word: add a space only if the cursor isn't already after one
          const [leaf] = editor.api.node(selection.focus.path) as [any, any];
          const textBefore = (leaf?.text as string || '').slice(0, selection.focus.offset);
          const lastChar = textBefore.slice(-1);
          const prefix = lastChar && lastChar !== ' ' ? ' ' : '';
          editor.tf.insertText(prefix + suggestion);
        } else {
          editor.tf.insertText(suggestion);
        }
      } catch {
        editor.tf.insertText(suggestion);
      }

      dismissGhost();
      ghostSuggestionRef.current = '';
      ghostPartialRef.current = '';
    };
    document.addEventListener('keydown', onTabCapture, true);
    return () => document.removeEventListener('keydown', onTabCapture, true);
  }, [editor, removeGhostSpan, dismissGhost]);

  // Load categories and post data on mount / ID change
  useEffect(() => {
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        const { getCategories } = await import('@/app/dashboard/blogs/actions');
        const cats = await getCategories();
        setAvailableCategories(cats || []);

        if (id) {
          const { getPostById } = await import('@/app/dashboard/blogs/actions');
          const post = await getPostById(id);
          if (post) {
            // --- Revision mode detection ---
            if (post.published && !post.draftParentId) {
              // This is a published post. Load the pending revision if one exists,
              // otherwise we'll create one on the first save.
              const existingDraft = (post as any).drafts?.[0];
              if (existingDraft) {
                // Redirect editor to the revision
                setId(existingDraft.id);
                window.history.replaceState({}, '', `/editor?id=${existingDraft.id}`);
                setParentPostId(post.id);
                setTitle(existingDraft.title || "");
                // Show the proposed published slug (stored in metadata), not the --draft slug
                const proposedSlug = (existingDraft.metadata as any)?.proposedSlug || post.slug;
                setSlug(proposedSlug);
                setContent(existingDraft.content || "");
                setPublished(false);
                setFeatured(existingDraft.featured || false);
                setFeaturedImageId(existingDraft.featuredImageId || null);
                setFeaturedImageUrl(existingDraft.featuredImage?.url || null);
                setSelectedCategoryIds(existingDraft.categories.map((c: any) => c.categoryId));
                setSeoDescription((existingDraft.metadata as any)?.seoDescription || "");
                setTagsInput(((existingDraft.metadata as any)?.tags || []).join(", "));
                if (existingDraft.contentJson) {
                  const val = existingDraft.contentJson as any[];
                  setContentJson(val);
                  editor.tf.setValue(val);
                }
              } else {
                // No revision yet — load published content as starting point; revision created on first save
                setParentPostId(post.id);
                setTitle(post.title || "");
                setSlug(post.slug || "");
                setContent(post.content || "");
                setPublished(false);
                setFeatured(post.featured || false);
                setFeaturedImageId(post.featuredImageId || null);
                setFeaturedImageUrl(post.featuredImage?.url || null);
                setSelectedCategoryIds(post.categories.map(c => c.categoryId));
                setSeoDescription((post.metadata as any)?.seoDescription || "");
                setTagsInput(((post.metadata as any)?.tags || []).join(", "));
                if (post.contentJson) {
                  const val = post.contentJson as any[];
                  setContentJson(val);
                  editor.tf.setValue(val);
                }
              }
            } else if (post.draftParentId) {
              // Directly opened a revision — set parentPostId so publish button works correctly
              setParentPostId(post.draftParentId);
              setTitle(post.title || "");
              const proposedSlug = (post.metadata as any)?.proposedSlug || post.slug;
              setSlug(proposedSlug);
              setContent(post.content || "");
              setPublished(false);
              setFeatured(post.featured || false);
              setFeaturedImageId(post.featuredImageId || null);
              setFeaturedImageUrl(post.featuredImage?.url || null);
              setSelectedCategoryIds(post.categories.map(c => c.categoryId));
              setSeoDescription((post.metadata as any)?.seoDescription || "");
              setTagsInput(((post.metadata as any)?.tags || []).join(", "));
              if (post.contentJson) {
                const val = post.contentJson as any[];
                setContentJson(val);
                editor.tf.setValue(val);
              }
            } else {
              // Normal draft or new post
              setTitle(post.title || "");
              setSlug(post.slug || "");
              setContent(post.content || "");
              setPublished(post.published);
              setFeatured(post.featured || false);
              setFeaturedImageId(post.featuredImageId || null);
              setFeaturedImageUrl(post.featuredImage?.url || null);
              setSelectedCategoryIds(post.categories.map(c => c.categoryId));
              setSeoDescription((post.metadata as any)?.seoDescription || "");
              setTagsInput(((post.metadata as any)?.tags || []).join(", "));
              if (post.contentJson) {
                const val = post.contentJson as any[];
                setContentJson(val);
                editor.tf.setValue(val);
              }
            }
          } else {
            toast.error("Blog post not found.");
            setId(null); // Revert to new post mode
          }
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load post configuration");
      } finally {
        setLoading(false);
        // Delay to allow state settings to commit before enabling auto-save listener
        setTimeout(() => {
          initialLoadDone.current = true;
        }, 300);
      }
    }

    initialLoadDone.current = false;
    loadData();
  }, [id]);

  // DRAFT CREATION: Triggered explicitly when user commits the title (blur or Enter)
  const handleTitleCommit = async () => {
    if (id || !title.trim()) return;
    setSaveStatus('saving');
    try {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const { createPost } = await import('@/app/dashboard/blogs/actions');
      const defaultContent = [{ type: 'p', children: [{ text: '' }] }];

      const post = await createPost({
        title,
        slug: generatedSlug,
        content: content || '',
        contentJson: defaultContent,
        published: false,
        featured: false,
        categoryIds: selectedCategoryIds,
        metadata: {
          seoDescription,
          tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
        }
      });

      if (post) {
        skipNextLoadRef.current = true;
        setId(post.id);
        setSlug(post.slug);
        setSaveStatus('saved');
        initialLoadDone.current = true;
        const newUrl = `/editor?id=${post.id}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
        toast.success("Draft created!");
      }
    } catch (err: any) {
      console.error("Draft creation error:", err);
      setSaveStatus('error');
    }
  };

  // AUTO-SAVE: Automatically save changes for existing draft/post
  useEffect(() => {
    if (!id) return;
    if (!initialLoadDone.current) return;
    if (!title.trim()) {
      setSaveStatus('idle');
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const parsedTags = tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
        const saveData = {
          title,
          slug,
          content,
          contentJson,
          published: false,
          featured,
          featuredImageId,
          categoryIds: selectedCategoryIds,
          metadata: { seoDescription, tags: parsedTags },
        };

        if (parentPostId && id === parentPostId) {
          // Published parent with no revision yet — create the first revision
          const { upsertPostDraftRevision } = await import('@/app/dashboard/blogs/actions');
          const draft = await upsertPostDraftRevision(parentPostId, saveData);
          if (draft) {
            skipNextLoadRef.current = true;
            setId(draft.id);
            window.history.replaceState({}, '', `/editor?id=${draft.id}`);
          }
        } else {
          const { updatePost } = await import('@/app/dashboard/blogs/actions');
          await updatePost(id, { ...saveData, published, featured });
        }

        setSaveStatus('saved');
      } catch (err: any) {
        console.error("Autosave error:", err);
        setSaveStatus('error');
      }
    }, 1500);

    return () => clearTimeout(delayDebounceFn);
  }, [id, parentPostId, title, slug, content, contentJson, published, featured, featuredImageId, selectedCategoryIds, tagsInput, seoDescription]);

  // Handle publish / publish-revision
  const handlePublishToggle = async () => {
    if (!id) {
      toast.error("Please enter a title before publishing.");
      return;
    }

    // In revision mode: apply the revision to the parent and navigate back
    if (parentPostId) {
      try {
        setIsPublishing(true);
        const { publishPostDraftRevision } = await import('@/app/dashboard/blogs/actions');
        // id may still equal parentPostId if autosave hasn't fired yet — create the revision first
        let revisionId = id === parentPostId ? null : id;
        if (!revisionId) {
          const parsedTags = tagsInput.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
          const { upsertPostDraftRevision } = await import('@/app/dashboard/blogs/actions');
          const draft = await upsertPostDraftRevision(parentPostId, {
            title, slug, content, contentJson, published: false, featured, featuredImageId,
            categoryIds: selectedCategoryIds,
            metadata: { seoDescription, tags: parsedTags },
          });
          revisionId = draft?.id ?? null;
        }
        if (!revisionId) throw new Error("Could not create draft revision.");
        await publishPostDraftRevision(revisionId);
        toast.success("Revision published — live post updated!");
        router.push('/dashboard/blogs');
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to publish revision");
      } finally {
        setIsPublishing(false);
      }
      return;
    }

    // Normal publish toggle for unpublished drafts
    try {
      setIsPublishing(true);
      const { updatePost } = await import('@/app/dashboard/blogs/actions');
      const nextPublishedState = !published;
      const parsedTags = tagsInput.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
      const updated = await updatePost(id, {
        title, slug, content, contentJson,
        published: nextPublishedState,
        featured,
        featuredImageId,
        categoryIds: selectedCategoryIds,
        metadata: { seoDescription, tags: parsedTags },
      });
      if (updated) {
        setPublished(updated.published);
        toast.success(updated.published ? "Post published successfully!" : "Post reverted to draft.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update publish state");
    } finally {
      setIsPublishing(false);
    }
  };

  // Image insertion inside editor
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

    (editor as any).uploadImage(file, uploadId);
  };

  const handleOpenLinkDialog = () => {
    const selectedText = editor.selection ? editor.api.string(editor.selection) : "";
    setLinkText(selectedText);
    setLinkUrl("");
    setIsLinkDialogOpen(true);
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim() || !linkText.trim()) return;

    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    editor.tf.insertNodes([
      {
        type: 'a',
        url: formattedUrl,
        children: [{ text: linkText }]
      }
    ]);

    setIsLinkDialogOpen(false);
    setLinkText("");
    setLinkUrl("");
    toast.success("Link inserted!");
  };

  // Grid Table Selection helpers
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
              "w-4 h-4 border border-border/50 cursor-pointer transition-colors duration-200",
              isHighlighted ? "bg-primary border-primary" : "bg-muted/40 hover:bg-primary/20 hover:border-primary/50"
            )}
            onMouseEnter={() => setTableGrid({ rows: r, cols: c })}
            onClick={() => handleInsertGridTable(r, c)}
          />
        );
      }
    }
    return (
      <div className="p-2.5 flex flex-col gap-2 w-fit bg-popover rounded-xl border border-border/60 shadow-lg">
        <div className="text-xs font-semibold text-muted-foreground border-b border-border/30 pb-1 mb-1">
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

  // Categories helper state management
  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      setIsCreatingCategory(true);
      const { createCategory } = await import('@/app/dashboard/blogs/actions');
      const newCat = await createCategory(newCategoryName.trim());
      if (newCat) {
        setAvailableCategories(prev => [...prev, newCat]);
        setSelectedCategoryIds(prev => [...prev, newCat.id]);
        setNewCategoryName("");
        setIsAddCatDialogOpen(false);
        toast.success("Category created successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create category");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setDeletingCatId(catId);
      const { deleteCategory } = await import('@/app/dashboard/blogs/actions');
      await deleteCategory(catId);
      setAvailableCategories(prev => prev.filter(cat => cat.id !== catId));
      setSelectedCategoryIds(prev => prev.filter(id => id !== catId));
      toast.success("Category deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    } finally {
      setDeletingCatId(null);
    }
  };

  // Tags helper management
  const handleAddTag = (tag: string) => {
    const cleanTag = tag.trim().toLowerCase();
    if (!cleanTag) return;

    const currentTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    if (!currentTags.includes(cleanTag)) {
      const newTags = [...currentTags, cleanTag];
      setTagsInput(newTags.join(', '));
    }
    setTagInputValue("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t !== tagToRemove && t.length > 0);
    setTagsInput(newTags.join(', '));
  };
  const handleAIRewrite = async () => {
    const selectedText = editor.selection ? editor.api.string(editor.selection) : '';
    if (!selectedText) {
      toast.error('Select some text to rewrite.');
      return;
    }
    setIsRewriting(true);
    try {
      const res = await fetch('/api/ai/writing-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rewrite', text: selectedText }),
      });
      const { rewritten } = await res.json();
      if (rewritten) {
        setRewriteResult(rewritten);
        setRewriteDialogOpen(true);
      }
    } catch {
      toast.error('AI rewrite failed. Make sure Ollama is running.');
    } finally {
      setIsRewriting(false);
    }
  };

  const applyRewrite = () => {
    if (rewriteResult && editor.selection) {
      editor.tf.insertText(rewriteResult);
      setRewriteDialogOpen(false);
      setRewriteResult('');
      toast.success('Text rewritten!');
    }
  };

  const handleGetTitles = async () => {
    if (!plainTextForAssist.trim()) {
      toast.error('Write some content first.');
      return;
    }
    setIsLoadingTitles(true);
    try {
      const res = await fetch('/api/ai/writing-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'titles', text: plainTextForAssist.slice(0, 1000) }),
      });
      const { titles } = await res.json();
      setTitleSuggestions(titles || []);
    } catch {
      toast.error('Could not generate titles. Make sure Ollama is running.');
    } finally {
      setIsLoadingTitles(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd+: or Ctrl+: → focus editor and insert ':' to trigger emoji combobox
    if ((e.metaKey || e.ctrlKey) && e.key === ':') {
      e.preventDefault();
      editor.tf.focus();
      editor.tf.insertText(':');
      return;
    }

    // Escaping table or blocks with Ctrl + Enter or Cmd + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();

      const parentTable = editor.api.node({
        match: { type: 'table' }
      });

      if (parentTable) {
        const tablePath = parentTable[1];
        const tableIndex = tablePath[0];

        // Insert paragraph after the table
        editor.tf.insertNodes(
          [{ type: 'p', children: [{ text: '' }] }],
          { at: [tableIndex + 1], select: true }
        );
        toast.success("Moved past table - new line added!");
      } else {
        // If not in table, just add a paragraph below the current cursor selection
        editor.tf.insertNodes(
          [{ type: 'p', children: [{ text: '' }] }],
          { select: true }
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full gap-3 bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Setting up workspace...</p>
      </div>
    );
  }

  const getStats = () => {
    // Strip all HTML tags (no space replacement) + decode common HTML entities
    const plainText = content
      ? content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/gi, '')
      : '';
    const trimmed = plainText.trim();
    if (!trimmed) return { charCount: 0, wordCount: 0 };

    // Count grapheme clusters so emojis count as 1 character each
    let charCount = 0;
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
      for (const seg of segmenter.segment(trimmed)) {
        if ((seg.segment as string).trim().length > 0) charCount++;
      }
    } else {
      charCount = (trimmed.match(/\S/gu) ?? []).length;
    }

    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    return { charCount, wordCount };
  };
  const { charCount, wordCount } = getStats();

  const renderSettingsContent = () => {
    const renderCategoryCheckbox = (cat: Category) => {
      return (
        <div
          key={cat.id}
          className="flex items-center justify-between group p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
        >
          <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none flex-1 font-medium text-foreground/90">
            <input
              type="checkbox"
              checked={selectedCategoryIds.includes(cat.id)}
              onChange={() => toggleCategory(cat.id)}
              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 accent-primary cursor-pointer"
            />
            <span>{cat.name}</span>
          </label>

          <button
            type="button"
            disabled={deletingCatId === cat.id}
            onClick={(e) => handleDeleteCategory(cat.id, e)}
            className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 p-1 rounded transition-all disabled:opacity-50 text-muted-foreground/50 hover:text-destructive"
            title="Delete category"
          >
            {deletingCatId === cat.id ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Trash2 className="size-3" />
            )}
          </button>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Settings className="size-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground">Post Settings</h3>
        </div>

        {/* Featured Image Selector */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">Featured Image</Label>
          {featuredImageUrl ? (
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border/60 bg-muted/50 shadow-sm group">
              <img
                src={featuredImageUrl}
                alt="Featured image preview"
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="size-8 shadow-md hover:scale-105 transition-all"
                  onClick={() => {
                    setFeaturedImageId(null);
                    setFeaturedImageUrl(null);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-border/80 rounded-xl p-5 flex flex-col items-center justify-center text-center gap-2 bg-muted/5 select-none">
              <ImageIcon className="size-6 text-muted-foreground/35" />
              <span className="text-[10px] text-muted-foreground max-w-[150px] leading-snug">
                Pick a banner image to showcase on the list.
              </span>
            </div>
          )}

          <div className="flex justify-center pt-1">
            <MediaSelectorModal
              selectedMediaId={featuredImageId}
              onSelect={(media) => {
                setFeaturedImageId(media.id);
                setFeaturedImageUrl(media.url);
              }}
              triggerText={featuredImageUrl ? "Replace Banner" : "Choose Image"}
            />
          </div>
        </div>

        <Separator className="bg-border/60" />

        {/* Featured Post Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-muted/20">
          <div className="space-y-0.5 pr-2">
            <Label htmlFor="featured-toggle" className="text-xs font-semibold text-foreground/90 cursor-pointer">
              Featured Post
            </Label>
            <p className="text-[10px] text-muted-foreground leading-snug">
              Highlight this article in featured sections.
            </p>
          </div>
          <Switch
            id="featured-toggle"
            checked={featured}
            disabled={!isAdmin}
            onCheckedChange={setFeatured}
          />
        </div>

        <Separator className="bg-border/60" />

        {/* Category selection */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">Categories</Label>

          {/* Selected Categories Chips */}
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-6">
            {selectedCategoryIds.length === 0 ? (
              <span className="text-[11px] text-muted-foreground/55 italic">No categories selected</span>
            ) : (
              selectedCategoryIds.map(id => {
                const cat = availableCategories.find(c => c.id === id);
                if (!cat) return null;
                return (
                  <span key={cat.id} className="inline-flex items-center gap-1.5 text-[11px] bg-primary/8 text-primary border border-primary/15 px-2 py-0.5 rounded-lg font-semibold select-none">
                    {cat.name}
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className="text-primary/75 hover:text-primary hover:bg-primary/10 rounded-full p-px transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })
            )}
          </div>

          {/* Categories Popover Selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between text-xs font-semibold h-8.5 border-border/80 rounded-lg">
                <span>Manage Categories</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 p-2 border border-border/70 rounded-xl bg-popover shadow-md space-y-2">
              <div className="max-h-48 overflow-y-auto space-y-1 p-1">
                {availableCategories.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/50 text-center py-4 italic">
                    No categories defined.
                  </p>
                ) : (
                  availableCategories.map(renderCategoryCheckbox)
                )}
              </div>

              <Separator className="bg-border/60" />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full gap-1.5 text-xs font-bold text-primary hover:text-primary hover:bg-primary/5 h-8 justify-center rounded-lg"
                onClick={() => setIsAddCatDialogOpen(true)}
              >
                <Plus className="size-3.5" />
                Add New Category
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        <Separator className="bg-border/60" />

        {/* Tags input */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">Tags</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tagsInput
              .split(",")
              .map(t => t.trim())
              .filter(Boolean)
              .map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 text-[11px] bg-muted/60 border border-border/60 px-2 py-0.5 rounded-md text-foreground font-medium select-none">
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-muted-foreground/60 hover:text-foreground hover:bg-muted-foreground/15 rounded-full p-px transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))
            }
          </div>
          <Input
            value={tagInputValue}
            onChange={(e) => setTagInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag(tagInputValue);
              }
            }}
            placeholder="Press Enter to add tag..."
            className="text-xs bg-background/50 h-8 rounded-lg"
          />
        </div>

        <Separator className="bg-border/60" />

        {/* SEO Description input */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <Label className="text-xs font-semibold text-muted-foreground">SEO Description</Label>
          </div>
          <Textarea
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            placeholder="Enter a brief search snippet..."
            className="text-xs bg-background/50 min-h-[70px] resize-none rounded-xl"
          />
        </div>
      </div>
    );
  };

  return (
    <Plate
      editor={editor}
      onValueChange={(val) => {
        // Any content change clears ghost text immediately
        removeGhostSpan();
        dismissGhost();

        setContentJson(val.value);
        setIsTableActive(editor.api.some({ match: { type: getCellTypes(editor) } }));
        setActiveColor((editor.api.marks() as any)?.['color'] || 'inherit');
        setActiveHighlight((editor.api.marks() as any)?.['backgroundColor'] || 'inherit');

        // Ensure trailing paragraph if last node is a table
        const lastNode = val.value[val.value.length - 1];
        if (lastNode && lastNode.type === 'table') {
          Promise.resolve().then(() => {
            editor.tf.insertNodes(
              [{ type: 'p', children: [{ text: '' }] }],
              { at: [val.value.length] }
            );
          });
        }

        // Dynamic HTML & Markdown serialization for saves
        let md = '';
        try {
          md = serializeMd(editor as any);
        } catch (e) { /* ignore */ }

        serializeHtml(editor, { stripClassNames: true }).then((html) => {
          setContent(html || md || '');
        }).catch((e) => {
          console.error("HTML serialization error:", e);
          setContent(md || '');
        });
      }}
    >
      <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6 shadow-xs select-none">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/blogs')}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-150 cursor-pointer border-none bg-transparent outline-none"
            >
              <ArrowLeft className="size-3.5" />
              <span>Dashboard</span>
            </button>
            <div className="h-4 w-px bg-border/80" />

            {/* Autosave Status Indicator */}
            <div className="flex items-center gap-1.5 text-xs">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span className="hidden sm:inline">Saving...</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-emerald-500 font-semibold bg-emerald-500/10 dark:bg-emerald-500/5 px-2.5 py-0.5 rounded-full border border-emerald-500/15 transition-all duration-300">
                  <Check className="size-3" />
                  <span className="hidden sm:inline">{parentPostId ? 'Revision saved' : 'Saved to Drafts'}</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-destructive font-semibold bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/15">
                  <AlertCircle className="size-3" />
                  <span className="hidden sm:inline">Save Failed</span>
                </span>
              )}
              {saveStatus === 'idle' && id && (
                <span className="text-muted-foreground/60">Ready</span>
              )}
              {!id && (
                <span className="text-muted-foreground/60 italic hidden md:inline">{title.trim() ? 'Press Enter or click away to save draft' : 'Enter a title to begin'}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {aiConfigured && (
              <>
                {/* AI Writing Assist toggle */}
                <div className="hidden sm:flex items-center gap-2 border border-border/60 rounded-lg px-2.5 py-1.5 bg-muted/30 select-none">
                  {aiEnabled ? (
                    <BotOff className="size-3.5 text-muted-foreground/50" />
                  ) : (
                    <BotOff className="size-3.5 text-muted-foreground" />
                  )}
                  <Switch
                    id="ai-toggle"
                    checked={aiEnabled}
                    onCheckedChange={toggleAI}
                    className="scale-90"
                  />
                  <span className={cn('text-xs font-semibold transition-colors', aiEnabled ? 'text-primary' : 'text-muted-foreground/60')}>
                    AI
                  </span>
                </div>

                <div className="hidden sm:block h-4 w-px bg-border/60" />
              </>
            )}

            {aiConfigured && (
              <>
                {/* AI Rewrite */}
                <button
                  onClick={aiEnabled ? handleAIRewrite : () => toast.info('Turn on AI to use this feature.')}
                  disabled={aiEnabled && isRewriting}
                  title={aiEnabled ? 'AI Rewrite — select text first' : 'Enable AI to activate'}
                  className={cn(
                    'hidden sm:flex size-8 rounded-lg items-center justify-center transition-colors border border-transparent hover:border-border/60 hover:bg-muted/60',
                    !aiEnabled && 'opacity-40 cursor-default'
                  )}
                >
                  {isRewriting ? <Loader2 className="size-3.5 animate-spin text-primary" /> : <Wand2 className="size-3.5 text-primary" />}
                </button>

                {/* Writing Analysis */}
                {aiEnabled ? (
                  <Popover open={analysisPopoverOpen} onOpenChange={setAnalysisPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        title="Writing Analysis"
                        className="hidden sm:flex size-8 rounded-lg items-center justify-center transition-colors border border-transparent hover:border-border/60 hover:bg-muted/60 relative"
                      >
                        <BarChart2 className="size-3.5 text-primary" />
                        {(grammarIssues.length > 0 || readabilityStats.ruleIssues.length > 0) && (
                          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-500" />
                        )}
                        {isGrammarChecking && (
                          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-blue-400 animate-pulse" />
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="end" className="w-60 p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Writing Analysis</span>
                        {isGrammarChecking && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Readability</span>
                        <span className={cn('font-bold', readabilityStats.score >= 70 ? 'text-emerald-500' : readabilityStats.score >= 50 ? 'text-amber-500' : 'text-destructive')}>
                          {readabilityStats.score}/100
                        </span>
                      </div>
                      {readabilityStats.longSentences > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Long sentences</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-300">{readabilityStats.longSentences}</Badge>
                        </div>
                      )}
                      {readabilityStats.passiveVoice > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Passive voice</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-300">{readabilityStats.passiveVoice}</Badge>
                        </div>
                      )}
                      {readabilityStats.ruleIssues.slice(0, 3).map((issue, i) => (
                        <div key={i} className="text-[11px] bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-lg px-2.5 py-1.5">
                          <span className="font-medium text-amber-700 dark:text-amber-400">{issue.message}:</span>{' '}
                          <span className="text-muted-foreground italic">"{issue.text}"</span>
                        </div>
                      ))}
                      {grammarIssues.slice(0, 3).map((issue, i) => (
                        <div key={i} className="text-[11px] bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30 rounded-lg px-2.5 py-1.5">
                          <span className="text-muted-foreground">{issue.message}</span>
                          {issue.suggestion && <span className="ml-1 font-semibold text-primary">→ {issue.suggestion}</span>}
                        </div>
                      ))}
                      {grammarIssues.length === 0 && readabilityStats.ruleIssues.length === 0 && plainTextForAssist.length > 50 && !isGrammarChecking && (
                        <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5">
                          <div className="size-1.5 rounded-full bg-emerald-500" />
                          No issues found
                        </div>
                      )}
                      {plainTextForAssist.length <= 50 && (
                        <p className="text-[11px] text-muted-foreground/60 italic">Write more content to analyse…</p>
                      )}
                    </PopoverContent>
                  </Popover>
                ) : (
                  <button
                    onClick={() => toast.info('Turn on AI to use this feature.')}
                    title="Enable AI to activate"
                    className="hidden sm:flex size-8 rounded-lg items-center justify-center transition-colors border border-transparent hover:border-border/60 hover:bg-muted/60 opacity-40"
                  >
                    <BarChart2 className="size-3.5" />
                  </button>
                )}

                {/* AI Title Suggestions */}
                {aiEnabled ? (
                  <Popover open={titlePopoverOpen} onOpenChange={setTitlePopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        title="AI Title Ideas"
                        className="hidden sm:flex size-8 rounded-lg items-center justify-center transition-colors border border-transparent hover:border-border/60 hover:bg-muted/60"
                        onClick={() => { setTitlePopoverOpen(true); if (!titleSuggestions.length) handleGetTitles(); }}
                      >
                        <Sparkles className="size-3.5 text-primary" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="end" className="w-64 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">AI Title Ideas</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={handleGetTitles}
                          disabled={isLoadingTitles || !plainTextForAssist.trim()}
                        >
                          {isLoadingTitles ? <Loader2 className="size-3 animate-spin" /> : 'Regenerate'}
                        </Button>
                      </div>
                      {isLoadingTitles && <div className="text-xs text-muted-foreground text-center py-2">Generating…</div>}
                      {!isLoadingTitles && titleSuggestions.length === 0 && (
                        <p className="text-[11px] text-muted-foreground/60 italic">
                          {plainTextForAssist.trim() ? 'Click Regenerate to get title ideas.' : 'Write some content first.'}
                        </p>
                      )}
                      {titleSuggestions.map((t, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { setTitle(t); setTitlePopoverOpen(false); toast.success('Title applied!'); }}
                          className="w-full text-left text-xs px-2.5 py-2 rounded-lg hover:bg-muted transition-colors border border-border/40 text-foreground/80 hover:text-foreground"
                        >
                          {t}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                ) : (
                  <button
                    onClick={() => toast.info('Turn on AI to use this feature.')}
                    title="Enable AI to activate"
                    className="hidden sm:flex size-8 rounded-lg items-center justify-center transition-colors border border-transparent hover:border-border/60 hover:bg-muted/60 opacity-40"
                  >
                    <Sparkles className="size-3.5" />
                  </button>
                )}

                <div className="hidden sm:block h-4 w-px bg-border/60" />
              </>
            )}

            {id && (
              <Button
                variant="outline"
                size="sm"
                className="h-8.5 gap-1.5 text-xs font-semibold border-border/80"
                asChild
              >
                <a href={`/posts/preview?id=${id}`} target="_blank" rel="noopener noreferrer">
                  <Eye className="size-3.5 text-muted-foreground" />
                  Preview
                </a>
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              className="xl:hidden size-8.5 border-border/80 shrink-0"
              onClick={() => setIsSettingsOpen(true)}
              title="Post Settings"
            >
              <Settings className="size-4 text-muted-foreground" />
            </Button>

            {parentPostId && id && id !== parentPostId ? (
              <RevisionCompareDialog
                draftId={id}
                disabled={saveStatus === 'saving'}
                trigger={
                  <Button
                    size="sm"
                    className="h-8.5 gap-1.5 text-xs font-bold transition-all shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={saveStatus === 'saving'}
                  >
                    <Rocket className="size-3.5" />
                    Publish Revision
                  </Button>
                }
                onPublished={() => router.push('/dashboard/blogs')}
              />
            ) : (
              <Button
                size="sm"
                className={cn(
                  "h-8.5 gap-1.5 text-xs font-bold transition-all shadow-sm",
                  parentPostId
                    ? "bg-emerald-600/50 text-white opacity-60 cursor-not-allowed"
                    : published
                      ? "bg-amber-700 hover:bg-amber-600 text-white"
                      : "bg-primary text-primary-foreground hover:bg-primary/95"
                )}
                onClick={parentPostId ? undefined : handlePublishToggle}
                disabled={isPublishing || !!parentPostId}
                title={parentPostId ? "Make some changes first to create a revision" : undefined}
              >
                {isPublishing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Rocket className="size-3.5" />
                )}
                {parentPostId ? 'Publish Revision' : published ? 'Unpublish Post' : 'Publish Post'}
              </Button>
            )}
          </div>
        </header>

        {/* Revision mode banner */}
        {parentPostId && (
          <div className="flex items-center gap-2.5 px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs font-medium text-amber-700 dark:text-amber-400 select-none shrink-0">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>You&apos;re editing a <strong>draft revision</strong> of a published post. The live article is unchanged until you click <strong>Publish Revision</strong>.</span>
          </div>
        )}

        {/* Main Workspace Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

          {/* Left Side: Formatting Toolbar */}
          <Toolbar
            orientation="horizontal"
            className="md:w-12 md:h-full md:border-r md:border-b-0 md:flex-col flex-row w-full h-11 border-b border-r-0 overflow-x-auto shrink-0 select-none bg-card/30 flex gap-1.5 items-center py-1 md:py-4 px-3 justify-start scrollbar-hide"
          >

            {/* Headers */}
            <ToolbarButton size="sm" tooltip="Heading 1" tooltipContentProps={SIDE_RIGHT} onClick={() => editor.tf.setNodes({ type: BaseH1Plugin.key })}>
              <Heading1Icon className="size-4 text-foreground/80" />
            </ToolbarButton>
            <ToolbarButton size="sm" tooltip="Heading 2" tooltipContentProps={SIDE_RIGHT} onClick={() => editor.tf.setNodes({ type: BaseH2Plugin.key })}>
              <Heading2Icon className="size-4 text-foreground/80" />
            </ToolbarButton>

            <Separator className="md:w-6 md:h-px h-6 w-px my-1.5 md:my-1.5 bg-border/60 mx-1 md:mx-0" />

            {/* Standard Marks */}
            <MarkToolbarButton nodeType={BaseBoldPlugin.key} tooltip="Bold (⌘+B)" size="sm" tooltipContentProps={SIDE_RIGHT}>
              <BoldIcon className="size-4" />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={BaseItalicPlugin.key} tooltip="Italic (⌘+I)" size="sm" tooltipContentProps={SIDE_RIGHT}>
              <ItalicIcon className="size-4" />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={BaseUnderlinePlugin.key} tooltip="Underline (⌘+U)" size="sm" tooltipContentProps={SIDE_RIGHT}>
              <UnderlineIcon className="size-4" />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={BaseStrikethroughPlugin.key} tooltip="Strikethrough (⌘+Shift+M)" size="sm" tooltipContentProps={SIDE_RIGHT}>
              <StrikethroughIcon className="size-4" />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType={BaseCodePlugin.key} tooltip="Code (⌘+E)" size="sm" tooltipContentProps={SIDE_RIGHT}>
              <CodeIcon className="size-4" />
            </MarkToolbarButton>

            <Separator className="md:w-6 md:h-px h-6 w-px my-1.5 md:my-1.5 bg-border/60 mx-1 md:mx-0" />

            {/* Lists */}
            <ListToolbarButton nodeType="disc" tooltip="Bulleted List">
              <ListIcon className="size-4" />
            </ListToolbarButton>
            <ListToolbarButton nodeType="decimal" tooltip="Numbered List">
              <ListOrderedIcon className="size-4" />
            </ListToolbarButton>

            <Separator className="md:w-6 md:h-px h-6 w-px my-1.5 md:my-1.5 bg-border/60 mx-1 md:mx-0" />

            {/* Colors */}
            <Popover>
              <PopoverTrigger asChild>
                <ToolbarButton tooltip="Text Color" size="sm" tooltipContentProps={SIDE_RIGHT}>
                  <div className="relative flex flex-col items-center justify-center">
                    <Type className="size-4" />
                    <span
                      className="absolute bottom-0 w-3.5 h-0.5 rounded-full"
                      style={{ backgroundColor: activeColor !== 'inherit' ? activeColor : 'currentColor' }}
                    />
                  </div>
                </ToolbarButton>
              </PopoverTrigger>
              <PopoverContent align="start" side="right" className="w-auto p-0 border-none shadow-none z-50 ml-1">
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

            <Popover>
              <PopoverTrigger asChild>
                <ToolbarButton tooltip="Text Highlight" size="sm" tooltipContentProps={SIDE_RIGHT}>
                  <div className="relative flex flex-col items-center justify-center">
                    <Highlighter className="size-4" />
                    <span
                      className="absolute bottom-0 w-3.5 h-0.5 rounded-full"
                      style={{ backgroundColor: activeHighlight !== 'inherit' ? activeHighlight : 'transparent' }}
                    />
                  </div>
                </ToolbarButton>
              </PopoverTrigger>
              <PopoverContent align="start" side="right" className="w-auto p-0 border-none shadow-none z-50 ml-1">
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

            <Separator className="md:w-6 md:h-px h-6 w-px my-1.5 md:my-1.5 bg-border/60 mx-1 md:mx-0" />

            {/* Elements */}
            <Popover open={isTablePopoverOpen} onOpenChange={setIsTablePopoverOpen}>
              <PopoverTrigger asChild>
                <ToolbarButton tooltip="Table" size="sm" tooltipContentProps={SIDE_RIGHT}>
                  <TableIcon className="size-4 text-foreground/80" />
                </ToolbarButton>
              </PopoverTrigger>
              <PopoverContent align="start" side="right" className="w-auto p-0 border-none shadow-none z-50 ml-1">
                {renderGridSelector()}
              </PopoverContent>
            </Popover>

            <ToolbarButton tooltip="Insert Photo" onClick={() => fileInputRef.current?.click()} size="sm" tooltipContentProps={SIDE_RIGHT}>
              <ImageIcon className="size-4 text-foreground/80" />
            </ToolbarButton>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />

            <ToolbarButton tooltip="Insert Link" onClick={handleOpenLinkDialog} size="sm" tooltipContentProps={SIDE_RIGHT}>
              <Link2 className="size-4 text-foreground/80" />
            </ToolbarButton>

            <EmojiPickerButton />

            {/* Table context tools */}
            {isTableActive && (
              <>
                <Separator className="md:w-6 md:h-px h-6 w-px my-1.5 md:my-1.5 bg-border/60 mx-1 md:mx-0" />
                <div className="flex md:flex-col flex-row gap-1.5 items-center">
                  <span className="hidden md:inline text-[7px] uppercase font-extrabold text-muted-foreground/85 tracking-wider select-none">Grid</span>
                  <ToolbarButton size="sm" tooltip="Insert Row Above" tooltipContentProps={SIDE_RIGHT} onClick={() => insertTableRow(editor, { before: true })}>
                    <ChevronUp className="size-3.5" />
                  </ToolbarButton>
                  <ToolbarButton size="sm" tooltip="Insert Row Below" tooltipContentProps={SIDE_RIGHT} onClick={() => insertTableRow(editor)}>
                    <ChevronDown className="size-3.5" />
                  </ToolbarButton>
                  <ToolbarButton size="sm" tooltip="Insert Col Left" tooltipContentProps={SIDE_RIGHT} onClick={() => insertTableColumn(editor, { before: true })}>
                    <ChevronLeft className="size-3.5" />
                  </ToolbarButton>
                  <ToolbarButton size="sm" tooltip="Insert Col Right" tooltipContentProps={SIDE_RIGHT} onClick={() => insertTableColumn(editor)}>
                    <ChevronRight className="size-3.5" />
                  </ToolbarButton>
                  <ToolbarButton size="sm" tooltip="Delete Row" tooltipContentProps={SIDE_RIGHT} onClick={() => deleteRow(editor)}>
                    <Trash2 className="size-3.5 text-destructive/80" />
                  </ToolbarButton>
                  <ToolbarButton size="sm" tooltip="Delete Col" tooltipContentProps={SIDE_RIGHT} onClick={() => deleteColumn(editor)}>
                    <Trash2 className="size-3.5 text-destructive/80 rotate-90" />
                  </ToolbarButton>
                  <ToolbarButton size="sm" tooltip="Delete Table" tooltipContentProps={SIDE_RIGHT} onClick={() => deleteTable(editor)}>
                    <X className="size-3.5 text-destructive border border-destructive/20 rounded-md p-px" />
                  </ToolbarButton>

                  <Popover>
                    <PopoverTrigger asChild>
                      <ToolbarButton tooltip="Cell Color" size="sm" tooltipContentProps={SIDE_RIGHT}>
                        <PaintBucket className="size-3.5" />
                      </ToolbarButton>
                    </PopoverTrigger>
                    <PopoverContent align="start" side="right" className="w-auto p-0 border-none shadow-none z-50 ml-1">
                      <ColorPicker
                        title="Cell Background"
                        onSelect={(val) => {
                          setCellBackground(editor, { color: val === 'inherit' ? '' : val });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </Toolbar>

          {/* Center Column: Writing Canvas */}
          <div className="flex-1 overflow-y-auto bg-zinc-950/5 p-4 sm:p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-6">

              {/* Title input */}
              <input
                type="text"
                placeholder="Enter post title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleCommit}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTitleCommit(); } }}
                className="w-full text-4xl font-extrabold tracking-tight placeholder:text-muted-foreground/35 bg-transparent border-none outline-none focus:ring-0 focus:outline-none leading-tight py-2 border-b border-transparent focus:border-border/20 transition-all"
              />

              {/* URL Slug inline config */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted/40 px-3 py-2 rounded-xl border border-border/40 w-fit select-none shadow-2xs">
                <Link2 className="size-3.5 text-muted-foreground/60 shrink-0" />
                <span>slug: /posts/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                  placeholder="url-friendly-slug"
                  className="bg-transparent border-none outline-none focus:ring-0 font-mono text-xs w-56 text-foreground/80 font-medium"
                />
              </div>

              {/* Editor Workspace */}
              <div className="min-h-[500px] border border-border/40 rounded-2xl bg-card shadow-xs overflow-hidden flex flex-col justify-between">
                <EditorContainer className="flex-1 min-h-[450px]">
                  <Editor
                    variant="fullWidth"
                    placeholder="Start writing your story..."
                    className="p-8 text-base focus-visible:ring-0"
                    onKeyDown={handleKeyDown}
                    spellCheck
                    autoCorrect="on"
                    autoCapitalize="sentences"
                  />
                </EditorContainer>

                {/* Editor Footer: Stats & Shortcuts */}
                <div className="flex items-center justify-between px-6 py-3 border-t border-border/40 bg-muted/10 text-xs text-muted-foreground select-none">
                  <div className="flex items-center gap-4">
                    <span><strong>{wordCount}</strong> words</span>
                    <span className="h-3.5 w-px bg-border/60" />
                    <span><strong>{charCount}</strong> characters</span>
                  </div>
                  <div className="hidden sm:block text-[11px] text-muted-foreground/60">
                    Press <kbd className="px-1 py-0.5 bg-muted border border-border/80 rounded font-mono text-[9px] shadow-2xs">Cmd + Enter</kbd> or <kbd className="px-1 py-0.5 bg-muted border border-border/80 rounded font-mono text-[9px] shadow-2xs">Ctrl + Enter</kbd> to add a new line
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Settings Sidebar */}
          <aside className="hidden xl:block w-[310px] border-l border-border bg-card overflow-y-auto shrink-0 select-none p-6 space-y-6">
            {renderSettingsContent()}
          </aside>
        </div>
      </div>

      {/* Post Settings Sheet for Mobile/Tablet */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="right" className="w-[320px] sm:w-[400px] p-6 overflow-y-auto bg-card select-none">
          {renderSettingsContent()}
        </SheetContent>
      </Sheet>

      {/* AI Rewrite Result Dialog */}
      <Dialog open={rewriteDialogOpen} onOpenChange={setRewriteDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI Rewrite</DialogTitle>
            <DialogDescription>Review the rewritten text before applying.</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-muted/40 border border-border/60 p-4 text-sm text-foreground/90 max-h-48 overflow-y-auto">
            {rewriteResult}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setRewriteDialogOpen(false)} className="text-xs">
              Discard
            </Button>
            <Button type="button" size="sm" onClick={applyRewrite} className="text-xs font-semibold">
              <Wand2 className="size-3.5 mr-1.5" />
              Apply Rewrite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insert Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background border border-border">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>
              Add a link with custom display text and destination URL.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="link-text" className="text-xs font-semibold text-muted-foreground">Display Text</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="e.g. Visit Google"
                className="rounded-lg h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-url" className="text-xs font-semibold text-muted-foreground">Destination URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="e.g. google.com"
                className="rounded-lg h-9 text-sm"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLinkDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!linkUrl.trim() || !linkText.trim()}
              onClick={handleInsertLink}
              className="text-xs font-semibold bg-primary text-primary-foreground"
            >
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Plate>
  );
}
