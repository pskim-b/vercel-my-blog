import Link from "next/link";

interface SectionOption {
  id: string;
  title: string;
  count: number;
}

export default function SectionTabs({ sections, selectedSection, total, query = {} }: {
  sections: SectionOption[];
  selectedSection?: string;
  total: number;
  query?: { source?: string };
}) {
  return (
    <nav className="section-tabs" aria-label="글 대분류">
      <Link href={{ pathname: "/", query }} aria-current={!selectedSection ? "page" : undefined}>
        전체 보기 <span>{total}</span>
      </Link>
      {sections.map(section => (
        <Link key={section.id} href={{ pathname: "/", query: { ...query, section: section.id } }}
          aria-current={selectedSection === section.id ? "page" : undefined}>
          {section.title} <span>{section.count}</span>
        </Link>
      ))}
    </nav>
  );
}
