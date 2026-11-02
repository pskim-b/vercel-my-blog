import Header from "@/components/Header";
import { getAllPosts } from "../lib/posts";
import PostList from "@/components/PostList";
import { isAuthenticated } from "@/lib/auth";
import { normalizeLabel } from "@/lib/labels.mjs";
import { archiveYears, postYear } from "@/lib/archive.mjs";
import { classifyPost, taxonomySections } from "@/lib/taxonomy.mjs";
import SectionTabs from "@/components/SectionTabs";

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
  const allPosts = getAllPosts().filter((post) => authenticated || post.isPublic);
  const classifications = new Map(allPosts.map(post => [post.slug, classifyPost(post)]));
  const params = searchParams ? await searchParams : {};
  const sectionParam = firstParam(params.section);
  const selectedSection = taxonomySections.find(section => section.id === sectionParam);
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
  const years = archiveYears(filteredByTopic);
  const filteredPosts = selectedYear ? filteredByTopic.filter(post => postYear(post.date) === selectedYear) : filteredByTopic;
  const topicFilter = {
    ...(selectedSection ? { section: selectedSection.id } : {}),
    ...(selectedCategory ? { category: selectedCategory } : selectedLabel ? { label: selectedLabel } : {}),
  };
  const categories = countValues(sectionPosts.map((post) => post.category));
  const labels = countValues(sectionPosts.flatMap((post) => post.label));
  const sections = taxonomySections.map(section => ({
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
    <div>
      <Header
        categories={categories}
        labels={labels}
        authenticated={authenticated}
        activeFilter={activeFilter}
        selectedYear={selectedYear}
        selectedSection={selectedSection?.id}
      />
      <main className="max-w-4xl mx-auto p-6">
        <SectionTabs sections={sections} selectedSection={selectedSection?.id} total={allPosts.length} />
        {selectedSection && (
          <header className="section-heading">
            <h1>{selectedSection.title}</h1>
            <p>{selectedSection.description}</p>
            {selectedSection.id === "unclassified" && <p>글의 라벨을 보완하거나 분류 정의를 등록하면 해당 탭으로 자동 이동합니다.</p>}
          </header>
        )}
        <PostList posts={filteredPosts} years={years} selectedYear={selectedYear} filter={topicFilter} classificationIssues={classificationIssues} />
      </main>
    </div>
  );
}
