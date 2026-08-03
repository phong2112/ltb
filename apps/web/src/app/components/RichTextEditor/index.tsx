import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { normalizeRichText, sanitizeRichText } from "@/app/utils/helpers/rich-text";
import { EditorToolbar } from "./components";
import type { RichTextEditorProps } from "./types";
import { isEditorUsable } from "./utils";

export default function RichTextEditor({ value, onChange, label, placeholder, invalid }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { autolink: true, defaultProtocol: "https", openOnClick: false, HTMLAttributes: { target: null, rel: "noopener noreferrer" } },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: normalizeRichText(value),
    editorProps: {
      attributes: {
        class: "rich-text-editor-content min-h-[120px] px-3 py-2.5 text-sm outline-none",
        "aria-label": label,
        "aria-multiline": "true",
        role: "textbox",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (!isEditorUsable(currentEditor)) return;
      onChange(currentEditor.isEmpty ? "" : sanitizeRichText(currentEditor.getHTML()));
    },
  });

  useEffect(() => {
    if (!isEditorUsable(editor)) return;
    const normalizedValue = normalizeRichText(value);
    if (editor.getHTML() !== normalizedValue) editor.commands.setContent(normalizedValue, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className={`overflow-hidden rounded-xl border bg-input-background transition-colors focus-within:border-primary ${invalid ? "border-red-300 focus-within:border-red-500" : "border-border"}`}>
      {editor && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
