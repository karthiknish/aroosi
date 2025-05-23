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
import History from "@tiptap/extension-history";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Heading1 as HeadingIcon,
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
  Eraser,
  Loader2,
} from "lucide-react";

const MenuBar = ({
  editor,
  onClean,
  cleaning,
}: {
  editor: Editor | null;
  onClean: () => void;
  cleaning: boolean;
}) => {
  const [hovered, setHovered] = useState<string | null>(null);
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
      icon: HeadingIcon,
      label: "H2",
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
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
      onClick: () =>
        editor
          .chain()
          .focus()
          .setLink({ href: prompt("Enter URL") || "" })
          .run(),
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
    {
      key: "clean",
      icon: Eraser,
      label: cleaning ? "Cleaning..." : "Clean Text",
      onClick: onClean,
      active: false,
    },
  ];
  return (
    <div className="flex flex-wrap gap-2 mb-2 sticky top-0 z-10 bg-white/90 backdrop-blur p-2 rounded-t-lg border-b border-gray-200 shadow-sm">
      {buttons.map((btn) => (
        <div key={btn.key} className="relative">
          <button
            type="button"
            onClick={btn.onClick}
            className={`px-2 py-1 rounded transition font-semibold border border-transparent hover:bg-pink-50 focus:bg-pink-100 flex items-center gap-1 ${btn.active ? "bg-pink-100 text-pink-600 border-pink-200" : "text-gray-700"} ${btn.key === "clean" && cleaning ? "opacity-60 cursor-not-allowed" : ""}`}
            onMouseEnter={() => setHovered(btn.key)}
            onMouseLeave={() => setHovered(null)}
            aria-label={btn.label}
            disabled={btn.key === "clean" && cleaning}
          >
            <btn.icon className="w-4 h-4" />
            {btn.key === "clean" && cleaning && (
              <Loader2 className="w-4 h-4 ml-1 animate-spin text-pink-500" />
            )}
          </button>
          {hovered === btn.key && (
            <div className="absolute left-1/2 -translate-x-1/2 -top-8 px-3 py-1 bg-gray-900 text-white text-xs rounded shadow z-50 whitespace-nowrap pointer-events-none">
              {btn.label}
            </div>
          )}
        </div>
      ))}
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
  const [cleaning, setCleaning] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Bold,
      Italic,
      Heading,
      BulletList,
      OrderedList,
      ListItem,
      Blockquote,
      Code,
      CodeBlock,
      HardBreak,
      HorizontalRule,
      History,
      Link,
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
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
    },
  });

  // Clean text handler
  const handleClean = async () => {
    if (!editor || !convertToMarkdownWithGemini) return;
    setCleaning(true);
    try {
      const html = editor.getHTML();
      // Use a new, more specific prompt for cleaning
      const prompt =
        "Clean and format this text for a blog post. Remove unnecessary whitespace, fix formatting, and ensure it is clear and well-structured. Do not add extra content.";
      const cleaned = await convertToMarkdownWithGemini(html, prompt);
      editor.commands.setContent(cleaned);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 rounded-lg shadow-lg border border-gray-200 bg-white">
      <MenuBar editor={editor} onClean={handleClean} cleaning={cleaning} />
      <EditorContent editor={editor} />
    </div>
  );
}
