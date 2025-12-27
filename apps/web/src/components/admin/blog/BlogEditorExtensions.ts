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

export const blogEditorExtensions = [
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
];
