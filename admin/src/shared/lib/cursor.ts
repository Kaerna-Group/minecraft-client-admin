export type CursorValue = Record<string, string | null>;

export type CursorPage<T> = {
  items: T[];
  nextCursor: CursorValue | null;
  hasMore: boolean;
};
