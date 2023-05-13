import { visit } from "unist-util-visit";
import type * as mdast from "mdast";
import type * as unified from "unified";

import { getHighlighter, HighlighterOptions, IThemedToken } from "shiki";
import {
  shouldApplyAnnotation,
  parseLine,
  renderComponent,
} from "shaku-code-annotate";

export const remarkShakuCodeAnnotate = (
  options: HighlighterOptions
): unified.Transformer => {
  return async (tree) => {
    const highlighter = await getHighlighter({
      theme: options.theme ?? "github-light",
    });

    visit(tree, "code", (node: mdast.Code) => {
      const shouldAnnotate = shouldApplyAnnotation(node.meta ?? "");
      if (!shouldAnnotate) return;

      const lines = highlighter.codeToThemedTokens(
        node.value,
        node.lang ?? "txt"
      );

      const foregroundColor = highlighter.getForegroundColor()
      const backgroundColor =  highlighter.getBackgroundColor()
      // generate the html from the tokens
      let html = `<pre class="shiki" style="color:${foregroundColor};background-color:${backgroundColor}">`;
      html += `<div class="code-container"><code>`;

      const parsedLines = lines.map((line) => {
        if (isCommentLine(line)) {
          // comment might have // or /*
          // meaning comment body might be in the 2nd explanation
          // or 1st one. Does this hold for all languages?
          // @ts-ignore
          const commentBody = (line[0].explanation[1] ?? line[0].explanation[0])
            .content;
          const shakuLine = parseLine(commentBody);
          if (shakuLine != null) {
            return {
              type: "shaku",
              line: shakuLine,
              // @ts-ignore
              commentTag: line[0].explanation[0].content,
            } as const;
          }
        }
        return {
          type: "default",
          line,
        } as const;
      });

      let shouldHighlighNextSourceLine = false;
      let isHighlightingBlock = false;
      for (let i = 0; i < parsedLines.length; i++) {
        const line = parsedLines[i];
        switch (line.type) {
          case "shaku": {
            const shakuLine = line.line;
            switch (shakuLine.type) {
              case "DirectiveCallout": {
                const arrowOffset = shakuLine.config.offset;
                let offset = arrowOffset;
                const contents = [];
                const commentTagLength = line.commentTag.length;

                let j = i + 1;
                while (j < parsedLines.length) {
                  const nextLine = parsedLines[j];
                  if (
                    nextLine.type !== "shaku" ||
                    nextLine.line.type !== "AnnotationLine"
                  ) {
                    break;
                  }

                  offset = Math.min(offset, nextLine.line.config.offset);
                  contents.push(nextLine.line.config.content);
                  j += 1;
                }

                html += renderComponent({
                  type: "ShakuComponentCallout",
                  config: {
                    offset: offset + commentTagLength,
                    arrowOffset: arrowOffset - offset,
                    contents,
                  },
                });

                i = j - 1;
                continue;
              }

              case "AnnotationLine":
                // TODO
                break;
              case "DirectiveCollapse":
                // TODO
                break;
              case "DirectiveHighlight":
                const mark = shakuLine.config.mark;
                switch (mark) {
                  case "start":
                    isHighlightingBlock = true;
                    break;
                  case "end":
                    isHighlightingBlock = false;
                    break;
                  case "below":
                  default:
                    shouldHighlighNextSourceLine = true;
                    break;
                }
                break;
              case "DirectiveUnderline":
                const underlineOffset = shakuLine.config.offset;
                const underlineContent = shakuLine.config.content;
                let offset = underlineOffset;
                const contents = [];
                const commentTagLength = line.commentTag.length;

                let j = i + 1;
                while (j < parsedLines.length) {
                  const nextLine = parsedLines[j];
                  if (
                    nextLine.type !== "shaku" ||
                    nextLine.line.type !== "AnnotationLine"
                  ) {
                    break;
                  }

                  offset = Math.min(offset, nextLine.line.config.offset);
                  contents.push(nextLine.line.config.content);
                  j += 1;
                }

                html += renderComponent({
                  type: "ShakuComponentUnderline",
                  config: {
                    offset: offset + commentTagLength,
                    underlineOffset: underlineOffset - offset,
                    underlineContent,
                    underlineStyle: shakuLine.config.style,
                    contents,
                  },
                });

                i = j - 1;
                continue;
              default:
                assertsNever(shakuLine);
            }

            break;
          }
          case "default": {
            const shouldHighlight =
              isHighlightingBlock || shouldHighlighNextSourceLine;
            shouldHighlighNextSourceLine = false;

            const sourceLine = line.line;
            const prefix = `<div class="line ${
              shouldHighlight ? "highlight" : ""
            }">`;

            html += prefix;
            html += sourceLine
              .map(
                (token) =>
                  `<span style="color: ${token.color}">${escapeHtml(
                    token.content
                  )}</span>`
              )
              .join("");
            html += `</div>`;
            break;
          }
          default:
            assertsNever(line);
        }
      }

      html += `</code></div></pre>`;

      node.value = html;
      // @ts-ignore expected error
      node.type = "html";
    });
  };
};

function escapeHtml(html: string) {
  return html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isCommentLine(line: IThemedToken[]) {
  return (
    line.length === 1 &&
    line[0].explanation?.[0].scopes.some((scope) =>
      scope.scopeName.startsWith("comment.")
    )
  );
}

function assertsNever(data: never) {
  throw new Error("expected never but got: " + data);
}