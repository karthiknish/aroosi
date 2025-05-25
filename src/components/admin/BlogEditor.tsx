import React, { useState } from "react";
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
} from "lucide-react";

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
      onClick: () =>
        editor
          .chain()
          .focus()
          .setImage({ src: prompt("Enter image URL") || "" })
          .run(),
      active: false,
    },
    {
      key: "table",
      icon: TableIcon,
      label: "Table",
      onClick: () =>
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
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

  // Add custom style for links in the editor
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
