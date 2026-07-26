---
title: "ChatGPT에서 GitHub 저장소 연결 및 발행 가이드"
date: "2026-07-26"
category: "note"
label:
  - "ai-generated"
---

ChatGPT에서 대화를 블로그 노트로 발행하려면, 노트 작성 규칙과 GitHub 쓰기 권한이 모두 필요하다. `psnote` 스킬은 문서를 어떤 형식으로 만들지 결정하고, GitHub 앱은 실제 저장소에 파일을 만들고 커밋하는 역할을 한다.

이 문서는 개인 블로그 저장소 `pskim-b/vercel-my-blog`에 ChatGPT를 연결해 노트를 발행하는 기준 절차를 정리한다.

## 동작 구조

```text
ChatGPT 대화
  → psnote 스킬: 요약·경로·front matter 규칙 적용
  → GitHub 앱: 인증·권한 확인·파일 커밋
  → GitHub main 브랜치
  → Vercel: 기존 배포 흐름으로 반영
```

스킬만 설치되어 있어도 GitHub 인증이나 쓰기 권한이 자동으로 생기지는 않는다. GitHub 앱이 설치·연결되어 있고, 연결된 계정이 대상 저장소에 Write 권한을 가져야 한다.

## 발행 대상

| 항목 | 값 |
| --- | --- |
| GitHub 계정 | `pskim-b` |
| 저장소 | `pskim-b/vercel-my-blog` |
| 브랜치 | `main` |
| 기본 경로 | `posts/note/` |
| 파일 규칙 | `posts/{category}/YYYY-MM-DD-주제-slug.md` |

카테고리를 따로 지정하지 않으면 `note`를 사용한다. 예를 들어 `카테고리 book으로 psnote 추가해줘`라고 요청하면 `posts/book/`에 저장하고 front matter의 `category`도 `book`으로 쓴다.

## 연결 전 확인할 조건

1. ChatGPT에서 GitHub 앱 또는 GitHub 플러그인이 사용할 수 있어야 한다.
2. GitHub 앱의 연결 계정이 `pskim-b`인지 확인한다.
3. GitHub의 앱 권한 설정에서 `pskim-b/vercel-my-blog`가 선택되어 있어야 한다.
4. 해당 계정이 저장소에 Push 또는 Write 권한을 가져야 한다.
5. 현재 대화 환경에서 GitHub 쓰기 도구가 노출되어 있어야 한다.

이 저장소는 `main` 브랜치에 직접 커밋하는 흐름을 사용한다. 브랜치 보호 규칙이나 조직 정책으로 직접 Push가 막혀 있다면, 스킬은 Markdown 초안만 만들거나 별도 브랜치·Pull Request 흐름으로 전환해야 한다.

## GitHub 앱 연결 절차

1. ChatGPT의 **설정(Settings) → Apps / Connectors / Plugins**로 이동한다.
2. GitHub 앱을 찾아 **Connect**를 선택한다.
3. GitHub 인증 화면에서 블로그 소유 계정인 `pskim-b`로 로그인한다.
4. 저장소 선택 화면에서 **Only select repositories**를 선택하고 `pskim-b/vercel-my-blog`를 추가한다.
5. GitHub 앱 설치 권한을 승인한 뒤 ChatGPT로 돌아온다.
6. 새 대화에서 GitHub 앱이 보이는지, 저장소 정보를 읽을 수 있는지 확인한다.

저장소 선택 목록이 비어 있을 때는 다음을 확인한다.

- GitHub 인증을 한 계정이 실제 저장소 소유자이거나 협업자로 등록되어 있는가.
- GitHub의 앱 설치 페이지에서 올바른 개인 계정 또는 조직을 선택했는가.
- 기존 GitHub 연결을 해제한 뒤, `pskim-b` 계정으로 다시 인증했는가.
- 조직 저장소라면 조직 관리자 정책이 서드파티 앱 설치를 제한하지 않는가.

## psnote 스킬의 역할과 제약

`psnote` 스킬은 다음 규칙을 재사용한다.

- 대화 원문이 아닌 핵심 질문, 논의, 결론, 다음 행동을 중심으로 요약한다.
- 개인정보와 회사 비공개 정보는 제거하거나 일반화한다.
- 카테고리를 지정하지 않으면 `note`를 사용한다.
- 모든 AI 생성 문서에 `ai-generated` 라벨을 넣는다.
- GitHub 쓰기 도구와 권한이 있으면 대상 저장소에 커밋한다.
- 쓰기 도구나 권한이 없으면 완성된 Markdown과 권장 경로만 제공한다.

따라서 스킬은 연결 정보를 보관하거나 다른 워크스페이스로 GitHub 인증을 전달하지 않는다. 앱 연결은 계정 또는 워크스페이스 정책에 따라 관리되며, 프로젝트별로 따로 연결하는 구조는 아니다. 프로젝트 안의 대화에서도 연결된 GitHub 앱을 사용할 수는 있다.

## 발행 명령 예시

기본 노트는 다음처럼 요청한다.

> psnote로 저장해줘

카테고리를 지정하려면 다음처럼 요청한다.

> 카테고리 book으로 psnote 추가해줘

생성 문서는 반드시 다음 front matter를 포함한다.

```yaml
---
title: "제목"
date: "YYYY-MM-DD"
category: "note"
label:
  - "ai-generated"
---
```

`label`은 단일 문자열이 아니라 목록이며, AI가 생성해 GitHub에 저장하는 문서에서는 `ai-generated`를 제거하지 않는다.

## 문제 해결 순서

### GitHub가 보이지 않거나 스킬이 발행하지 못할 때

1. 현재 ChatGPT 워크스페이스에서 GitHub 앱 또는 플러그인이 허용되어 있는지 확인한다.
2. GitHub 연결이 만료되지 않았는지 확인하고 필요하면 Reconnect 한다.
3. 연결 계정이 `pskim-b`인지 확인한다.
4. GitHub 앱 설정의 선택 저장소 목록에 `pskim-b/vercel-my-blog`가 있는지 확인한다.
5. 저장소의 협업자 권한이 Write 이상인지 확인한다.
6. 새 대화에서 다시 실행한다. 현재 대화에 노출된 도구 목록은 연결 변경 직후 갱신되지 않을 수 있다.
7. 여전히 쓰기 도구가 없다면, psnote에게 Markdown 초안과 파일 경로를 받아 직접 커밋한다.

### Custom GPT에서 바로 발행하고 싶을 때

Custom GPT의 Instructions만으로는 GitHub 쓰기 권한을 부여할 수 없다. Custom GPT 화면에 GitHub 앱이 노출되어 사용할 수 있는 경우에만 앱 연결을 활용할 수 있다. 앱이 노출되지 않는 환경에서는 다음 중 하나가 필요하다.

- GitHub 앱이 연결된 Work/Codex 대화에서 `psnote`를 사용한다.
- Custom GPT에 별도 외부 Action을 추가하고, 그 Action이 안전하게 GitHub 저장소에 쓰도록 구현한다.

## 운영 원칙

- GitHub의 Markdown 노트를 장기 기록의 기준으로 삼는다.
- ChatGPT Memory에는 “노트를 어떻게 작성하고 저장할지”라는 선호만 남긴다.
- 공개 블로그에 적합하지 않은 개인정보, 가족의 식별 정보, 회사 비공개 정보는 발행하지 않는다.
- 연결·권한 상태가 불명확하면 발행 전에 저장소와 권한을 먼저 확인한다.

이 구성이 되면 ChatGPT는 생각을 정리하는 대화 공간이 되고, `psnote`와 GitHub는 검토된 기록을 축적하는 발행 파이프라인이 된다.
