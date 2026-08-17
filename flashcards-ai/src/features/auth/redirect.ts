const defaultRedirectPath = "/";

export function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return defaultRedirectPath;
  }

  return value;
}

export function getAuthLinkHref(pathname: "/login" | "/register", next: string) {
  if (next === defaultRedirectPath) {
    return pathname;
  }

  return `${pathname}?next=${encodeURIComponent(next)}`;
}
