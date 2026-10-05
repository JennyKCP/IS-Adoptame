


const LINE_BREAK_TAG = /<br\s*\/?>/gi;


const TABLE_ROW = /^\s*\|/;

export function normalizeAnswerMarkdown(text: string): string {
  if (!text.includes("<")) return text;

  return text
    .split("\n")
    .map((line) =>
      TABLE_ROW.test(line)
        ? line.replace(LINE_BREAK_TAG, " · ")
        : line.replace(LINE_BREAK_TAG, "\n"),
    )
    .join("\n");
}
