import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { blogEditorExtensions } from "./blog/BlogEditorExtensions";
import { BlogEditorToolbar } from "./blog/BlogEditorToolbar";
import { BlogEditorStyles } from "./blog/BlogEditorStyles";
import "@/styles/emoji-picker-custom.css";

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
    extensions: blogEditorExtensions,
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose max-w-none min-h-[400px] p-8 focus:outline-none text-neutral-dark",
      },
    },
  });

  // Add this effect to sync editor content with value prop
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="w-full bg-base-light">
      <BlogEditorStyles />
      <BlogEditorToolbar editor={editor} />
      <div className="tiptap-editor-content">
        <EditorContent editor={editor} />
      </div>
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral/5 border-t border-neutral/10 text-xs text-neutral-dark/60">
        <div className="flex items-center gap-4">
          <span>
            {editor.storage.characterCount?.characters() ?? 0} characters
          </span>
          <span>{editor.storage.characterCount?.words() ?? 0} words</span>
        </div>
        <div className="flex items-center gap-2">
          {editor.isActive("link") && (
            <span className="text-primary font-medium">Link selected</span>
          )}
        </div>
      </div>
    </div>
  );
}
