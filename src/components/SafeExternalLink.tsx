import React from "react";
import { ensureAbsoluteUrl, isValidArticleUrl } from "../utils/linkHelper";
import { ExternalLink as ExternalLinkIcon, Link2Off } from "lucide-react";

export interface SafeExternalLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href?: string | null;
  headline?: string;
  publication?: string;
  personOrQuery?: string;
  showIcon?: boolean;
  iconPosition?: "left" | "right";
  iconClassName?: string;
  children?: React.ReactNode;
  fallbackText?: string;
  showUnavailableBadge?: boolean;
  stopPropagationOnClick?: boolean;
}

/**
 * Universal safe external link wrapper.
 * Strictly guarantees:
 * - Always opens external URLs safely (target="_blank", rel="noopener noreferrer")
 * - Sanitizes URLs to prevent relative/internal route collisions
 * - Gracefully renders fallback/disabled badges when no valid URL is provided
 */
export const SafeExternalLink: React.FC<SafeExternalLinkProps> = ({
  href,
  headline,
  publication,
  personOrQuery,
  showIcon = false,
  iconPosition = "right",
  iconClassName = "w-3.5 h-3.5 inline ml-1 shrink-0",
  children,
  className = "",
  showUnavailableBadge = false,
  stopPropagationOnClick = true,
  onClick,
  ...rest
}) => {
  const isDirectValid = isValidArticleUrl(href);
  const cleanUrl = ensureAbsoluteUrl(href, headline, publication, personOrQuery);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (stopPropagationOnClick) {
      e.stopPropagation();
    }
    if (onClick) {
      onClick(e);
    }
  };

  if (!isDirectValid && showUnavailableBadge) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-mono ${className}`}
        title="Direct article URL unavailable"
      >
        <Link2Off className="w-3 h-3 text-amber-600 shrink-0" />
        <span>{children || "Link Unavailable"}</span>
      </span>
    );
  }

  return (
    <a
      href={cleanUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
      {...rest}
    >
      {showIcon && iconPosition === "left" && (
        <ExternalLinkIcon className={iconClassName} />
      )}
      {children}
      {showIcon && iconPosition === "right" && (
        <ExternalLinkIcon className={iconClassName} />
      )}
    </a>
  );
};

export default SafeExternalLink;
