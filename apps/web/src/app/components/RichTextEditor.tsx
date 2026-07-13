import { useEffect, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { normalizeRichText, sanitizeRichText } from "@/app/lib/rich-text";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  invalid?: boolean;
};

function ToolbarButton({ active, disabled, label, onClick, children }: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-primary text-white" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  const editLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Nhập đường dẫn", previousUrl ?? "https://");

    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-white/70 px-2 py-1.5">
      <ToolbarButton label="In đậm" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></ToolbarButton>
      <ToolbarButton label="In nghiêng" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></ToolbarButton>
      <ToolbarButton label="Gạch chân" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={16} /></ToolbarButton>
      <ToolbarButton label="Gạch ngang" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton label="Tiêu đề" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={17} /></ToolbarButton>
      <ToolbarButton label="Danh sách dấu chấm" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={17} /></ToolbarButton>
      <ToolbarButton label="Danh sách đánh số" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={17} /></ToolbarButton>
      <ToolbarButton label="Trích dẫn" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></ToolbarButton>
      <ToolbarButton label="Chèn liên kết" active={editor.isActive("link")} onClick={editLink}><Link2 size={16} /></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton label="Hoàn tác" disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></ToolbarButton>
      <ToolbarButton label="Làm lại" disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></ToolbarButton>
    </div>
  );
}

export default function RichTextEditor({ value, onChange, label, placeholder, invalid }: RichTextEditorProps) {
  const editor = useEditor({
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
      onChange(currentEditor.isEmpty ? "" : sanitizeRichText(currentEditor.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) return;
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
