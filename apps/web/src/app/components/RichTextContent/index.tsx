import { normalizeRichText } from "@/app/utils/helpers/rich-text";

export default function RichTextContent({ value, className = "" }: { value: string; className?: string }) {
  return <div className={`rich-text-content ${className}`} dangerouslySetInnerHTML={{ __html: normalizeRichText(value) }} />;
}
