"use client";

import { Editor } from "@monaco-editor/react";
import { $ } from "migacss";
import dynamic from "next/dynamic";
import { useState } from "react";
import { AiFillGithub } from "react-icons/ai";
import { RiShareBoxLine } from "react-icons/ri";
import { defaultCode } from "remark-shaku-code-annotate";
import { ALL_LANGS } from "../../utils/lang";
import { Button, Column, Row, Text, View } from "../bare";

const CodeSnippetPreview = dynamic(() => import("./ShikiTokenPreview"), {
  ssr: false,
});

export function ShikiTokenInspector({
  code: _code,
  lang: _lang,
}: {
  code?: string;
  lang?: string;
}) {
  const [lang, setLang] = useState<string>(_lang ?? "javascript");
  const [code, setCode] = useState(_code ?? defaultCode[lang] ?? "");

  const share = () => {
    const query =
      "code=" + encodeURIComponent(code) + "&lang=" + encodeURIComponent(lang);
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
          <Text type="headline1">
            Shiki Token Visualizer
            <$.a
              href="https://github.com/JSerZANP/shaku"
              target="_blank"
              $fontSize={20}
              $marginLeft={12}
            >
              <AiFillGithub />
            </$.a>
          </Text>
        </Row>
        <Text type="body">
          A tool to visualize the tokens generated by{" "}
          <a href="https://github.com/shikijs/shiki">shiki</a>. Created by{" "}
          <a href="https://twitter.com/JSer_ZANP">JSer</a>.
        </Text>
      </View>

      <Row $gap={20} $flex="1 0 0 " $minHeight={0}>
        <Column $flex="1 0 0" $maxWidth={500}>
          <Row $marginBottom="0.5rem">
            <select
              value={lang}
              // @ts-ignore
              onChange={(e) => {
                const newLang = e.currentTarget.value;
                setLang(newLang);
                setCode(defaultCode[newLang]);
              }}
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
        <CodeSnippetPreview code={code} lang={lang} />
      </Row>
    </Column>
  );
}
