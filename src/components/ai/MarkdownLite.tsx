/**
 * MarkdownLite — a tiny, safe renderer for the AI summary text.
 *
 * Supports exactly what the summary prompt asks Claude for:
 *   `## ` / `### ` headings, `- ` / `* ` bullet lists, **bold**, *italic*.
 * Everything is built as React elements — no dangerouslySetInnerHTML, so
 * model output can never inject markup.
 */
import type { ReactNode } from 'react';

interface MarkdownLiteProps {
  text: string;
}

/** Parse **bold** first, then *italic* inside the remaining plain segments. */
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  boldParts.forEach((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 5) {
      nodes.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>,
      );
      return;
    }
    const italicParts = part.split(/(\*[^*]+\*)/g);
    italicParts.forEach((sub, j) => {
      if (sub.startsWith('*') && sub.endsWith('*') && sub.length >= 3) {
        nodes.push(<em key={`${keyBase}-i${i}-${j}`}>{sub.slice(1, -1)}</em>);
      } else if (sub) {
        nodes.push(sub);
      }
    });
  });
  return nodes;
}

const isBullet = (line: string): boolean => line.startsWith('- ') || line.startsWith('* ');
const isHeading = (line: string): boolean => line.startsWith('## ') || line.startsWith('### ');

export function MarkdownLite({ text }: MarkdownLiteProps) {
  const out: ReactNode[] = [];
  const blocks = text.trim().split(/\n\s*\n/);

  blocks.forEach((block, bi) => {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    let i = 0;
    while (i < lines.length) {
      const line = lines[i] as string;

      if (line.startsWith('### ')) {
        out.push(
          <h4 key={`b${bi}-h4-${i}`} className="mt-1 text-[13px] font-semibold text-ink">
            {renderInline(line.slice(4), `b${bi}-h4-${i}`)}
          </h4>,
        );
        i += 1;
      } else if (line.startsWith('## ')) {
        out.push(
          <h3 key={`b${bi}-h3-${i}`} className="text-[14px] font-semibold text-ink">
            {renderInline(line.slice(3), `b${bi}-h3-${i}`)}
          </h3>,
        );
        i += 1;
      } else if (isBullet(line)) {
        const items: string[] = [];
        while (i < lines.length && isBullet(lines[i] as string)) {
          items.push((lines[i] as string).slice(2));
          i += 1;
        }
        out.push(
          <ul
            key={`b${bi}-ul-${i}`}
            className="list-disc space-y-1 pl-5 text-[13.5px] leading-relaxed text-ink-2"
          >
            {items.map((item, li) => (
              <li key={li}>{renderInline(item, `b${bi}-li${li}`)}</li>
            ))}
          </ul>,
        );
      } else {
        const para: string[] = [];
        while (
          i < lines.length &&
          !isBullet(lines[i] as string) &&
          !isHeading(lines[i] as string)
        ) {
          para.push(lines[i] as string);
          i += 1;
        }
        out.push(
          <p key={`b${bi}-p-${i}`} className="text-[13.5px] leading-relaxed text-ink-2">
            {renderInline(para.join(' '), `b${bi}-p-${i}`)}
          </p>,
        );
      }
    }
  });

  return <div className="space-y-3">{out}</div>;
}
