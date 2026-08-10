import type { Editor } from "@tiptap/react";

/** Guards TipTap commands from running after the editor has not mounted or was destroyed. */
export function isEditorUsable(editor: Editor | null): editor is Editor {
  return Boolean(editor && !editor.isDestroyed && editor.state?.schema);
}
