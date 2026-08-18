const defaultRedirectPath = "/";
const internalRedirectOrigin = "http://internal.local";

export function getSafeRedirectPath(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return defaultRedirectPath;
  }

  try {
    const destination = new URL(value, internalRedirectOrigin);

    if (destination.origin !== internalRedirectOrigin) {
      return defaultRedirectPath;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return defaultRedirectPath;
  }
}

export function getAuthLinkHref(pathname: "/login" | "/register", next: string) {
  if (next === defaultRedirectPath) {
    return pathname;
  }

  return `${pathname}?next=${encodeURIComponent(next)}`;
}
