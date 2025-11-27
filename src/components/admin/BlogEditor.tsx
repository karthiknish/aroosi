/// <reference types="tiptap__core" />
import React, { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Blockquote from "@tiptap/extension-blockquote";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import HardBreak from "@tiptap/extension-hard-break";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import ImageResize from "tiptap-extension-resize-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Dropcursor from "@tiptap/extension-dropcursor";
import Gapcursor from "@tiptap/extension-gapcursor";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import FontFamily from "@tiptap/extension-font-family";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Heading1 as HeadingIcon,
  Heading2 as Heading2Icon,
  Heading3 as Heading3Icon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  Code as CodeIcon,
  Quote as QuoteIcon,
  Minus as MinusIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  X,
  Underline as UnderlineIcon,
  Strikethrough as StrikeIcon,
  Smile,
  PenTool as HighlightIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Eraser,
  Type,
  Youtube as YoutubeIcon,
  Type as FontIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Theme } from "emoji-picker-react";
import "@/styles/emoji-picker-custom.css";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type EditorType = NonNullable<ReturnType<typeof useEditor>>;

type MenuBarProps = {
  editor: EditorType;
};

// Toolbar button component for consistency
const ToolbarButton = ({
  onClick,
  active,
  disabled,
  label,
  icon: Icon,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  icon: React.ElementType;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-md transition-all duration-150 ${
      active
        ? "bg-primary text-white shadow-sm"
        : "text-neutral-dark hover:bg-neutral-100"
    } ${disabled ? "opacity-40 cursor-not-allowed" : "hover:shadow-sm"}`}
    title={label}
  >
    <Icon className="w-4 h-4" />
  </button>
);

// Toolbar divider
const ToolbarDivider = () => (
  <div className="w-px h-6 bg-neutral-200 mx-1" />
);

const MenuBar = ({ editor }: MenuBarProps) => {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkSelection, setLinkSelection] = useState<{
    from: number;
    to: number;
  } | null>(null);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!emojiPickerOpen) return;
    function handleClick(event: MouseEvent) {
      if (
        emojiPopoverRef.current &&
        !emojiPopoverRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setEmojiPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [emojiPickerOpen]);

  if (!editor) return null;

  const characterCount = editor.storage.characterCount;

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-neutral-200">
      {/* Main Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2">
        {/* History */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            label="Undo (Ctrl+Z)"
            icon={UndoIcon}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            label="Redo (Ctrl+Y)"
            icon={RedoIcon}
          />
        </div>

        <ToolbarDivider />

        {/* Text Formatting */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            label="Bold (Ctrl+B)"
            icon={BoldIcon}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            label="Italic (Ctrl+I)"
            icon={ItalicIcon}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            label="Underline (Ctrl+U)"
            icon={UnderlineIcon}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            label="Strikethrough"
            icon={StrikeIcon}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive("highlight")}
            label="Highlight"
            icon={HighlightIcon}
          />
        </div>

        <ToolbarDivider />

        {/* Fonts */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().setFontFamily("Inter").run()}
            active={editor.isActive("textStyle", { fontFamily: "Inter" })}
            label="Sans Serif"
            icon={FontIcon}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setFontFamily("serif").run()}
            active={editor.isActive("textStyle", { fontFamily: "serif" })}
            label="Serif"
            icon={() => <span className="font-serif text-xs font-bold">S</span>}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setFontFamily("monospace").run()}
            active={editor.isActive("textStyle", { fontFamily: "monospace" })}
            label="Monospace"
            icon={() => <span className="font-mono text-xs font-bold">M</span>}
          />
        </div>

        <ToolbarDivider />

        {/* Headings */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
            label="Heading 1"
            icon={HeadingIcon}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            label="Heading 2"
            icon={Heading2Icon}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
            label="Heading 3"
            icon={Heading3Icon}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            active={editor.isActive("paragraph")}
            label="Paragraph"
            icon={Type}
          />
        </div>

        <ToolbarDivider />

        {/* Text Alignment */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
            label="Align Left"
            icon={AlignLeft}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
            label="Align Center"
            icon={AlignCenter}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
            label="Align Right"
            icon={AlignRight}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            active={editor.isActive({ textAlign: "justify" })}
            label="Justify"
            icon={AlignJustify}
          />
        </div>

        <ToolbarDivider />

        {/* Lists */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            label="Bullet List"
            icon={ListIcon}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            label="Numbered List"
            icon={ListOrderedIcon}
          />
        </div>

        <ToolbarDivider />

        {/* Block Elements */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            label="Quote"
            icon={QuoteIcon}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive("codeBlock")}
            label="Code Block"
            icon={CodeIcon}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            label="Horizontal Rule"
            icon={MinusIcon}
          />
        </div>

        <ToolbarDivider />

        {/* Insert */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => {
              setLinkSelection({
                from: editor.state.selection.from,
                to: editor.state.selection.to,
              });
              setLinkValue((editor.getAttributes("link").href as string) || "");
              setLinkModalOpen(true);
            }}
            active={editor.isActive("link")}
            label="Insert Link"
            icon={LinkIcon}
          />
          <ToolbarButton
            onClick={() => setImageModalOpen(true)}
            label="Insert Image"
            icon={ImageIcon}
          />
          <ToolbarButton
            onClick={() => setYoutubeModalOpen(true)}
            label="Insert Youtube Video"
            icon={YoutubeIcon}
          />
          <ToolbarButton
            onClick={() => setTableModalOpen(true)}
            label="Insert Table"
            icon={TableIcon}
          />
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={() => setEmojiPickerOpen((v) => !v)}
            className="p-2 rounded-md transition-all duration-150 text-neutral-dark hover:bg-neutral-100 hover:shadow-sm"
            title="Insert Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>

        <ToolbarDivider />

        {/* Clear Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          label="Clear Formatting"
          icon={Eraser}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-50 border-t border-neutral-100 text-xs text-neutral-500">
        <div className="flex items-center gap-4">
          <span>{characterCount?.characters?.() ?? 0} characters</span>
          <span>{characterCount?.words?.() ?? 0} words</span>
        </div>
        <div className="flex items-center gap-2">
          {editor.isActive("link") && (
            <span className="text-primary">Link selected</span>
          )}
        </div>
      </div>

      {/* Table Modal */}
      {tableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
              onClick={() => setTableModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TableIcon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-dark">Insert Table</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                  Rows
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableRows}
                  onChange={(e) => setTableRows(Number(e.target.value))}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                  Columns
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableCols}
                  onChange={(e) => setTableCols(Number(e.target.value))}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
                onClick={() => setTableModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .insertTable({
                      rows: tableRows,
                      cols: tableCols,
                      withHeaderRow: true,
                    })
                    .run();
                  setTableModalOpen(false);
                  setTableRows(3);
                  setTableCols(3);
                }}
              >
                Insert Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
              onClick={() => setLinkModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <LinkIcon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-dark">
                {editor.isActive("link") ? "Edit Link" : "Insert Link"}
              </h2>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                URL
              </label>
              <input
                type="url"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="https://example.com"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
                onClick={() => setLinkModalOpen(false)}
              >
                Cancel
              </button>
              {editor.isActive("link") && (
                <button
                  className="px-4 py-2 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger font-medium transition-colors"
                  onClick={() => {
                    if (linkSelection && editor) {
                      editor
                        .chain()
                        .focus()
                        .setTextSelection({
                          from: linkSelection.from,
                          to: linkSelection.to,
                        })
                        .unsetLink()
                        .run();
                    }
                    setLinkModalOpen(false);
                  }}
                >
                  Remove
                </button>
              )}
              <button
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors disabled:opacity-50"
                onClick={() => {
                  if (linkSelection && editor) {
                    editor
                      .chain()
                      .focus()
                      .setTextSelection({
                        from: linkSelection.from,
                        to: linkSelection.to,
                      })
                      .setLink({ href: linkValue })
                      .run();
                  }
                  setLinkModalOpen(false);
                }}
                disabled={!linkValue}
              >
                {editor.isActive("link") ? "Update" : "Insert"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
              onClick={() => {
                setImageModalOpen(false);
                setUploadedUrl("");
              }}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-dark">Insert Image</h2>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                Image URL
              </label>
              <input
                type="url"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="https://example.com/image.jpg"
                value={uploadedUrl}
                onChange={(e) => setUploadedUrl(e.target.value)}
                autoFocus
              />
              {uploadedUrl && (
                <div className="mt-3 p-2 bg-neutral-50 rounded-lg">
                  <img
                    src={uploadedUrl}
                    alt="Preview"
                    className="max-h-32 mx-auto rounded object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
                onClick={() => {
                  setImageModalOpen(false);
                  setUploadedUrl("");
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors disabled:opacity-50"
                onClick={() => {
                  if (uploadedUrl) {
                    editor.chain().focus().setImage({ src: uploadedUrl }).run();
                    setImageModalOpen(false);
                    setUploadedUrl("");
                  }
                }}
                disabled={!uploadedUrl}
              >
                Insert Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Youtube Modal */}
      {youtubeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
              onClick={() => {
                setYoutubeModalOpen(false);
                setYoutubeUrl("");
              }}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <YoutubeIcon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-dark">Insert Youtube Video</h2>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                Video URL
              </label>
              <input
                type="url"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
                onClick={() => {
                  setYoutubeModalOpen(false);
                  setYoutubeUrl("");
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors disabled:opacity-50"
                onClick={() => {
                  if (youtubeUrl) {
                    editor.commands.setYoutubeVideo({ src: youtubeUrl });
                    setYoutubeModalOpen(false);
                    setYoutubeUrl("");
                  }
                }}
                disabled={!youtubeUrl}
              >
                Insert Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {emojiPickerOpen && (
        <div ref={emojiPopoverRef} className="absolute z-50 mt-2 right-4 shadow-xl rounded-xl overflow-hidden">
          <EmojiPicker
            onEmojiClick={({ emoji }) => {
              editor.chain().focus().insertContent(emoji).run();
              setEmojiPickerOpen(false);
            }}
            theme={Theme.LIGHT}
            width={320}
            height={400}
            className="aroosi-emoji-picker"
          />
        </div>
      )}
    </div>
  );
};

export default function BlogEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
  convertToMarkdownWithGemini?: (
    text: string,
    prompt?: string
  ) => Promise<string>;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Bold,
      Italic,
      Underline,
      Strike,
      Highlight,
      TextStyle,
      Color,
      Heading,
      BulletList,
      OrderedList,
      ListItem,
      Blockquote,
      Code,
      CodeBlock,
      HardBreak,
      HorizontalRule,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image,
      ImageResize,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Subscript,
      Superscript,
      TaskList,
      TaskItem,
      Typography,
      Placeholder.configure({ placeholder: "Write your blog post..." }),
      CharacterCount.configure({ limit: 20000 }),
      Dropcursor,
      Gapcursor,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Youtube.configure({
        controls: false,
      }),
      FontFamily,
    ],
    content: value,
    onUpdate: ({ editor }: { editor: EditorType }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose max-w-none min-h-[300px] p-6 bg-base-light rounded-b-lg border border-neutral-light/20 focus:outline-none shadow-sm",
      },
      handleDOMEvents: {},
    },
  });

  // Add this effect to sync editor content with value prop
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  // Add custom style for links and tables in the editor
  if (
    typeof window !== "undefined" &&
    !document.getElementById("tiptap-link-style")
  ) {
    const style = document.createElement("style");
    style.id = "tiptap-link-style";
    style.innerHTML = `
      .tiptap-editor-content a {
        color: var(--color-primary);
        text-decoration: underline;
        transition: color 0.2s;
      }
      .tiptap-editor-content a:hover {
        color: var(--color-accent);
      }
      .tiptap-editor-content table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
      }
      .tiptap-editor-content th {
        border: 1.5px solid var(--color-primary);
        background: var(--color-base);
        color: var(--color-accent);
        font-weight: 700;
        padding: 0.6em 0.9em;
        text-align: left;
      }
      .tiptap-editor-content td {
        border: 1px solid var(--color-neutral-light);
        padding: 0.5em 0.75em;
        text-align: left;
        background: var(--color-base-light);
      }
      .tiptap-editor-content tr:nth-child(even) td {
        background: var(--color-base);
      }
      .tiptap-editor-content blockquote {
        border-left: 4px solid var(--color-primary);
        background: var(--color-base);
        color: var(--color-accent);
        margin: 1em 0;
        padding: 0.75em 1.25em;
        font-style: italic;
        border-radius: 0.375em;
      }
      .tiptap-editor-content pre {
        background: var(--color-base);
        color: var(--color-accent);
        font-family: 'Fira Mono', 'Consolas', 'Menlo', monospace;
        padding: 1em;
        border-radius: 0.375em;
        overflow-x: auto;
        margin: 1em 0;
        font-size: 0.97em;
      }
      .tiptap-editor-content code {
        background: var(--color-base-dark);
        color: var(--color-accent);
        font-family: 'Fira Mono', 'Consolas', 'Menlo', monospace;
        padding: 0.15em 0.4em;
        border-radius: 0.3em;
        font-size: 0.97em;
      }
      .tiptap-editor-content pre code {
        background: none;
        color: inherit;
        padding: 0;
        border-radius: 0;
        font-size: inherit;
      }
      .tiptap-editor-content ul {
        list-style-type: disc;
        padding-left: 2em;
        margin: 1em 0;
      }
      .tiptap-editor-content ol {
        list-style-type: decimal;
        padding-left: 2em;
        margin: 1em 0;
      }
      .tiptap-editor-content ul ul,
      .tiptap-editor-content ol ul {
        list-style-type: circle;
        padding-left: 1.5em;
        margin: 0.5em 0;
      }
      .tiptap-editor-content ol ol,
      .tiptap-editor-content ul ol {
        list-style-type: lower-alpha;
        padding-left: 1.5em;
        margin: 0.5em 0;
      }
      .tiptap-editor-content li {
        margin-bottom: 0.25em;
      }
      .tiptap-editor-content hr {
        border: none;
        border-top: 2px solid var(--color-primary);
        margin: 2em 0;
        height: 0;
        background: none;
      }
      /* Hide consecutive hr elements visually */
      .tiptap-editor-content hr + hr {
        display: none;
      }
      .tiptap-editor-content h1 {
        font-size: 2.25rem;
        font-weight: 800;
        color: inherit;
        margin: 1.5em 0 0.7em 0;
        line-height: 1.1;
      }
      .tiptap-editor-content h2 {
        font-size: 1.75rem;
        font-weight: 700;
        color: inherit;
        margin: 1.3em 0 0.6em 0;
        line-height: 1.15;
      }
      .tiptap-editor-content h3 {
        font-size: 1.35rem;
        font-weight: 700;
        color: inherit;
        margin: 1.1em 0 0.5em 0;
        line-height: 1.18;
      }
      .tiptap-editor-content h4 {
        font-size: 1.1rem;
        font-weight: 600;
        color: inherit;
        margin: 1em 0 0.4em 0;
        line-height: 1.2;
      }
      .tiptap-editor-content h5 {
        font-size: 1rem;
        font-weight: 600;
        color: inherit;
        margin: 0.9em 0 0.3em 0;
        line-height: 1.22;
      }
      .tiptap-editor-content h6 {
        font-size: 0.95rem;
        font-weight: 600;
        color: inherit;
        margin: 0.8em 0 0.2em 0;
        line-height: 1.25;
      }
      .tiptap-editor-content img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 1.5em auto;
        border-radius: 0.5em;
        box-shadow: 0 2px 8px 0 rgba(var(--color-primary),0.08);
        resize: both;
        overflow: auto;
        min-width: 80px;
        min-height: 40px;
        background: var(--color-base-light);
      }
      .tiptap-editor-content iframe {
        width: 100%;
        height: auto;
        aspect-ratio: 16/9;
        border-radius: 0.5em;
        margin: 1.5em 0;
      }
    `;
    document.head.appendChild(style);
  }

  return (
    <div className="max-w-2xl mx-auto my-8 rounded-lg shadow-lg border border-neutral-light/20 bg-base-light">
      <MenuBar editor={editor} />
      <div className="tiptap-editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
