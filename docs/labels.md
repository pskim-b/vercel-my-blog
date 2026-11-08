# 라벨 정의와 미분류 관리

`config/taxonomy.json`이 라벨과 분류의 기준입니다. 위쪽 `sections`에 대분류와 필수 정보를 정의하고, 아래쪽 `labelsBySection`에 각 섹션의 `types`, `labels`, `legacyCategories`를 모읍니다. 글 본문과 파일 경로를 옮길 필요가 없습니다.

```text
sections                         대분류·화면·필수 정보 정의
labelsBySection
  tech                           기술
    types / labels / legacyCategories
  reflections                    감상
    types / labels / legacyCategories
  writing                        글쓰기
    types / labels / legacyCategories
  exercise                       운동
    types / labels / legacyCategories
  journal                        일기
    types / labels / legacyCategories
  parenting                      육아
  unclassified                   적바림(분류가 미정인 자료를 모으는 기본 분류)
sharedLabels                     작성 출처·형식·상태 등 공통 라벨
```

모든 섹션에서 세부 분류의 필드 이름은 `type`이고, 허용 값은 해당 섹션의 `types`에 `{ "title": "표시 이름" }` 형태로 정의합니다. 감상에서는 `book`, 운동에서는 `running`, 글쓰기에서는 `writing-and-thought` 등이 됩니다. 유형 ID는 섹션 안에서 유효하므로 서로 다른 섹션이 같은 ID를 사용할 수 있습니다.

라벨은 자신이 포함된 섹션을 상속하므로 `section`을 반복해서 적지 않습니다. 섹션의 `requires`는 필요한 정보를 선언합니다. 기술은 `["topicPaths"]`, 감상·글쓰기·운동은 `["type"]`이며 일기는 유형이 선택 사항입니다. 기술의 토픽 계층은 `topicPaths`로 계속 표현합니다.

## 글 추가

글의 front matter에 `label`을 지정합니다. 등록된 규칙을 사용하면 해당 대분류 탭에 자동으로 포함됩니다. 기존 배포 흐름으로 반영하며 목록에 글을 수동 등록하지 않습니다.

```yaml
title: "Kafka Consumer의 Offset 관리"
date: "2026-11-02"
category: "note"
scope: "public"
label:
  - kafka
  - kafka-offset
```

이 예시는 `기술 → kafka → consumer → offset`으로 분류됩니다. 상위 토픽 라벨을 함께 붙여도 경로는 가장 구체적인 것으로 정리합니다. 서로 다른 기술 토픽을 함께 붙일 수 있습니다.

기존 카테고리 중 `book`, `nextjs`, `Design pattern`, `running`, `lifelog`, `language`, `mycar` 등은 각 섹션의 `legacyCategories`에 있는 보조 규칙을 사용합니다. `note`는 대분류를 추측하지 않습니다. `study`는 기술이라는 힌트만 있으므로 토픽 라벨이 없으면 미분류입니다. 라벨과 기존 카테고리가 다른 대분류를 가리키면 미분류에서 검토합니다.

## 미리 등록한 라벨

| 대분류 | 대표 라벨 |
| --- | --- |
| 기술 | `cassandra`, `kafka`, `design`, `ai`, `java`, `spring`, `devops`, `redis`, `postgresql`, `frontend`, `git` 및 세부 토픽 라벨 |
| 감상 | `book`, `movie`, `exhibition`, `performance`, `restaurant` |
| 글쓰기 | `writing`, `poetry`, `essay` + `project:writing-and-thought` 또는 `project:poetry` |
| 운동 | `running`, `strength`, `swimming`, `cycling`, `hiking` |
| 일기 | `journal`, `speaking`, `language-practice` |

`ai-generated`는 작성 출처, `chat-log`와 `clip`은 형식, `idea`는 상태, `feedback`은 보조 주제입니다. 이 라벨들은 대분류를 단독으로 정하지 않습니다. 특히 `ai-generated`를 기술의 AI 토픽으로 해석하지 않습니다.

대소문자·앞뒤 공백·유니코드 표기를 정규화한 뒤 명시적으로 등록한 별칭만 적용합니다. `writting → writing`, `chatlog → chat-log` 등 기존 별칭도 JSON으로 옮겼습니다. 비슷하게 생긴 새 표현을 오타로 자동 추측하지 않습니다.

## 새 라벨 등록

기존 대분류에 속하는 새 라벨은 `labelsBySection.<섹션 ID>.labels`에 추가합니다. 다음은 `labelsBySection.tech.labels` 안에 넣을 항목입니다:

```json
"kafka-transactions": {
  "title": "Kafka Transactions",
  "topicPaths": ["kafka/producer/transactions"]
}
```

기술 경로는 `기술` 탭 아래 최대 3단계입니다. 같은 글을 새 정의로 다시 계산하므로 과거에 미분류였던 글도 조건을 충족하면 해당 탭으로 이동합니다. 분류 정의 변경 후에는 기존 배포 절차가 필요합니다.

감상·운동·글쓰기·일기의 세부 분류는 모두 `type`을 사용합니다. 해당 섹션의 `types`에 등록한 ID를 라벨의 `type`으로 연결합니다. 예를 들어 `labelsBySection.exercise.labels.running`에는 `{ "title": "러닝", "type": "running" }`을 정의합니다. 새 글쓰기 프로젝트도 `writing.types`와 `writing.labels`에 유형과 `project:<id>` 라벨을 추가하면 됩니다. 분류 결과도 `{ "section": "exercise", "type": "running" }`처럼 공통 구조로 반환합니다.

`ai-generated`, `chat-log` 등 대분류를 정하지 않는 라벨은 `sharedLabels`에 두고 `role`로 출처·형식·상태를 구분합니다. 모든 라벨 ID와 별칭은 글에서 섹션 구분 없이 사용되므로 전역에서 중복될 수 없습니다. 기존 `category`를 새 라벨과 반대되는 의미로 사용하지 않도록 확인합니다.

## 미분류와 미등록 라벨

- 대분류를 결정할 라벨이나 기존 카테고리 규칙이 없으면 미분류입니다.
- 서로 다른 대분류, 감상 종류, 프로젝트 등의 분류가 충돌하면 미분류입니다.
- 기술 토픽, 감상 종류, 글쓰기 프로젝트, 운동 종목이 부족하면 미분류입니다.
- 알 수 없는 라벨만 있으면 미분류이며 원래 라벨을 보존합니다.
- 유효한 분류와 미등록 보조 라벨이 함께 있으면 정상 분류하고 미등록 라벨은 감사 결과에 남깁니다.
- 미분류는 게시를 막는 상태가 아닌 별도의 탐색 탭입니다. 기존 공개/비공개 판단을 먼저 적용하므로 미분류 탭이나 글 수에 비공개 글이 노출되지 않습니다.
- 글 본문이나 라벨을 자동으로 다시 쓰지 않습니다. 추후 라벨을 보완하거나 정의를 등록하면 다시 분류합니다.

`npm run taxonomy:audit`로 전체 분포를, `npm run taxonomy:audit -- --json`으로 미분류 및 미등록 라벨 사유를 확인합니다. 이 CLI는 로컬 저장소의 모든 글을 검사하므로 JSON 결과에 비공개 글의 slug가 포함될 수 있습니다. 공개 웹에서는 권한으로 걸러진 글만 계산합니다.

빌드 전에 정의 파일을 검증합니다. 잘못된 분류 ID, 충돌하는 별칭, 3단계를 넘긴 경로 등 **정의 파일 오류**는 빌드를 실패시킵니다. **글의 미분류·미등록 라벨**은 빌드를 중단하지 않습니다.

## 화면 적용 범위

섹션 접근 권한은 `sections[].access`에서 관리합니다. `public`은 비로그인 방문자에게도 보이고, `authenticated`는 로그인 후에만 탭과 글을 볼 수 있습니다. 현재 `journal`만 `"access": "authenticated"`이며 나머지는 `public`입니다. 생략 시에는 `public`으로 취급합니다.

로그인 전에는 일기 탭·전체 목록·라벨/카테고리/연도 필터·글 수에서 일기 글을 제외합니다. `/?section=journal`과 Markdown 상세 주소는 로그인으로 이동하고, HTML 원문 및 비공개 글에서만 참조하는 첨부파일에도 같은 정책을 적용합니다. 글의 `scope: public` 또는 공개 폴더 설정도 섹션의 로그인 요구를 우회하지 않습니다. 충돌하는 라벨 때문에 적바림으로 이동한 글도 로그인 전용 섹션이 후보에 포함되면 비공개로 취급합니다.

실제 페이지는 `SectionView`에서 권한으로 걸러진 글을 렌더링합니다. 기술은 IntelliJ풍 토픽 트리(최대 3단계)와 에디터, 감상은 문예지풍 종류별 연도 목록, 글쓰기는 프로젝트와 원고지 발췌, 운동은 활동일 타임라인, 일기는 줄노트, 육아는 따뜻한 색의 월별 기록입니다. 라이트·다크 설정을 함께 따릅니다. Markdown 상세 페이지도 글의 분류 테마와 목록으로 돌아가는 링크를 사용합니다. 독립 HTML 문서는 원래 문서 디자인을 보존합니다.

글쓰기는 예외로 전체 라이트·다크 설정과 무관하게 흰 배경·검은 본문을 유지합니다. 목록의 원고지 미리보기에는 빨간 격자를 사용하고, 상세 화면은 원고지 칸이나 테두리 없이 일반 문단과 목록으로 표시합니다. 제목·링크·강조·인용·표·코드 등 Markdown 구조는 유지하며, 코드는 원본 공백과 줄바꿈을 보존합니다.

Markdown 상세의 본문, 메타데이터, 인용, 표, 인라인 코드와 코드 블록은 같은 섹션 팔레트를 사용합니다. 코드 하이라이트는 섹션별 배경에 맞춰 토큰의 글자 대비를 최소 4.5:1로 조정합니다. 기술 트리는 현재 읽을 수 있는 글이 있는 패키지만 표시하며, 각 패키지는 중복 행 없이 하위 글의 중복 없는 개수를 표시합니다.

`topic`, `type`, `month`, `year` 쿼리로 탐색 위치를 공유할 수 있습니다. 글쓰기 프로젝트 유형은 날짜를 바꾸지 않고 글을 모으며, 현재 프로젝트 안에서는 최신 작성순입니다. 저자가 별도의 목차 순서를 지정하는 편집 기능은 포함하지 않습니다.

운동 글에는 작성일과 다른 활동일이 명시된 경우 `activityDate`를 보완했습니다. 운동 목록은 활동일로 정렬하고 작성일을 함께 표시합니다. 거리와 페이스는 본문의 명시된 운동 요약에 있는 경우에만 표시합니다.

## 2026-11-03 라벨 정리

72개 글 중 기술 14, 감상 4, 글쓰기 5, 운동 10, 일기 31, 육아 3, 적바림 5개입니다. 미등록 라벨과 분류 충돌은 없습니다. 적바림 5개는 글을 숨기거나 억지로 다른 섹션에 넣지 않고 기존 공개 범위 그대로 남깁니다.

| 적바림에 남긴 글 | 사유 |
| --- | --- |
| 갤럭시 Z 폴드8과 폴드8 울트라 비교 | 제품 비교 자료. `product-research` 보조 라벨 |
| 주사(Rosacea): 증상과 생활 관리 요약 | 개인 경험 일기보다 건강 참고 자료. `health` 보조 라벨 |
| 콜라겐과 레티놀을 이용한 피부 관리 정리 | 건강 참고 자료. `health` 보조 라벨 |
| 젊음 | 독립적인 짧은 사유. 글쓰기 프로젝트를 임의로 만들지 않음 |
| [Note] Illusion Of Knowledge | 배움·메타인지 참고 자료. `learning` 보조 라벨 |

사용자 결정에 따라 운영·피드백 4편은 `engineering-management` 아래로, 육아 기사 클리핑·첫 아이 탄생·아이를 원하는 이유는 육아로 연결했습니다. 출산 휴가 12일차의 `running`은 `running-related` 보조 라벨로 바꿔 일기로 유지했습니다. `ai-generated`는 계속 작성 출처이며 기술 분류를 결정하지 않습니다. 글 본문·파일 경로·공개 설정은 변경하지 않았습니다.
