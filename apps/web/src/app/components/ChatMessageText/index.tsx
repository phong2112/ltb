import { Fragment } from "react";
import { Link } from "react-router";

const INTERNAL_JOB_PATH = /(\/jobs(?:\/[A-Za-z0-9_-]+(?:\/apply)?)?)/g;

type Props = { content: string; linkClassName?: string };

/** Renders chat text as plain text and links only internal /jobs paths, so bot output cannot inject markup or external links. */
export default function ChatMessageText({ content, linkClassName = "font-semibold underline underline-offset-2" }: Props) {
  const parts = content.split(INTERNAL_JOB_PATH);
  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, index) =>
        index % 2 === 1
          ? <Link key={index} to={part} className={linkClassName}>{part}</Link>
          : <Fragment key={index}>{part}</Fragment>,
      )}
    </p>
  );
}
