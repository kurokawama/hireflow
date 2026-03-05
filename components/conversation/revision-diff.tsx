interface RevisionDiffProps {
  originalText: string;
  revisedText: string;
}

export function RevisionDiff({ originalText, revisedText }: RevisionDiffProps) {
  const originalLines = originalText.split(/\r?\n/);
  const revisedLines = revisedText.split(/\r?\n/);
  const maxLines = Math.max(originalLines.length, revisedLines.length);

  return (
    <div className="rounded-md border bg-white p-3 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <div aria-label="original text">
          <p className="mb-2 text-xs font-medium text-neutral-600">Before</p>
          <div className="space-y-1 rounded-md border bg-neutral-50 p-2 text-sm">
            {Array.from({ length: maxLines }).map((_, index) => {
              const oldLine = originalLines[index] ?? "";
              const newLine = revisedLines[index] ?? "";
              const changed = oldLine !== newLine;

              return (
                <p
                  key={`old-${index}`}
                  className={`whitespace-pre-wrap rounded px-1 ${
                    changed ? "bg-red-100 text-red-700" : "text-neutral-700"
                  }`}
                >
                  {oldLine || " "}
                </p>
              );
            })}
          </div>
        </div>

        <div aria-label="revised text">
          <p className="mb-2 text-xs font-medium text-neutral-600">After</p>
          <div className="space-y-1 rounded-md border bg-neutral-50 p-2 text-sm">
            {Array.from({ length: maxLines }).map((_, index) => {
              const oldLine = originalLines[index] ?? "";
              const newLine = revisedLines[index] ?? "";
              const changed = oldLine !== newLine;

              return (
                <p
                  key={`new-${index}`}
                  className={`whitespace-pre-wrap rounded px-1 ${
                    changed ? "bg-green-100 text-green-700" : "text-neutral-700"
                  }`}
                >
                  {newLine || " "}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
