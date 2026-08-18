interface SessionRetryButtonProps {
  href: string;
  className: string;
}

export function SessionRetryButton({
  href,
  className,
}: SessionRetryButtonProps) {
  return (
    <form action={href} method="get">
      <button type="submit" className={className}>
        Reintentar
      </button>
    </form>
  );
}
