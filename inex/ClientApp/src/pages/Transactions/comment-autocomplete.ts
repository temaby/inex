export interface CommentToken {
    start: number;
    end: number;
    marker: "#" | "@";
    type: "tag" | "ref";
    query: string;
}

// Match the existing parser: split only on literal spaces, then trim each token.
export function commentToken(value: string, caret: number, selectionEnd = caret): CommentToken | undefined {
    if (caret !== selectionEnd || caret < 0 || caret > value.length) return;
    const rawStart = value.lastIndexOf(" ", caret - 1) + 1;
    const nextSpace = value.indexOf(" ", caret);
    const end = nextSpace < 0 ? value.length : nextSpace;
    const raw = value.slice(rawStart, end);
    const start = rawStart + raw.length - raw.trimStart().length;
    const trimmedEnd = end - (raw.length - raw.trimEnd().length);
    const marker = value[start];
    if ((marker !== "#" && marker !== "@") || caret <= start || caret > trimmedEnd) return;
    return { start, end: trimmedEnd, marker, type: marker === "#" ? "tag" : "ref",
        query: value.slice(start + 1, caret).toLowerCase() };
}

export function replaceCommentToken(value: string, token: CommentToken, key: string) {
    const inserted = `${token.marker}${key}`;
    return { value: value.slice(0, token.start) + inserted + value.slice(token.end), caret: token.start + inserted.length };
}
