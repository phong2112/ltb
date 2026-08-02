import type { Editor } from "@tiptap/react";

export function isEditorUsable(editor: Editor | null): editor is Editor {
  return Boolean(editor && !editor.isDestroyed && editor.state?.schema);
}

