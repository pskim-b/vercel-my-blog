import Markdown from "markdown-to-jsx";
import {
  type AnchorHTMLAttributes,
  type ImgHTMLAttributes,
} from "react";
import CodeBlock from "./CodeBlock";

export default function PostMarkdown({
  content,
  section,
  assetBasePath,
}: {
  content: string;
  section: string;
  assetBasePath: string;
}) {
  const resource = (url?: string) =>
    url?.startsWith("./resource/")
      ? `${assetBasePath}/${url.slice(11)}`
      : url?.startsWith("resource/")
        ? `${assetBasePath}/${url.slice(9)}`
        : url;
  return (
    <article
      className="markdown-content post-prose"
    >
      <Markdown
        options={{
          overrides: {
            code: { component: "code", props: { className: "inline-code" } },
            pre: { component: CodeBlock, props: { section } },
            img: {
              component: ({
                src,
                alt,
                ...rest
              }: ImgHTMLAttributes<HTMLImageElement>) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  {...rest}
                  src={typeof src === "string" ? resource(src) : undefined}
                  alt={alt ?? ""}
                  loading="lazy"
                />
              ),
            },
            a: {
              component: ({
                href,
                ...rest
              }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
                <a {...rest} href={resource(href)} />
              ),
            },
          },
        }}
      >
        {content}
      </Markdown>
    </article>
  );
}
