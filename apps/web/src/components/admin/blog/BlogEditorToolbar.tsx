import React, { useState, useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Heading2 as Heading2Icon,
  Heading3 as Heading3Icon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
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
  Eraser,
  Youtube as YoutubeIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Theme } from "emoji-picker-react";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type MenuBarProps = {
  editor: Editor;
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
        : "text-neutral-dark hover:bg-neutral/5"
    } ${disabled ? "opacity-40 cursor-not-allowed" : "hover:shadow-sm"}`}
    title={label}
  >
    <Icon className="w-4 h-4" />
  </button>
);

export const BlogEditorToolbar = ({ editor }: MenuBarProps) => {
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

  return (
    <div className="sticky top-0 z-20 bg-base-light/95 backdrop-blur-sm border-b border-neutral/10 px-2 py-2 flex flex-wrap gap-1 items-center">
      {/* History */}
      <div className="flex items-center gap-0.5 mr-2">
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

      <div className="w-px h-5 bg-neutral/10 mx-1" />

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

      <div className="w-px h-5 bg-neutral/10 mx-1" />

      {/* Headings */}
      <div className="flex items-center gap-0.5">
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
      </div>

      <div className="w-px h-5 bg-neutral/10 mx-1" />

      {/* Lists & Alignment */}
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
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          label="Quote"
          icon={QuoteIcon}
        />
      </div>

      <div className="w-px h-5 bg-neutral/10 mx-1" />

      {/* Alignment */}
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
      </div>

      <div className="w-px h-5 bg-neutral/10 mx-1" />

      {/* Insert */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          label="Horizontal Rule"
          icon={MinusIcon}
        />
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
        <button
          ref={emojiButtonRef}
          type="button"
          onClick={() => setEmojiPickerOpen((v) => !v)}
          className="p-2 rounded-md transition-all duration-150 text-neutral-light hover:bg-neutral/5 hover:text-neutral-dark"
          title="Insert Emoji"
        >
          <Smile className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1" />

      {/* Clear Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        label="Clear Formatting"
        icon={Eraser}
      />

      {/* Table Modal */}
      {tableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-dark/50 backdrop-blur-sm">
          <div className="bg-base-light rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              className="absolute top-4 right-4 text-neutral-light hover:text-neutral-dark transition-colors"
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
                <label className="block text-sm font-medium text-neutral-light mb-1.5">
                  Rows
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableRows}
                  onChange={(e) => setTableRows(Number(e.target.value))}
                  className="w-full border border-neutral/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-base-light text-neutral-dark"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-light mb-1.5">
                  Columns
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableCols}
                  onChange={(e) => setTableCols(Number(e.target.value))}
                  className="w-full border border-neutral/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-base-light text-neutral-dark"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-neutral-light hover:bg-neutral/5 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-dark/50 backdrop-blur-sm">
          <div className="bg-base-light rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              className="absolute top-4 right-4 text-neutral-light hover:text-neutral-dark transition-colors"
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
              <label className="block text-sm font-medium text-neutral-light mb-1.5">
                URL
              </label>
              <input
                type="url"
                className="w-full border border-neutral/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-base-light text-neutral-dark"
                placeholder="https://example.com"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-neutral-light hover:bg-neutral/5 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-dark/50 backdrop-blur-sm">
          <div className="bg-base-light rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              className="absolute top-4 right-4 text-neutral-light hover:text-neutral-dark transition-colors"
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
              <label className="block text-sm font-medium text-neutral-light mb-1.5">
                Image URL
              </label>
              <input
                type="url"
                className="w-full border border-neutral/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-base-light text-neutral-dark"
                placeholder="https://example.com/image.jpg"
                value={uploadedUrl}
                onChange={(e) => setUploadedUrl(e.target.value)}
                autoFocus
              />
              {uploadedUrl && (
                <div className="mt-3 p-2 bg-neutral/5 rounded-lg">
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
                className="px-4 py-2 rounded-lg text-neutral-light hover:bg-neutral/5 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-dark/50 backdrop-blur-sm">
          <div className="bg-base-light rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              className="absolute top-4 right-4 text-neutral-light hover:text-neutral-dark transition-colors"
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
              <label className="block text-sm font-medium text-neutral-light mb-1.5">
                Video URL
              </label>
              <input
                type="url"
                className="w-full border border-neutral/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-base-light text-neutral-dark"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-neutral-light hover:bg-neutral/5 transition-colors"
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
          />
        </div>
      )}
    </div>
  );
};
