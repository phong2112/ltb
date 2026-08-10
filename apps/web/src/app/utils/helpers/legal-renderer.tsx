/** Renders markdown-like legal copy into paragraphs, bullets, and bold spans. */
export function renderLegalBody(text: string) {
  return text.split("\n").map((line, index) => {
    if (!line.trim()) return <div key={index} className="h-2" />;
    if (line.startsWith("- ")) {
      return (
        <li key={index} className="ml-4 text-sm leading-relaxed text-foreground">
          {renderInline(line.slice(2))}
        </li>
      );
    }

    return (
      <p key={index} className="text-sm leading-relaxed text-foreground">
        {renderInline(line)}
      </p>
    );
  });
}

/** Supports the small inline **bold** syntax used in legal constants. */
function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
