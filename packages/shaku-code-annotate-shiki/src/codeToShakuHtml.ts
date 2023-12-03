import { Highlighter, IThemedToken } from "shiki";
import {
  ShakuDirectiveHighlightInline,
  parseLine,
  renderComponent,
  shouldApplyAnnotation,
} from "shaku-code-annotate-core";
import { supportedLangs } from "./defaultCode";
import { ShakuHighlighter } from "./getHighlighters";
import {
  renderSourceLine,
  renderSourceLineWithInlineHighlight,
} from "./render";

export let codeToShakuHtml = function (
  this: ShakuHighlighter,
  {
    code,
    meta,
    parseBasicMarkdown,
    options,
  }: {
    code: string;
    meta: string;
    parseBasicMarkdown: (md: string) => string;
    options: Parameters<Highlighter["codeToHtml"]>[1];
  }
): {
  skipped: boolean;
  html: string;
} {
  const highlighter = this;
  let lang = options?.lang ?? "";
  lang = supportedLangs.includes(lang) ? lang : "";
  const theme = highlighter.getTheme();

  const shouldAnnotate = shouldApplyAnnotation(meta);

  if (!shouldAnnotate) {
    // do nothing
    if (this.fallbackToShiki === false) {
      return {
        html: "",
        skipped: true,
      };
    }
  }

  const lines = highlighter.codeToThemedTokens(code, lang);
  const foregroundColor = highlighter.getForegroundColor();
  const backgroundColor = highlighter.getBackgroundColor();

  // generate the html from the tokens
  let html = `<pre class="shiki shaku ${theme.name}" style="color:${foregroundColor};background-color:${backgroundColor}">`;
  html += `<div class="code-container"><code>`;

  const parsedLines = parseLines(lines, lang, shouldAnnotate);
  const hasFocus = hasShakuDirectiveFocus(parsedLines);

  let shouldHighlighNextSourceLine = false;
  let shouldDimNextSourceLine = false;
  let shouldFocusNextSourceLine = false;
  let isHighlightingBlock = false;
  let isDimBlock = false;
  let isFocusBlock = false;
  let shakuDirectiveHighlightInline: null | {
    type: "shaku";
    line: ShakuDirectiveHighlightInline;
    offset: number;
  } = null;

  for (let i = 0; i < parsedLines.length; i++) {
    const line = parsedLines[i];

    const isShakuLine = line.type === "shaku" && !line.line.config.isEscaped;
    if (isShakuLine) {
      const shakuLine = line.line;
      switch (shakuLine.type) {
        case "DirectiveCallout": {
          const arrowOffset = shakuLine.config.offset;
          const directiveOffset = arrowOffset + line.offset;
          let minOffset = directiveOffset;
          const contents = [];

          let j = i + 1;
          while (j < parsedLines.length) {
            const nextLine = parsedLines[j];
            if (
              nextLine.type !== "shaku" ||
              nextLine.line.type !== "AnnotationLine"
            ) {
              break;
            }

            minOffset = Math.min(
              minOffset,
              nextLine.line.config.offset + nextLine.offset
            );
            contents.push(
              parseBasicMarkdown(nextLine.line.config.content).trim()
              // String(
              //   unifiedProcessor.processSync(nextLine.line.config.content)
              // )
            );
            j += 1;
          }
          html += renderComponent({
            type: "ShakuComponentCallout",
            config: {
              offset: minOffset,
              arrowOffset: directiveOffset - minOffset,
              contents: contents.join(""),
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
        case "DirectiveHighlight": {
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
        }
        case "DirectiveDim": {
          const mark = shakuLine.config.mark;
          switch (mark) {
            case "start":
              isDimBlock = true;
              break;
            case "end":
              isDimBlock = false;
              break;
            case "below":
            default:
              shouldDimNextSourceLine = true;
              break;
          }
          break;
        }
        case "DirectiveFocus": {
          const mark = shakuLine.config.mark;
          switch (mark) {
            case "start":
              isFocusBlock = true;
              break;
            case "end":
              isFocusBlock = false;
              break;
            case "below":
            default:
              shouldFocusNextSourceLine = true;
              break;
          }
          break;
        }
        case "DirectiveUnderline": {
          const underlineOffset = shakuLine.config.offset;
          const underlineContent = shakuLine.config.content;
          const directiveOffset = underlineOffset + line.offset;
          let minOffset = directiveOffset;
          const contents = [];

          let j = i + 1;
          while (j < parsedLines.length) {
            const nextLine = parsedLines[j];
            if (
              nextLine.type !== "shaku" ||
              nextLine.line.type !== "AnnotationLine"
            ) {
              break;
            }

            minOffset = Math.min(
              minOffset,
              nextLine.line.config.offset + nextLine.offset
            );
            contents.push(
              // some engines generates \n at line end
              parseBasicMarkdown(nextLine.line.config.content).trim()
              // String(
              //   unifiedProcessor.processSync(nextLine.line.config.content)
              // )
            );

            j += 1;
          }

          html += renderComponent({
            type: "ShakuComponentUnderline",
            config: {
              offset: minOffset,
              underlineOffset: directiveOffset - minOffset,
              underlineContent,
              underlineStyle: shakuLine.config.style,
              contents: contents.join(""),
            },
          });

          i = j - 1;
          continue;
        }
        case "DirectiveHighlightInline": {
          // only treat it as shaku line if next line is default line
          if (parsedLines[i + 1].type === "default") {
            shakuDirectiveHighlightInline = {
              type: "shaku",
              line: shakuLine,
              offset: line.offset,
            };
          }
          continue;
        }
        default:
          assertsNever(shakuLine);
      }
    } else {
      const shouldHighlight =
        isHighlightingBlock || shouldHighlighNextSourceLine;
      const shouldFocus = isFocusBlock || shouldFocusNextSourceLine;
      const shouldDim =
        isDimBlock || shouldDimNextSourceLine || (hasFocus && !shouldFocus);
      shouldHighlighNextSourceLine = false;
      shouldFocusNextSourceLine = false;
      shouldDimNextSourceLine = false;

      const sourceLine = line.type === "default" ? line.line : line.sourceLine;

      const highlightClass = shouldHighlight ? " highlight" : "";
      const dimClass = shouldDim ? " dim" : "";
      const prefix = `<div class="line${highlightClass}${dimClass}">`;
      html += prefix;

      if (shakuDirectiveHighlightInline) {
        html += renderSourceLineWithInlineHighlight(
          sourceLine,
          shakuDirectiveHighlightInline
        );
        shakuDirectiveHighlightInline = null;
      } else {
        html += renderSourceLine(sourceLine);
      }

      html += `</div>`;
    }
  }

  html += `</code></div></pre>`;

  return {
    html,
    skipped: false,
  };
};

/**
 * different kinds of comments have different interpretations
 * Below are some common examples, these are not exhaustive
 * I'm not sure if there are other cases for different languages
 *
 * "// aaa" => [{content: "// aaa", explanation: [{content: '//'}, {content: ' aaa'}]}]
 * "/* aaa *\/" =>  [{content: "/* aaa *\/", explanation: [{content: '/*'}, {content: ' aaa '}, content: '*\/'}]}]
 * "  // aaa" => [{content: "  "}, {content: "// aaa", explanation: [{content: '//'}, {content: ' aaa'}]}]
 * "  /* aaa" => [{content: "  "}, {content: "/* aaa", explanation: [{content: '/*'}, {content: ' aaa'}]}]
 * "  aaa" => [{content: "  aaa"}]
 * "  *\/" => [{content: "   *\/", explanation: [{content: '   '}, {content: '*\/'}]}]
 *
 * one exception is jsx, there is no comment line but following form which should be treated as one
 * " {  /* aaa *\/ }" => [{content: " {  "}, {content: "/* a *\/"}, {content: " }"}]
 *
 * So the idea is:
 * 1. if all tokens has explanation of comment or "whitespace", then it is comment line
 * 2. "whitespace" means token is whitespace or has `punctuation.section.embedded` and `meta.jsx.children`.
 * 3. if the first token is "whitespace", then it used to calculate the offset
 * 4. the first meaningful token has the comment body
 *   - find the first explanation that is not `punctuation.definition`.
 */
function parseComment(
  line: IThemedToken[],
  lang?: null | string
): null | {
  offset: number;
  body: string;
} {
  if (line.length === 0) return null;
  // comments start from the beginning
  const isCommentLine = line.every(
    (token) =>
      shouldBeTreatedAsWhitespace(token, lang) ||
      token.explanation?.some((exp) =>
        exp.scopes.some((scope) => {
          if (lang === "astro") {
            return (
              scope.scopeName.startsWith("comment") &&
              scope.scopeName !== "comment"
            );
          }
          return scope.scopeName.startsWith("comment");
        })
      )
  );
  if (!isCommentLine) return null;

  const shouldTreatFirstTokenOffset = shouldBeTreatedAsWhitespace(
    line[0],
    lang
  );
  let offset = shouldTreatFirstTokenOffset ? line[0].content.length : 0;
  let body = "";

  // special case for some languages that one comment has multiple tokens
  // TODO: maybe we should give up the "clever" approach because it is not solid
  // rather we can just try to trim for each lang?
  if (
    lang != null &&
    [
      "ada",
      "berry",
      "elm",
      "haml",
      "handlebars",
      "hlsl",
      "jssm",
      "kotlin",
      "nix",
      "ocaml",
      "prisma",
      "proto",
      "sas",
      "sass",
      "shaderlab",
      "shader",
      "solidity",
      "viml",
      "vimscript",
      "wenyan",
    ].includes(lang)
  ) {
    body = line
      .slice(shouldTreatFirstTokenOffset ? 1 : 0)
      .map((token) => token.content)
      .join("");
  } else {
    const tokenWithBody = shouldTreatFirstTokenOffset ? line[1] : line[0];

    if (tokenWithBody != null) {
      const explanations = tokenWithBody.explanation ?? [];

      for (let i = 0; i < explanations.length; i++) {
        const explanation = explanations[i];
        // find the first explanation that is not element tag
        if (
          explanation.scopes.every(
            (scope) =>
              !scope.scopeName.startsWith("punctuation.definition") &&
              !isWhitespace(explanation.content)
          )
        ) {
          body = explanation.content;
          break;
        }
        // for other none tokens, treat them as offset
        offset += explanation.content.length;
      }
    }
  }
  // for some languages, we are not able to extract body from above logic
  // so we have to trim manually
  const { trimmedBody, offset: extraOffset } = trimCommentBody(body, lang);

  return {
    offset: offset + extraOffset,
    body: trimmedBody,
  };
}
function parseLines(
  lines: IThemedToken[][],
  lang: string | null,
  shouldAnnotate: boolean
) {
  return lines.map((line) => {
    if (shouldAnnotate) {
      const parsedComment = parseComment(line, lang);
      if (parsedComment != null) {
        const { body, offset } = parsedComment;
        const shakuLine = parseLine(body);
        if (shakuLine != null) {
          // for escaped shaku lines, we need to remove the trailing!
          if (shakuLine.config.isEscaped) {
            for (let i = line.length - 1; i >= 0; i--) {
              if (/!\s*$/.test(line[i].content)) {
                line[i].content = line[i].content.replace(/!(\s*)$/, "$1");
                break;
              }
            }
          }

          return {
            type: "shaku",
            line: shakuLine,
            sourceLine: line,
            offset,
          } as const;
        }
      }
    }
    return {
      type: "default",
      line,
    } as const;
  });
}
function hasShakuDirectiveFocus(lines: ReturnType<typeof parseLines>) {
  return lines.some(
    (line) => line.type === "shaku" && line.line.type === "DirectiveFocus"
  );
}

function isWhitespace(str: string) {
  return /^\s+$/.test(str);
}

function shouldBeTreatedAsWhitespace(
  token: IThemedToken,
  lang?: string | null
) {
  if (isWhitespace(token.content)) return true;

  if (
    !["javascript", "jsx", "tsx", "astro", "mdx", "batch"].includes(lang ?? "")
  ) {
    return false;
  }
  if (
    token.explanation?.every((explanation) => {
      return (
        isWhitespace(explanation.content) ||
        (explanation.scopes.some((scope) =>
          scope.scopeName.startsWith("meta.jsx.children")
        ) &&
          explanation.scopes.some(
            (scope) =>
              scope.scopeName.startsWith(
                "punctuation.section.embedded.begin"
              ) ||
              scope.scopeName.startsWith("punctuation.section.embedded.end")
          )) ||
        (explanation.scopes.some((scope) =>
          scope.scopeName.startsWith("source.astro")
        ) &&
          explanation.scopes.some(
            (scope) =>
              scope.scopeName.startsWith(
                "punctuation.section.embedded.begin.astro"
              ) ||
              scope.scopeName.startsWith(
                "punctuation.section.embedded.end.astro"
              )
          )) ||
        explanation.scopes.some(
          (scope) => scope.scopeName === "keyword.command.rem.batchfile"
        ) ||
        (explanation.scopes.some((scope) => scope.scopeName === "source.mdx") &&
          explanation.scopes.some((scope) =>
            scope.scopeName.startsWith("string.other.begin.expression.mdx")
          ))
      );
    })
  ) {
    return true;
  }
  return false;
}

const commentMarkers: Record<string, { head?: RegExp; tail?: RegExp }> = {
  abap: {
    head: /^\s*\*/,
  },
  ada: {
    head: /^\s*\-\-/,
  },
  apache: {
    head: /^\s*#/,
  },
  "actionscript-3": {
    head: /^\s*\/\//,
  },
  asm: {
    head: /^\s*;/,
  },
  awk: {
    head: /^\s*#/,
  },
  ballerina: {
    head: /^\s*\/\//,
  },
  berry: {
    head: /^\s*#/,
  },
  bicep: {
    head: /^\s*\/\//,
  },
  clarity: {
    head: /^\s*;;/,
  },
  cmake: {
    head: /^\s*#/,
  },
  cobol: {
    head: /^\s*\*/,
  },
  d: {
    head: /^\s*\/\//,
  },
  elm: {
    head: /^\s*--/,
  },
  dart: {
    head: /^\s*\/\//,
  },
  erlang: {
    head: /^\s*%/,
  },
  fsharp: {
    head: /^\s*\/\//,
  },
  "f#": {
    head: /^\s*\/\//,
  },
  "git-commit": {
    head: /^\s*#/,
  },
  graphql: {
    head: /^\s*#/,
  },
  haml: {
    head: /^\s*-#/,
  },
  handlebars: {
    head: /^\s*\{\{!--/,
    tail: /--\}\}\s*$/,
  },
  hlsl: {
    head: /^\s*\/\//,
  },
  json5: {
    head: /^\s*\/\//,
  },
  jsonnet: {
    head: /^\s*\/\//,
  },
  jssm: {
    head: /^\s*\/\//,
  },
  rust: {
    head: /^\s*\/\//,
  },
  kotlin: {
    head: /^\s*\/\//,
  },
  kusto: {
    head: /^\s*\/\//,
  },
  kql: {
    head: /^\s*\/\//,
  },
  mermaid: {
    head: /^\s*%%/,
  },
  nginx: {
    head: /^\s*#/,
  },
  nix: {
    head: /^\s*#/,
  },
  ocaml: {
    head: /^\s*\(\*/,
    tail: /\s*\*\)$/,
  },
  plsql: {
    head: /^\s*--/,
  },
  powerquery: {
    head: /^\s*\/\//,
  },
  prisma: {
    head: /^\s*\/\//,
  },
  proto: {
    head: /^\s*\/\//,
  },
  sas: {
    head: /^\s*\/\*/,
    tail: /\s*\*\/$/,
  },
  sass: {
    head: /^\s*\/\//,
  },
  shaderlab: {
    head: /^\s*\/\//,
  },
  shader: {
    head: /^\s*\/\//,
  },
  solidity: {
    head: /^\s*\/\//,
  },
  sparql: {
    head: /^\s*#/,
  },
  turtle: {
    head: /^\s*#/,
  },
  vhdl: {
    head: /^\s*--/,
  },
  viml: {
    head: /^\s*"/,
  },
  vimscript: {
    head: /^\s*"/,
  },
  wenyan: {
    head: /^\s*注曰。/,
  },
  wgsl: {
    head: /^\s*\/\//,
  },
  zenscript: {
    head: /^\s*\/\//,
  },
};

function trimCommentBody(body: string, lang?: string | null) {
  let trimmedBody = body;
  let offset = 0;
  if (lang != null && lang in commentMarkers) {
    const { head, tail } = commentMarkers[lang];
    if (head != null) {
      trimmedBody = trimmedBody.replace(head, "");
      offset = body.length - trimmedBody.length;
    }
    if (tail != null) {
      trimmedBody = trimmedBody.replace(tail, "");
    }
  }
  return {
    trimmedBody,
    offset,
  };
}

function assertsNever(data: never) {
  throw new Error("expected never but got: " + data);
}