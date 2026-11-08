import Markdown from "markdown-to-jsx";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
  type AnchorHTMLAttributes,
  type ImgHTMLAttributes,
} from "react";
import CodeBlock from "./CodeBlock";

// Keep Markdown semantics, links and code intact while laying out writing prose in cells.
function manuscriptText(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number")
      return Array.from(
        new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(
          String(child),
        ),
        ({ segment }, index) => (
          <span key={index} className="manuscript-char">
            {/\s/.test(segment) ? "\u00a0" : segment}
          </span>
        ),
      );
    if (!isValidElement<{ children?: ReactNode; className?: string }>(child))
      return child;
    if (
      child.type === CodeBlock ||
      child.props.className?.includes("manuscript-char") ||
      (typeof child.type === "string" &&
        ["code", "pre", "img", "figure", "svg", "br", "table"].includes(
          child.type,
        ))
    )
      return child;
    return cloneElement(child, {}, manuscriptText(child.props.children));
  });
}

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
  const paragraph = ({ children }: { children?: ReactNode }) => (
    <p>{section === "writing" ? manuscriptText(children) : children}</p>
  );
  return (
    <article
      className={`markdown-content post-prose ${section === "writing" ? "manuscript-body" : ""}`}
    >
      <Markdown
        options={{
          overrides: {
            p: { component: paragraph },
            li: {
              component: ({ children }: { children?: ReactNode }) => (
                <li>
                  {section === "writing" ? manuscriptText(children) : children}
                </li>
              ),
            },
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
