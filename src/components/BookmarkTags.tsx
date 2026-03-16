interface Props {
  tags: string[];
  className?: string;
}

export function BookmarkTags({ tags, className = "bookmark-tags" }: Props) {
  if (tags.length === 0) return null;
  return (
    <span className={className}>
      {tags.map((t) => (
        <span key={t} className="tag tag-sm">{t}</span>
      ))}
    </span>
  );
}
