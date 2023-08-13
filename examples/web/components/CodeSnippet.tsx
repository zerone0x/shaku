"use client";

import withShiki from "@stefanprobst/remark-shiki";

import { Editor } from "@monaco-editor/react";
import domtoimage from "dom-to-image";
import { $ } from "migacss";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiOutlineDownload } from "react-icons/ai";
import { BsStars } from "react-icons/bs";
import { RiShareBoxLine } from "react-icons/ri";
import { remark } from "remark";
import html from "remark-html";
import { remarkShakuCodeAnnotate } from "remark-shaku-code-annotate";
import * as shiki from "shiki";
import styles from "./CodeSnippet.module.css";
import { Button, Column, Row, Text, View } from "./bare";
import useDebouncedCallback from "./useDebouncedCallback";

const ALL_LANGS = [
  "abap",
  "actionscript-3",
  "ada",
  "apache",
  "apex",
  "apl",
  "applescript",
  "ara",
  "asm",
  "astro",
  "awk",
  "ballerina",
  // "bat",
  "batch",
  "berry",
  // "be",
  "bibtex",
  "bicep",
  "blade",
  "c",
  "cadence",
  // "cdc",
  "clarity",
  "clojure",
  // "clj",
  "cmake",
  "cobol",
  "codeql", // nothing to test
  // "ql",
  "coffee",
  "cpp",
  "crystal",
  "c#",
  // "cs",
  "css",
  "cue",
  "d",
  "dart",
  "dax",
  "diff", // nothing to test
  // "docker",
  "dockerfile",
  "dream-maker",
  "elixir",
  "elm",
  // "erb",
  // "erlang",
  // "erl",
  // "fish",
  // "fsharp",
  // "f#",
  // "fs",
  // "gdresource",
  // "gdscript",
  // "gdshader",
  // "gherkin",
  // "git-commit",
  // "git-rebase",
  // "glsl",
  // "gnuplot",
  "go",
  // "graphql",
  // "groovy",
  // "hack",
  // "haml",
  // "handlebars",
  // "hbs",
  // "haskell",
  // "hs",
  // "hcl",
  // "hlsl",
  // "html",
  // "http",
  // "imba",
  // "ini",
  // "properties",
  "java",
  "javascript",
  // "jinja-html",
  // "jison",
  // "json",
  // "json5",
  // "jsonc",
  // "jsonnet",
  // "jssm",
  // "fsl",
  // "jsx",
  "julia",
  // "kotlin",
  // "kusto",
  // "kql",
  // "latex",
  // "less",
  // "liquid",
  // "lisp",
  // "logo",
  // "lua",
  // "make",
  // "makefile",
  // "markdown",
  // "md",
  // "marko",
  "matlab",
  // "mdx",
  // "mermaid",
  // "nginx",
  // "nim",
  // "nix",
  // "objective-c",
  // "objc",
  // "objective-cpp",
  // "ocaml",
  // "pascal",
  // "perl",
  "php",
  // "plsql",
  // "postcss",
  // "powerquery",
  // "powershell",
  // "ps",
  // "ps1",
  // "prisma",
  // "prolog",
  // "proto",
  // "pug",
  // "jade",
  // "puppet",
  // "purescript",
  "python",
  "r",
  // "raku",
  // "perl6",
  // "razor",
  // "reg",
  // "rel",
  // "riscv",
  // "rst",
  "ruby",
  // "rb",
  "rust",
  // "rs",
  // "sas",
  // "sass",
  // "scala",
  // "scheme",
  // "scss",
  // "shaderlab",
  // "shader",
  // "shellscript",
  // "bash",
  // "console",
  // "sh",
  // "shell",
  // "zsh",
  // "smalltalk",
  // "solidity",
  // "sparql",
  "sql",
  // "ssh-config",
  // "stata",
  // "stylus",
  // "styl",
  // "svelte",
  "swift",
  // "system-verilog",
  // "tasl",
  // "tcl",
  // "tex",
  // "toml",
  // "tsx",
  // "turtle",
  // "twig",
  // "typescript",
  // "ts",
  // "v",
  "vb",
  // "cmd",
  // "verilog",
  // "vhdl",
  // "viml",
  // "vim",
  // "vimscript",
  // "vue-html",
  // "vue",
  // "wasm",
  // "wenyan",
  // "文言",
  // "wgsl",
  // "wolfram",
  // "xml",
  // "xsl",
  // "yaml",
  // "yml",
  // "zenscript",
];
function getProcessor(lang) {
  return shiki
    .getHighlighter({
      theme: "github-dark",
      langs: ["javascript", "css", "jsx", "html", "typescript", "tsx", lang],
      paths: {
        themes: "/_next/static/shiki/themes",
        wasm: "/_next/static/shiki/dist",
        languages: "/_next/static/shiki/languages",
      },
    })
    .then((highlighter) =>
      remark()
        .use(remarkShakuCodeAnnotate, {
          theme: "github-dark",
          langs: [
            "javascript",
            "css",
            "jsx",
            "html",
            "typescript",
            "tsx",
            lang,
          ],

          paths: {
            themes: "/_next/static/shiki/themes",
            wasm: "/_next/static/shiki/dist",
            languages: "/_next/static/shiki/languages",
          },
        })
        .use(withShiki, { highlighter })
        .use(html, { sanitize: false })
    );
}

const themes = [
  {
    name: "blue",
    background: "#d3efff",
    cssVars: {
      "--color-shaku-highlight-dark": "#2b4a70",
      "--color-shaku-callout-dark": "#0685ce",
      "--color-shaku-underline-dark": "#0893e3",
    },
  },
  {
    name: "purple",
    background: "#fddbfd",
    cssVars: {
      "--color-shaku-highlight-dark": "#656065",
      "--color-shaku-callout-dark": "#df1fdf",
      "--color-shaku-underline-dark": "#e221e2",
    },
  },
  {
    name: "green",
    background: "#dbfdeb",
    cssVars: {
      "--color-shaku-highlight-dark": "#424a46",
      "--color-shaku-callout-dark": "#09984a",
      "--color-shaku-underline-dark": "#09984a",
    },
  },
  {
    name: "yellow",
    background: "#f9fddb",
    cssVars: {
      "--color-shaku-highlight-dark": "#3e3f36",
      "--color-shaku-callout-dark": "#738200",
      "--color-shaku-underline-dark": "#738200",
    },
  },
  {
    name: "red",
    background: "#fddbdb",
    cssVars: {
      "--color-shaku-highlight-dark": "#3e3f36",
      "--color-shaku-callout-dark": "#940000",
      "--color-shaku-underline-dark": "#d01212",
    },
  },
] as const;

export function CodeSnippet({ code: _code }: { code?: string }) {
  const [selectedTheme, setTheme] = useState<(typeof themes)[number]>(
    themes[0]
  );
  const [lang, setLang] = useState<shiki.Lang>("elm");
  const [code, setCode] = useState(_code ?? defaultCode[lang] ?? "");
  useEffect(() => {
    setCode(defaultCode[lang]);
  }, [lang]);
  const [preview, setPreview] = useState("");
  const [showLogo, setShowLogo] = useState(true);

  const render = useCallback((code, lang) => {
    getProcessor(lang).then((processor) =>
      processor
        .process(`\`\`\`${lang} annotate\n${code}\n\`\`\``)
        .then((data) => {
          setPreview(data.toString());
        })
    );
  }, []);

  const debouncedRender = useDebouncedCallback(render, 1000);

  useEffect(() => {
    debouncedRender(code, lang);
  }, [code, debouncedRender, lang]);

  const refPreview = useRef<HTMLDivElement>(null);

  const download = () => {
    const elPreview = refPreview.current;
    if (elPreview == null) return;
    const offsetWidth = elPreview.offsetWidth;
    const offsetHeight = elPreview.offsetHeight;

    domtoimage
      .toSvg(elPreview, {
        width: offsetWidth * 2,
        height: offsetHeight * 2,
        style: {
          transform: "scale(2)",
          transformOrigin: "0 0",
        },
      })
      .then((dataUrl) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          // render the svg to canvas 2x
          // then export to blob
          const canvas = document.createElement("canvas");

          // document.body.append(canvas)
          const ctx = canvas.getContext("2d");
          canvas.width = img.width;
          canvas.height = img.height;

          ctx.drawImage(
            img,
            0,
            0,
            img.width,
            img.height,
            0,
            0,
            canvas.width,
            canvas.height
          );
          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.style.display = "none";
            link.href = URL.createObjectURL(blob);
            link.download = "shaku.png";

            // It needs to be added to the DOM so it can be clicked
            document.body.appendChild(link);
            link.click();

            // To make this work on Firefox we need to wait
            // a little while before removing it.
            setTimeout(() => {
              URL.revokeObjectURL(link.href);
              link.parentNode.removeChild(link);
            }, 0);
          }, "image/png");
        };
      });

    return;
  };

  const share = () => {
    const query = "code=" + encodeURIComponent(code);
    const url = location.origin + "/snippet?" + query;
    const type = "text/plain";
    const blob = new Blob([url], { type });
    const data = [new ClipboardItem({ [type]: blob })];
    navigator.clipboard.write(data).then(
      () => alert("link copied"),
      () => alert("failed to copy link.")
    );
  };

  return (
    <Column $height={"100vh"} $padding={12} $gap={12}>
      <View>
        <Row $alignItems="center" $justifyContent="space-between" $gap={20}>
          <Text type="headline1">Shaku Snippet</Text>
          <$.a href="/" $textDecoration="none">
            <Text type="headline5" $color="#0e67e4">
              <BsStars />
              Shaku Playground →
            </Text>
          </$.a>
        </Row>
        <Text type="body">
          Annotate code snippet with <a href="/">Shaku Code Annotate Syntax</a>{" "}
          and share it with the world! Created by{" "}
          <a href="https://twitter.com/JSer_ZANP">JSer</a>.
        </Text>
      </View>

      <Row $gap={20} $flex="1 0 0 ">
        <Column $flex="1 0 0" $maxWidth={600}>
          <Row $marginBottom="1.5rem">
            <select
              value={lang}
              // @ts-ignore
              onChange={(e) => setLang(e.currentTarget.value)}
            >
              {ALL_LANGS.map((lang) => (
                <option value={lang} key={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <Button
              onClick={share}
              label="Share page with below code"
              icon={<RiShareBoxLine />}
            ></Button>
          </Row>
          <Editor
            language={lang}
            height="100%"
            value={code}
            theme="vs-dark"
            onChange={setCode}
            options={{
              minimap: {
                enabled: false,
              },
              lineNumbers: "off",
            }}
          />
        </Column>
        <View $flex="1 0 0">
          <Row
            $justifyContent="flex-start"
            $marginBottom="1rem"
            $gap={12}
            $alignItems="center"
          >
            <Text type="headline4">Preview</Text>

            {themes.map((theme) => (
              <ThemePicker
                key={theme.name}
                name={theme.name}
                background={theme.background}
                selected={selectedTheme === theme}
                onClick={() => setTheme(theme)}
              ></ThemePicker>
            ))}
            <label htmlFor="showlogo">
              <input
                id="showlogo"
                type="checkbox"
                checked={showLogo}
                onChange={(e) => setShowLogo(e.currentTarget.checked)}
              />
              show logo
            </label>
            <Button
              onClick={download}
              label="Download"
              icon={<AiOutlineDownload />}
            ></Button>
          </Row>
          <View
            $padding="40px 40px 10px 40px"
            $minWidth={400}
            $backgroundColor={selectedTheme.background}
            $width="min-content"
            // @ts-ignore
            style={{ ...selectedTheme.cssVars }}
            ref={refPreview}
          >
            <View $flex="0 0 0" $width="max-content" $margin="auto auto">
              <$.p
                $backgroundColor="#24292e"
                $margin={0}
                $padding="15px 15px 0"
                $display="flex"
                $gap="8px"
                $borderRadius="6px 6px 0 0"
                $alignItems="center"
              >
                <Dot color="#ff5f56" />
                <Dot color="#ffbd2d" />
                <Dot color="#26c940" />
                <$.span $color="#a39d9d" $fontSize="12px">
                  {lang}
                </$.span>
              </$.p>
              <div
                className={styles.code}
                dangerouslySetInnerHTML={{ __html: preview }}
              ></div>
              <$.p
                $backgroundColor="#24292e"
                $margin={0}
                $padding="10px 10px 0"
                $display="flex"
                $gap="8px"
                $borderRadius="0 0 6px 6px"
              ></$.p>
              <$.p
                $color="rgba(0,0,0,0.2)"
                $textAlign="center"
                $width="100%"
                $fontWeight="bold"
                $margin="10px"
                $fontSize="12px"
                $height="10px"
              >
                {showLogo ? "Shaku Snippet" : ""}
              </$.p>
            </View>
          </View>
        </View>
      </Row>
    </Column>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <$.span
      $backgroundColor={color}
      $width="12px"
      $height="12px"
      $display="inline-block"
      $borderRadius="15px"
    ></$.span>
  );
}

function ThemePicker({
  onClick,
  name,
  selected,
  background,
}: {
  onClick: () => void;
  name: string;
  selected?: boolean;
  background: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={name}
      style={{
        border: selected ? "1px solid #000" : 0,
        width: "20px",
        height: "20px",
        display: "inline-block",
        background,
      }}
    ></button>
  );
}

const defaultCode = {
  abap: `
* @dim
REPORT Z_SAMPLE_REPORT.
REPORT Z_SAMPLE_REPORT.
*      ---------------
*           ^
*   [Hello World!]
`,
  "actionscript-3": `
package {
  // @dim
  import flash.display.Sprite;

  public class CommentExample extends Sprite {
    public function CommentExample() {
  //       --------
  //           ^
  // [Hello World!]
    }
  }
}
`,
  ada: `
-- @dim
with Ada.Text_IO;

procedure Comments_Example is
    -- This is a single-line comment
    --           -----------
    --              ^
    --  [Hello World!]
`,
  apache: `
# Virtual Host Configuration
<VirtualHost *:80>
    ServerName www.example.com
    DocumentRoot /var/www/html

    # This is a comment within a VirtualHost block.
    # It can provide additional information about the configuration of this specific virtual host.

    # Directory Configuration
    <Directory /var/www/html>
        Options FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
`,
  apex: `
public class ExampleClass {
  // @dim
  public void doSomething() {
      System.debug('Doing something...');
    //       -----
    //         ^
    // [Hello World!]
  }
}
`,
  apl: `
⍝ @dim
data ← 1 2 3 4 5

sum ← +/data
⍝     ------
⍝       ^
⍝  [Hello World!]

sum
`,
  applescript: `
-- @dim
display dialog "Hello, World!"
--      ------
--         ^
-- [Hello World!]
`,
  ara: `
// @dim
$foo = true;
$foo = true;
//     ----
//      ^
// [Hello!]
`,
  astro: `
<!-- @dim -->
<div>Hello World!</div>
{/* ^ */}
{/*[Hello!] */}

<div>Hello World!</div>
<!-- ----------- -->
<!-- ^ -->
<!--[Hello!] -->
`,
  awk: `
# @dim
sum = 0
sum = 1
#    --
#    ^
#[Hello!]
`,
  ballerina: `
//@dim
import ballerina/io;

public function main() {
  string message = "Hello, Ballerina!";
  //     -------
  //       ^
  // [Hello!]
}
`,
  batch: `
echo Batch Script Example
REM  -----
REM ^
REM [Hello World!]
`,
  berry: `
# @dim
def func(x)
  return x + 1.5
  #      -----
  #      ^
  #[Hello!]
end
`,
  bibtex: `
% @dim
% Another reference
%    ^
% [Hello!]
`,
  bicep: `
// @dim
// Define a storage
    // ----
// ^
//[Hello!]
`,
  blade: `
<h1>Welcome to our website!</h1>
{{--        ---- --}}
{{-- ^ --}}
{{-- [Hello World!] --}}
`,
  cadence: `
  // @dim
fun add(a: Int, b: Int): Int {
  //---
  // ^
  //[Hello!]
  return a + b
}
`,
  clarity: `
;;   @dim
;; This is a single-line comment 
;; ---
;; ^
;;[Hello!]
`,
  clojure: `
;   @dim
; This is a single-line comment 
; ---
; ^
;[Hello!]
`,
  cmake: `
# @dim
# This is a single-line comment
# ----
#  ^
#[Hello!]
  
`,
  asm: `
; @dim
section .data
    message db 'Hello, World!', 0
;   -------
;     ^
; [Hello World!]
  
`,
  c: `
// @dim
#include <stdio.h>

int main() {
    int x = 10;
//  -----------
//    ^
// [Hello World!]
    return 0;
}
`,
  cobol: `
* @dim
ENVIRONMENT DIVISION.
DATA DIVISION.
*    --------
*   ^
* [Hello World!]
`,
  coffee: `
# @dim
# coffee
#  ^
# [Hello!]
`,
  crystal: `
# @dim
# coffee
  # ^
# [Hello!]
`,
  css: `
.a {
  /* hello */
/*    --- */
/*    ^  */
/*  [Hello!]  */
}
`,
  cue: `
// @dim
// This is a configuration
//   -----
//    ^
// [Hello!]
`,
  d: `
// @dim
// This is a configuration
//   -----
//    ^
// [Hello!]
`,
  dart: `
// @dim
// This is a configuration
//   -----
//    ^
// [Hello!]
`,
  dax: `
// @dim
// This is a configuration
//   -----
//    ^
// [Hello!]
`,
  dockerfile: `
# @dim
FROM node:14
#---
  # ^
# [Hello!]
`,
  "dream-maker": `
// @dim
// This is a configuration
//   -----
//    ^
// [Hello!] 
`,
  elixir: `
# @dim
# coffee
# ------
  # ^
# [Hello!]
`,
  elm: `
-- @dim
-- coffee
-- ------
  -- ^
-- [Hello!]
`,
  cpp: `
// @dim
#include <iostream>

int main() {
  int x = 10;
  //  -----------
  //    ^
  // [Hello World!]
  return 0;
}
`,
  "c#": `
// @dim
using System;
namespace CommentExample
{
  // @highlight
  class Program
  {
    static void Main(string[] args)
    {
      int x = 10
    //----------
    // ^
    //[Hello World!]
    }

  }
}
`,
  go: `
// @dim
package main
import "fmt"
func main() {
  variable := 10
//--------
//      ^
//[Hello World!]
}
`,
  java: `
// @dim
public class CommentExample {
  public static void main(String[] args) {
    int x = 10;
//  ----------
//       ^
//[Hello world!]
    int square = x * x;
  }
}
`,
  javascript: `// @dim
import { useState } from 'react';

export default function Counter() {
  // @highlight
  const [count, setCount] = useState(0);
              //~~~~~~~~

  function handleClick() {
    setCount(count + 1);
  //-------------------
  //     ^
  //[Underline and callout!]
  }

  return (
    <button onClick={handleClick}>
    {/*       ^           */}
    {/* [Supports JSX] */}
    {/* [Awesome,right?] */}
      You pressed me {count} times
    </button>
  );
}`,
  julia: `
# @dim
variable = 1

variable = 10 
#          --
#          ^
# [Hello World]
`,
  matlab: `
% @dim
% This is a single-line comment in MATLAB.

variable = 10; 
%          --
  %        ^
  % [Hello World!]
`,
  php: `
// @dim
<?php
$variable = 10000;
//          --
//          ^
// [Hello world!]
// @dim
?>
`,
  r: `
# @dim
# Variables
variable <- 123
#        --
#        ^
# [Hello World!]
`,

  python: `
# @dim
def greet(name):
    print(f"Hello, {name}!")
  # -----
  #   ^
  # [Hello world!]
`,
  ruby: `
# @dim
square = variable * variable 
#        --------
#        ^
#   [Hello World!]
`,
  rust: `
// @dim
fn main() {
  let square = variable * variable; 
  //           --------
  //              ^
  //      [Hello World!]
}
  `,
  sql: `
-- Create a new table to store customer information
CREATE TABLE Customers (
  -- @dim
    CustomerID INT PRIMARY KEY,
    FirstName VARCHAR(50),
  --          -------
  --             ^
  --     [Hello World!]
    LastName VARCHAR(50)
);
`,
  swift: `
// @dim
import Foundation

var variable = 10 
//           ----
//            ^
// [Hello world!]
`,
  vb: `
Imports System
' @dim
Namespace CommentExample
    Class Program
        ' @highlight
        Sub Main()
            Dim x As Integer = 10
        '   -----
        '    ^
        ' [Hello world!]
        End Sub
    End Class
End Namespace
`,
};
