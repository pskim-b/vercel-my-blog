import Header from "@/components/Header";
import Link from "next/link";
import { getAllPosts } from "../lib/posts";
import PostList from "@/components/PostList";
import { isAuthenticated } from "@/lib/auth";
import { normalizeLabel } from "@/lib/labels.mjs";
import { archiveYears, postYear } from "@/lib/archive.mjs";
import { classifyPost, taxonomySections, canAccessSection } from "@/lib/taxonomy.mjs";
import { redirect } from "next/navigation";
import SectionTabs from "@/components/SectionTabs";
import SectionView from "@/components/SectionView";
import { sectionDate } from "@/lib/section-presentation.mjs";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function countValues(values: string[]) {
  return Array.from(
    values.reduce((counts, value) => {
      counts.set(value, (counts.get(value) ?? 0) + 1);
      return counts;
    }, new Map<string, number>())
  )
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const authenticated = await isAuthenticated();
  const visiblePosts = getAllPosts().filter((post) => authenticated || post.isPublic);
  const params = searchParams ? await searchParams : {};
  const sourceParam = firstParam(params.source);
  const selectedSource = sourceParam === "tistory" || sourceParam === "hugo" ? sourceParam : undefined;
  const tistoryCount = visiblePosts.filter(post => post.migration?.source === "tistory").length;
  const hugoCount = visiblePosts.filter(post => post.migration?.source === "hugo").length;
  const allPosts = selectedSource ? visiblePosts.filter(post => post.migration?.source === selectedSource) : visiblePosts;
  const classifications = new Map(allPosts.map(post => [post.slug, classifyPost(post)]));
  const sectionParam = firstParam(params.section);
  const selectedSection = taxonomySections.find(section => section.id === sectionParam);
  if (selectedSection && !canAccessSection(selectedSection.id, authenticated)) {
    const query = new URLSearchParams(Object.entries(params).flatMap(([key, value]) => {
      const first = firstParam(value);
      return first ? [[key, first]] : [];
    }));
    redirect(`/login?next=${encodeURIComponent(`/?${query.toString()}`)}`);
  }
  const sectionPosts = selectedSection
    ? allPosts.filter(post => classifications.get(post.slug)?.section === selectedSection.id)
    : allPosts;
  const selectedCategory = firstParam(params.category);
  const selectedLabel = selectedCategory ? undefined : normalizeLabel(firstParam(params.label));
  const activeFilter = selectedCategory
    ? { type: "category" as const, value: selectedCategory }
    : selectedLabel
      ? { type: "label" as const, value: selectedLabel }
      : null;
  const filteredByTopic = selectedCategory
    ? sectionPosts.filter((post) => post.category === selectedCategory)
    : selectedLabel
      ? sectionPosts.filter((post) => post.label.includes(selectedLabel))
      : sectionPosts;
  const yearParam = firstParam(params.year);
  const selectedYear = yearParam && /^(?:\d{4}|unknown)$/.test(yearParam) ? yearParam : undefined;
  const years = archiveYears(filteredByTopic.map(post => ({ ...post, date: sectionDate(post, selectedSection?.id) })));
  const filteredPosts = selectedYear ? filteredByTopic.filter(post => postYear(sectionDate(post, selectedSection?.id)) === selectedYear) : filteredByTopic;
  const topicFilter = {
    ...(selectedSource ? { source: selectedSource } : {}),
    ...(selectedSection ? { section: selectedSection.id } : {}),
    ...(selectedCategory ? { category: selectedCategory } : selectedLabel ? { label: selectedLabel } : {}),
  };
  const categories = countValues(sectionPosts.map((post) => post.category));
  const labels = countValues(sectionPosts.flatMap((post) => post.label));
  const sections = taxonomySections.filter(section => canAccessSection(section.id, authenticated)).map(section => ({
    id: section.id,
    title: section.title,
    count: allPosts.filter(post => classifications.get(post.slug)?.section === section.id).length,
  }));
  const classificationIssues = selectedSection?.id === "unclassified"
    ? Object.fromEntries(filteredPosts.map(post => {
      const result = classifications.get(post.slug)!;
      return [post.slug, [
        ...result.issues.map(issue => issue.message),
        ...(result.unknownLabels.length ? [`미등록 라벨: ${result.unknownLabels.join(", ")}`] : []),
      ]];
    }))
    : undefined;

  return (
    <div className="blog-shell" data-section-theme={selectedSection?.id ?? "all"}>
      <Header
        categories={categories}
        labels={labels}
        authenticated={authenticated}
        activeFilter={activeFilter}
        selectedYear={selectedYear}
        selectedSection={selectedSection?.id}
        selectedSource={selectedSource}
        tistoryCount={authenticated ? tistoryCount : 0}
        hugoCount={authenticated ? hugoCount : 0}
      />
      <main className="blog-main">
        {selectedSource && <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-400" aria-label="현재 원본 블로그">
          <strong className="text-white">{selectedSource === "hugo" ? "Hugo" : "티스토리"} 글 {allPosts.length}편</strong>
          <Link href="/" className="text-blue-400 hover:underline">블로그 전체 보기</Link>
        </div>}
        <SectionTabs sections={sections} selectedSection={selectedSection?.id} total={allPosts.length} query={selectedSource ? { source: selectedSource } : undefined} />
        {selectedSection?.id === "unclassified" && (
          <header className="section-heading">
            <h1>{selectedSection.title}</h1>
            <p>{selectedSection.description}</p>
            {selectedSection.id === "unclassified" && <p>글의 라벨을 보완하거나 분류 정의를 등록하면 해당 탭으로 자동 이동합니다.</p>}
          </header>
        )}
        {selectedSection && selectedSection.id !== "unclassified" ? (
          <SectionView section={selectedSection.id} posts={filteredPosts} years={years}
            query={{ ...topicFilter, ...(selectedYear ? { year: selectedYear } : {}),
              ...Object.fromEntries(["topic", "type", "month"].flatMap(key => {
                const value = firstParam(params[key]);
                return value ? [[key, value]] : [];
              })) }} />
        ) : <PostList posts={filteredPosts} years={years} selectedYear={selectedYear} filter={topicFilter} classificationIssues={classificationIssues} />}
      </main>
    </div>
  );
}
