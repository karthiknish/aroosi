import React from "react";

export const BlogEditorStyles = () => {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      .tiptap-editor-content a {
        color: hsl(var(--primary));
        text-decoration: underline;
        transition: color 0.2s;
      }
      .tiptap-editor-content a:hover {
        color: hsl(var(--accent));
      }
      .tiptap-editor-content table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
      }
      .tiptap-editor-content th {
        border: 1.5px solid hsl(var(--primary));
        background: hsl(var(--base));
        color: hsl(var(--accent));
        font-weight: 700;
        padding: 0.6em 0.9em;
        text-align: left;
      }
      .tiptap-editor-content td {
        border: 1px solid hsl(var(--neutral-light));
        padding: 0.5em 0.75em;
        text-align: left;
        background: hsl(var(--base-light));
      }
      .tiptap-editor-content tr:nth-child(even) td {
        background: hsl(var(--base));
      }
      .tiptap-editor-content blockquote {
        border-left: 4px solid hsl(var(--primary));
        background: hsl(var(--base));
        color: hsl(var(--accent));
        margin: 1em 0;
        padding: 0.75em 1.25em;
        font-style: italic;
        border-radius: 0.375em;
      }
      .tiptap-editor-content pre {
        background: hsl(var(--base));
        color: hsl(var(--accent));
        font-family: 'Fira Mono', 'Consolas', 'Menlo', monospace;
        padding: 1em;
        border-radius: 0.375em;
        overflow-x: auto;
        margin: 1em 0;
        font-size: 0.97em;
      }
      .tiptap-editor-content code {
        background: hsl(var(--base-dark));
        color: hsl(var(--accent));
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
        border-top: 2px solid hsl(var(--primary));
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
        box-shadow: 0 2px 8px 0 hsla(var(--primary), 0.08);
        resize: both;
        overflow: auto;
        min-width: 80px;
        min-height: 40px;
        background: hsl(var(--base-light));
      }
      .tiptap-editor-content iframe {
        width: 100%;
        height: auto;
        aspect-ratio: 16/9;
        border-radius: 0.5em;
        margin: 1.5em 0;
      }
    ` }} />
  );
};
