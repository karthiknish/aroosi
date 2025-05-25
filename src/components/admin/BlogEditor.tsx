import React, { useState, useCallback, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
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
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Heading1 as HeadingIcon,
  Heading2 as Heading2Icon,
  Heading3 as Heading3Icon,
  Heading4 as Heading4Icon,
  Heading5 as Heading5Icon,
  Heading6 as Heading6Icon,
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
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Smile,
  PenTool as HighlightIcon,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import dynamic from "next/dynamic";
import { Theme } from "emoji-picker-react";
import "@/styles/emoji-picker-custom.css";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type MenuBarProps = {
  editor: Editor | null;
};

const MenuBar = ({ editor }: MenuBarProps) => {
  const [hovered, setHovered] = useState<string | null>(null);
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPopoverRef = useRef<HTMLDivElement>(null);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const uploadBlogImage = useMutation(api.images.uploadBlogImage);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length || !editor) return;
      setUploading(true);
      setUploadError(null);
      let objectUrl: string | null = null;
      try {
        const file = acceptedFiles[0];
        // 1. Get upload URL from backend
        const uploadUrl = await generateUploadUrl();
        if (typeof uploadUrl !== "string")
          throw new Error("Failed to get upload URL");
        // 2. Upload file to storage
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload image");
        const { storageId } = await uploadRes.json();
        // 3. Register image and get public URL
        const imageDoc = await uploadBlogImage({
          storageId,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        });
        if (!imageDoc?.url) throw new Error("Failed to get image URL");
        // 4. Insert image into editor
        editor.chain().focus().setImage({ src: imageDoc.url }).run();
        setImageModalOpen(false);
      } catch (err: any) {
        setUploadError(err.message || "Failed to upload image");
      } finally {
        setUploading(false);
        // Clean up any object URLs
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    },
    [editor, generateUploadUrl, uploadBlogImage]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

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
  const buttons = [
    {
      key: "bold",
      icon: BoldIcon,
      label: "Bold",
      onClick: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
    },
    {
      key: "italic",
      icon: ItalicIcon,
      label: "Italic",
      onClick: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
    },
    {
      key: "underline",
      icon: UnderlineIcon,
      label: "Underline",
      onClick: () => editor.chain().focus().toggleUnderline().run(),
      active: editor.isActive("underline"),
    },
    {
      key: "strike",
      icon: StrikeIcon,
      label: "Strikethrough",
      onClick: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive("strike"),
    },
    {
      key: "subscript",
      icon: SubscriptIcon,
      label: "Subscript",
      onClick: () => editor.chain().focus().toggleSubscript().run(),
      active: editor.isActive("subscript"),
    },
    {
      key: "superscript",
      icon: SuperscriptIcon,
      label: "Superscript",
      onClick: () => editor.chain().focus().toggleSuperscript().run(),
      active: editor.isActive("superscript"),
    },
    {
      key: "h1",
      icon: HeadingIcon,
      label: "H1",
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editor.isActive("heading", { level: 1 }),
    },
    {
      key: "h2",
      icon: Heading2Icon,
      label: "H2",
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
    },
    {
      key: "h3",
      icon: Heading3Icon,
      label: "H3",
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive("heading", { level: 3 }),
    },
    {
      key: "h4",
      icon: Heading4Icon,
      label: "H4",
      onClick: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
      active: editor.isActive("heading", { level: 4 }),
    },
    {
      key: "bulletList",
      icon: ListIcon,
      label: "List",
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
    },
    {
      key: "orderedList",
      icon: ListOrderedIcon,
      label: "1. List",
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
    },
    {
      key: "codeBlock",
      icon: CodeIcon,
      label: "Code",
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
      active: editor.isActive("codeBlock"),
    },
    {
      key: "blockquote",
      icon: QuoteIcon,
      label: "Quote",
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive("blockquote"),
    },
    {
      key: "hr",
      icon: MinusIcon,
      label: "HR",
      onClick: () => editor.chain().focus().setHorizontalRule().run(),
      active: false,
    },
    {
      key: "link",
      icon: LinkIcon,
      label: "Link",
      onClick: () => {
        setLinkSelection({
          from: editor.state.selection.from,
          to: editor.state.selection.to,
        });
        setLinkValue(editor.getAttributes("link").href || "");
        setLinkModalOpen(true);
      },
      active: editor.isActive("link"),
    },
    {
      key: "image",
      icon: ImageIcon,
      label: "Image",
      onClick: () => setImageModalOpen(true),
      active: false,
    },
    {
      key: "table",
      icon: TableIcon,
      label: "Table",
      onClick: () => setTableModalOpen(true),
      active: false,
    },
    {
      key: "undo",
      icon: UndoIcon,
      label: "Undo",
      onClick: () => editor.chain().focus().undo().run(),
      active: false,
    },
    {
      key: "redo",
      icon: RedoIcon,
      label: "Redo",
      onClick: () => editor.chain().focus().redo().run(),
      active: false,
    },
    {
      key: "highlight",
      icon: HighlightIcon,
      label: "Highlight",
      onClick: () => editor.chain().focus().toggleHighlight().run(),
      active: editor.isActive("highlight"),
    },
    {
      key: "emoji",
      icon: Smile,
      label: "Emoji",
      onClick: () => setEmojiPickerOpen((v) => !v),
      active: false,
      ref: emojiButtonRef,
    },
  ];
  return (
    <div className="flex flex-wrap gap-2 mb-2 sticky top-0 z-20 bg-white/95 backdrop-blur p-2 rounded-t-lg border-b border-gray-200 shadow-sm">
      {buttons.map((btn) => (
        <div key={btn.key} className="relative">
          <button
            type="button"
            onClick={btn.onClick}
            className={`px-2 py-1 rounded transition font-semibold border border-transparent hover:bg-pink-50 focus:bg-pink-100 flex items-center gap-1 ${btn.active ? "bg-pink-100 text-pink-600 border-pink-200" : "text-gray-700"}`}
            onMouseEnter={() => setHovered(btn.key)}
            onMouseLeave={() => setHovered(null)}
            aria-label={btn.label}
          >
            <btn.icon className="w-4 h-4" />
          </button>
          {hovered === btn.key && (
            <div className="absolute left-1/2 -translate-x-1/2 -top-8 px-3 py-1 bg-gray-900 text-white text-xs rounded shadow z-50 whitespace-nowrap pointer-events-none">
              {btn.label}
            </div>
          )}
        </div>
      ))}
      {/* Table Modal */}
      {tableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-xs w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => setTableModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold mb-4">Insert Table</h2>
            <div className="flex gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Rows
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableRows}
                  onChange={(e) => setTableRows(Number(e.target.value))}
                  className="w-16 border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Columns
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableCols}
                  onChange={(e) => setTableCols(Number(e.target.value))}
                  className="w-16 border rounded px-2 py-1"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                onClick={() => setTableModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1 rounded bg-pink-600 hover:bg-pink-700 text-white font-semibold"
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
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Link Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-xs w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => setLinkModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold mb-4">Insert Link</h2>
            <input
              type="url"
              className="w-full border rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="https://example.com"
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                onClick={() => setLinkModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1 rounded bg-pink-600 hover:bg-pink-700 text-white font-semibold"
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
                Insert
              </button>
              {editor && editor.isActive("link") && (
                <button
                  className="px-4 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 font-semibold"
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
                  Remove Link
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Image Upload Modal */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-xs w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => setImageModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold mb-4">Insert Image</h2>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${isDragActive ? "border-pink-500 bg-pink-50" : "border-gray-300 bg-gray-50"}`}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p className="text-pink-600 font-semibold">
                  Drop the image here ...
                </p>
              ) : (
                <>
                  <p className="text-gray-700">
                    Drag & drop an image here, or click to select
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    PNG, JPG, GIF, SVG, WebP supported
                  </p>
                </>
              )}
            </div>
            <div className="my-4 text-center text-gray-500 text-xs">or</div>
            <input
              type="url"
              className="w-full border rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="Paste image URL (https://...)"
              value={uploadedUrl}
              onChange={(e) => setUploadedUrl(e.target.value)}
              onBlur={() => {
                if (uploadedUrl) {
                  editor.chain().focus().setImage({ src: uploadedUrl }).run();
                  setImageModalOpen(false);
                  // If uploadedUrl is an object URL, revoke it
                  if (uploadedUrl.startsWith("blob:")) {
                    URL.revokeObjectURL(uploadedUrl);
                  }
                }
              }}
            />
            {uploading && (
              <div className="text-pink-600 text-sm mb-2">Uploading...</div>
            )}
            {uploadError && (
              <div className="text-red-600 text-sm mb-2">{uploadError}</div>
            )}
            <div className="flex gap-2 justify-end mt-2">
              <button
                className="px-4 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                onClick={() => setImageModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {emojiPickerOpen && (
        <div ref={emojiPopoverRef} className="absolute z-50 mt-2 left-0">
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
  convertToMarkdownWithGemini,
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
      Link,
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
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose max-w-none min-h-[300px] p-6 bg-gray-50 rounded-b-lg border border-gray-200 focus:outline-none shadow-md",
      },
      handleDOMEvents: {},
    },
  });

  // Add custom style for links and tables in the editor
  if (
    typeof window !== "undefined" &&
    !document.getElementById("tiptap-link-style")
  ) {
    const style = document.createElement("style");
    style.id = "tiptap-link-style";
    style.innerHTML = `
      .tiptap-editor-content a {
        color: #db2777;
        text-decoration: underline;
        transition: color 0.2s;
      }
      .tiptap-editor-content a:hover {
        color: #a21caf;
      }
      .tiptap-editor-content table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
      }
      .tiptap-editor-content th {
        border: 1.5px solid #e11d48;
        background: #ffe4e6;
        color: #be185d;
        font-weight: 700;
        padding: 0.6em 0.9em;
        text-align: left;
      }
      .tiptap-editor-content td {
        border: 1px solid #e5e7eb;
        padding: 0.5em 0.75em;
        text-align: left;
        background: #fff;
      }
      .tiptap-editor-content tr:nth-child(even) td {
        background: #f3f4f6;
      }
      .tiptap-editor-content blockquote {
        border-left: 4px solid #db2777;
        background: #fdf2f8;
        color: #a21caf;
        margin: 1em 0;
        padding: 0.75em 1.25em;
        font-style: italic;
        border-radius: 0.375em;
      }
      .tiptap-editor-content pre {
        background: #f3f4f6;
        color: #be185d;
        font-family: 'Fira Mono', 'Consolas', 'Menlo', monospace;
        padding: 1em;
        border-radius: 0.375em;
        overflow-x: auto;
        margin: 1em 0;
        font-size: 0.97em;
      }
      .tiptap-editor-content code {
        background: #fef3c7;
        color: #b45309;
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
        border-top: 2px solid #db2777;
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
        box-shadow: 0 2px 8px 0 rgba(219,39,119,0.08);
        resize: both;
        overflow: auto;
        min-width: 80px;
        min-height: 40px;
        background: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  return (
    <div className="max-w-2xl mx-auto my-8 rounded-lg shadow-lg border border-gray-200 bg-white">
      <MenuBar editor={editor} />
      <div className="tiptap-editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
