export type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  invalid?: boolean;
};

