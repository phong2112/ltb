import { useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==";

type ImageWithFallbackProps = ImgHTMLAttributes<HTMLImageElement>;

export function ImageWithFallback({
  src,
  alt = "",
  style,
  className,
  onError,
  ...imageProps
}: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    onError?.(event);
    setDidError(true);
  }

  if (didError) {
    return (
      <div
        className={["inline-block bg-gray-100 text-center align-middle", className].filter(Boolean).join(" ")}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        style={style}
      >
        <div className="flex h-full w-full items-center justify-center">
          <img src={ERROR_IMG_SRC} alt="" aria-hidden="true" data-original-url={src} />
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      {...imageProps}
      onError={handleError}
    />
  );
}
