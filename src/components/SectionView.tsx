import Link from "next/link";
import { Fragment } from "react";
import { Folder, FolderOpen, LockKeyhole } from "lucide-react";
import { getPostBySlug, type PostMeta } from "@/lib/posts";
import { classifyPost, labelDefinitions, taxonomy } from "@/lib/taxonomy.mjs";
import {
  excerptText,
  isWithinTopic,
  runningMetrics,
  sectionDate,
} from "@/lib/section-presentation.mjs";

interface Props {
  section: string;
  posts: PostMeta[];
  query: Record<string, string>;
  years: { value: string; count: number }[];
}

const captions: Record<string, [string, string, string]> = {
  tech: [
    "ENGINEERING / KNOWLEDGE",
    "기술 지식",
    "지식도 프로젝트처럼, 토픽의 위치에서 찾습니다.",
  ],
  reflections: [
    "THE PRIVATE REVIEW",
    "사적인 감상록",
    "읽고, 보고, 맛보고. 오래 마음에 남은 것들.",
  ],
  writing: [
    "WRITING / MANUSCRIPTS",
    "글쓰기",
    "문장을 모으고, 고치고, 하나의 글로 엮습니다.",
  ],
  exercise: [
    "MOVE / TRAIN / REPEAT",
    "계속, 움직이기.",
    "어제의 기록 위에 오늘의 한 걸음을.",
  ],
  journal: [
    "THE QUIET DAYS",
    "평범한 날의 작은 문장들.",
    "서두르지 않고, 하루를 한 장씩 남깁니다.",
  ],
  parenting: [
    "GROWING TOGETHER",
    "함께 자라는 시간",
    "아이와 부모가 함께 배우고 자라는 기록.",
  ],
};

export default function SectionView({ section, posts, query, years }: Props) {
  const href = (patch: Record<string, string>) => ({
    pathname: "/",
    query: Object.fromEntries(
      Object.entries({ ...query, ...patch }).filter(([, value]) => value),
    ),
  });
  const classified = posts.map((post) => ({
    post,
    result: classifyPost(post),
  }));
  const group =
    taxonomy.labelsBySection[section as keyof typeof taxonomy.labelsBySection];
  const types: Record<string, { title: string }> = group?.types ?? {};
  const selectedType =
    query.type && Object.hasOwn(types, query.type) ? query.type : "";
  const typed = selectedType
    ? classified.filter((item) => item.result.type === selectedType)
    : classified;
  const caption = captions[section];
  const rawContent = (post: PostMeta) =>
    post.format === "html"
      ? post.description
      : (getPostBySlug(post.slug)?.content ?? "");
  const excerpt = (post: PostMeta, length = 190) =>
    excerptText(rawContent(post), length);
  const postLink = (post: PostMeta) => `/posts/${post.slug}`;
  const meta = (post: PostMeta) => (
    <div className="record-meta">
      <time dateTime={post.date}>
        {post.date.slice(0, 10).replaceAll("-", ".")}
      </time>
      {!post.isPublic && (
        <span className="record-private">
          <LockKeyhole size={12} aria-hidden="true" /> 비공개
        </span>
      )}
    </div>
  );
  const yearsNav = (
    <nav className="view-years" aria-label="연도별 글 인덱스">
      <Link
        href={href({ year: "", month: "" })}
        aria-current={!query.year ? "page" : undefined}
      >
        전체 연도
      </Link>
      {years.map((year) => (
        <Link
          key={year.value}
          href={href({ year: year.value, month: "" })}
          aria-current={query.year === year.value ? "page" : undefined}
        >
          {year.value === "unknown" ? "날짜 미상" : year.value}{" "}
          <span>{year.count}</span>
        </Link>
      ))}
    </nav>
  );
  const typeNav = Object.keys(types).length > 0 && (
    <nav
      className="view-types"
      aria-label={section === "writing" ? "글쓰기 프로젝트" : "세부 분류"}
    >
      <Link
        href={href({ type: "", month: "" })}
        aria-current={!selectedType ? "page" : undefined}
      >
        전체
      </Link>
      {Object.entries(types).map(([id, type]) => (
        <Link
          key={id}
          href={href({ type: id, month: "" })}
          aria-current={id === selectedType ? "page" : undefined}
        >
          {type.title}
        </Link>
      ))}
    </nav>
  );
  const empty = (
    <p className="view-empty">
      아직 연결된 글이 없습니다. 다른 분류나 기간을 선택해보세요.
    </p>
  );

  if (section === "tech") {
    const paths = new Set<string>();
    for (const definition of Object.values(labelDefinitions)) {
      if (definition.section !== "tech") continue;
      for (const path of definition.topicPaths ?? []) {
        const parts = path.split("/");
        for (let i = 1; i <= parts.length; i++)
          paths.add(parts.slice(0, i).join("/"));
      }
    }
    const populatedPaths = [...paths].filter((path) =>
      classified.some((item) => isWithinTopic(item.result.topicPaths, path)),
    );
    const selected =
      query.topic && populatedPaths.includes(query.topic) ? query.topic : "";
    const visible = selected
      ? classified.filter((item) =>
          isWithinTopic(item.result.topicPaths, selected),
        )
      : classified;
    const tree = (parent = "", depth = 0): React.ReactNode => (
      <ul>
        {populatedPaths
          .filter((path) => path.split("/").slice(0, -1).join("/") === parent)
          .sort()
          .map((path) => {
            const children = populatedPaths.some((other) =>
              other.startsWith(`${path}/`),
            );
            const count = classified.filter((item) =>
              isWithinTopic(item.result.topicPaths, path),
            ).length;
            const link = (
              <Link
                href={href({ topic: path })}
                aria-current={selected === path ? "page" : undefined}
              >
                <Folder size={14} aria-hidden="true" />
                <span>{path.split("/").at(-1)}</span>
                <small>{count}</small>
              </Link>
            );
            return (
              <li key={path} data-topic-depth={depth + 1}>
                {children ? (
                  <details
                    className="package-branch"
                    open={selected === path || selected.startsWith(`${path}/`)}
                  >
                    <summary className="package-heading">
                      <Link
                        href={href({ topic: path })}
                        aria-current={selected === path ? "page" : undefined}
                      >
                        <FolderOpen size={13} aria-hidden="true" />
                        <span>{path.split("/").at(-1)}</span>
                        <small aria-label={`${count}개의 글`}>{count}</small>
                      </Link>
                    </summary>
                    {tree(path, depth + 1)}
                  </details>
                ) : (
                  link
                )}
              </li>
            );
          })}
      </ul>
    );
    return (
      <section className="section-view" aria-label="기술 지식 탐색">
        <header className="view-cover tech-cover">
          <span className="view-kicker">{caption[0]}</span>
          <p>{caption[2]}</p>
        </header>
        {yearsNav}
        <div className="knowledge-window">
          <div className="ide-toolbar">
            <span className="ide-project">KN</span>
            <strong>knowledge-notes</strong>
            <span>Project</span>
          </div>
          <div className="knowledge-layout">
            <aside className="knowledge-tree">
              <h2>Project</h2>
              <Link
                className="all-topics"
                href={href({ topic: "" })}
                aria-current={!selected ? "page" : undefined}
              >
                모든 기술 지식 <span>{posts.length}</span>
              </Link>
              <nav aria-label="기술 토픽 탐색">{tree()}</nav>
            </aside>
            <div className="knowledge-editor">
              <div className="editor-tab">
                M↓ &nbsp;{" "}
                {selected ? `${selected.split("/").at(-1)}.md` : "README.md"}
              </div>
              <div className="editor-path">
                기술 / {selected.replaceAll("/", " / ") || "모든 토픽"}
              </div>
              <div className="editor-content">
                <h1>
                  <span>#</span> {selected.split("/").at(-1) || "기술 지식"}
                </h1>
                <p className="view-muted">
                  {visible.length}개의 기록 · 하위 토픽 포함
                </p>
                {visible.length
                  ? visible.map(({ post }, i) => (
                      <article className="knowledge-file" key={post.slug}>
                        <span className="line-number" aria-hidden="true">
                          {i + 1}
                        </span>
                        <h2>
                          <Link href={postLink(post)}>{post.title}</Link>
                        </h2>
                        <p>{excerpt(post)}</p>
                        {meta(post)}
                      </article>
                    ))
                  : empty}
              </div>
            </div>
          </div>
          <footer className="ide-status">
            <span>{selected || "knowledge-notes"}</span>
            <span>{visible.length} notes · UTF-8 · Markdown</span>
          </footer>
        </div>
      </section>
    );
  }

  if (section === "writing")
    return (
      <section className="section-view" aria-label="글쓰기 프로젝트 탐색">
        <header className="view-cover">
          <span className="view-kicker">{caption[0]}</span>
          <p>{caption[2]}</p>
        </header>
        {yearsNav}
        <div className="writing-layout">
          <aside className="writing-projects">
            <h2>글쓰기 프로젝트</h2>
            {typeNav}
          </aside>
          <div>
            <h1 className="project-heading">
              {selectedType ? types[selectedType].title : "글쓰기 서랍"}
            </h1>
            {typed.length
              ? typed.map(({ post }, i) => {
                  const text = excerpt(post, 160);
                  const chars = Array.from(
                    new Intl.Segmenter("ko", {
                      granularity: "grapheme",
                    }).segment(text),
                    (item) => item.segment,
                  );
                  const cells = Math.ceil(chars.length / 20) * 20;
                  return (
                    <article key={post.slug} className="manuscript">
                      <div className="manuscript-meta">
                        <span>
                          원고 {String(i + 1).padStart(2, "0")} · 발췌
                        </span>
                        {meta(post)}
                      </div>
                      <h2>
                        <Link href={postLink(post)}>{post.title}</Link>
                      </h2>
                      <div
                        className="manuscript-cells"
                        role="img"
                        aria-label={text}
                      >
                        {Array.from({ length: cells }, (_, index) => (
                          <span key={index} aria-hidden="true">
                            {chars[index] || "\u00a0"}
                          </span>
                        ))}
                      </div>
                      <Link className="continue-reading" href={postLink(post)}>
                        전체 글 읽기 →
                      </Link>
                    </article>
                  );
                })
              : empty}
          </div>
        </div>
      </section>
    );

  const ordered = typed
    .map((item) => ({ ...item, date: sectionDate(item.post, section) }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const months = [
    ...new Set(
      ordered.map((item) =>
        /^\d{4}-\d{2}/.test(item.date) ? item.date.slice(0, 7) : "unknown",
      ),
    ),
  ];
  const selectedMonth =
    query.month && months.includes(query.month) ? query.month : "";
  const visible = selectedMonth
    ? ordered.filter((item) => item.date.startsWith(selectedMonth))
    : ordered;
  const monthNav = (
    <nav className="view-months" aria-label="월별 기록">
      <Link
        href={href({ month: "" })}
        aria-current={!selectedMonth ? "page" : undefined}
      >
        전체 기간
      </Link>
      {months.map((month) => (
        <Link
          key={month}
          href={href({ month })}
          aria-current={month === selectedMonth ? "page" : undefined}
        >
          {month}
        </Link>
      ))}
    </nav>
  );

  return (
    <section
      className="section-view"
      aria-label={`${taxonomy.sections.find((s) => s.id === section)?.title} 기록`}
    >
      <header className={`view-cover ${section}-cover`}>
        <span className="view-kicker">{caption[0]}</span>
        <h1>{caption[1]}</h1>
        <p>{caption[2]}</p>
      </header>
      {typeNav}
      {yearsNav}
      {section !== "reflections" && monthNav}
      <div
        className={
          section === "reflections" ? "review-archive" : "time-archive"
        }
      >
        {visible.length
          ? visible.map(({ post, date, result }, i) => {
              const month = date.slice(0, section === "reflections" ? 4 : 7);
              const previous = visible[i - 1]?.date.slice(
                0,
                section === "reflections" ? 4 : 7,
              );
              const metrics: { distance?: string; pace?: string } =
                section === "exercise" && result.type === "running"
                  ? runningMetrics(rawContent(post))
                  : {};
              return (
                <Fragment key={post.slug}>
                  {month !== previous && (
                    <h2 className="period-heading">
                      {month.replace("-", "년 ")}
                      {section === "reflections" ? "년" : "월"}
                    </h2>
                  )}
                  <article
                    className={`view-record ${section}-record`}
                    data-post-date={date}
                  >
                    {section === "exercise" ||
                    section === "journal" ||
                    section === "parenting" ? (
                      <time className="record-day" dateTime={date}>
                        {date.slice(8, 10)}
                        <small>{date.slice(5, 7)}월</small>
                      </time>
                    ) : (
                      <span className="review-index" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    )}
                    <div className="record-copy">
                      <h3>
                        <Link href={postLink(post)}>{post.title}</Link>
                      </h3>
                      <p>
                        {excerpt(
                          post,
                          section === "journal" || section === "parenting"
                            ? 300
                            : 190,
                        )}
                      </p>
                      {meta(post)}
                      {date.slice(0, 10) !== post.date.slice(0, 10) && (
                        <p className="view-muted">
                          활동 {date.slice(0, 10)} · 작성{" "}
                          {post.date.slice(0, 10)}
                        </p>
                      )}
                    </div>
                    {(metrics.distance || metrics.pace) && (
                      <dl className="activity-metrics">
                        {metrics.distance && (
                          <div>
                            <dt>km</dt>
                            <dd>{metrics.distance}</dd>
                          </div>
                        )}
                        {metrics.pace && (
                          <div>
                            <dt>/ km</dt>
                            <dd>{metrics.pace}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </article>
                </Fragment>
              );
            })
          : empty}
      </div>
    </section>
  );
}
