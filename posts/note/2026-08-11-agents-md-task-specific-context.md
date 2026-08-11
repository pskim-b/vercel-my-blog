---
title: "1편. Context를 잘 정리해두면 Coding Agent는 알아서 찾아갈까?"
date: "2026-08-11"
category: "note"
scope: "public"
label:
  - "ai-generated"
---

# 1편. Context를 잘 정리해두면 Coding Agent는 알아서 찾아갈까?

Coding Agent를 실제 프로젝트에 적용하면 자연스럽게 한 가지 문제를 만나게 됩니다.

**Agent에게 우리 프로젝트의 Engineering Knowledge를 어떻게 전달할 것인가?**

프로젝트가 작을 때는 `AGENTS.md` 하나만으로도 상당 부분 해결할 수 있습니다.

하지만 프로젝트가 커지면 Architecture, Convention, ADR, Security Policy, Testing Guide 등을 하나의 파일에 계속 추가하는 방식은 유지하기 어렵습니다.

그래서 실제로는 Engineering Knowledge를 별도의 Context File로 분리하게 됩니다.

```text
AGENTS.md
   │
   └── Context / Convention References

docs/
 ├── architecture/
 ├── conventions/
 │    ├── database.md
 │    ├── api.md
 │    ├── testing.md
 │    └── security.md
 ├── adr/
 │    ├── ADR-001.md
 │    ├── ADR-002.md
 │    └── ...
 └── domains/
      ├── payment.md
      └── order.md
```

필요하면 directory별 instruction을 추가하거나 특정 convention에서 다른 문서를 참조하도록 만들 수도 있습니다.

이것은 합리적인 발전입니다.

문제는 **Context를 잘 분리해서 저장하는 것과 Agent가 올바른 Context를 사용하는 것은 서로 다른 문제**라는 점입니다.

## Knowledge는 정리되어 있지만 Agent가 찾아야 한다

예를 들어 Agent에게 다음 작업을 요청했다고 가정해 보겠습니다.

> Payment Refund API에 idempotency를 추가해줘.

Repository에는 이미 필요한 정보가 존재할 수 있습니다.

```text
docs/architecture/payment.md
docs/conventions/api.md
docs/conventions/database.md
docs/adr/ADR-042-transaction-boundary.md
docs/adr/ADR-103-idempotency.md
services/payment/PaymentCaptureHandler.ts
```

문서는 존재하고, 사람이 보기에는 나름 체계적으로 정리되어 있습니다.

하지만 이제 Agent에게 새로운 문제가 생깁니다.

```text
Task
 ↓
어떤 Context가 필요한가?
 ↓
어디에 있는가?
 ↓
어떤 것을 먼저 읽어야 하는가?
 ↓
서로 충돌하면 무엇을 따라야 하는가?
 ↓
어떤 기존 구현을 참고해야 하는가?
```

결국 Agent가 repository를 탐색하면서 스스로 이 문제를 해결해야 합니다.

## Directory 구조만으로는 Relevance를 알 수 없다

가장 간단한 방법은 현재 수정하는 directory와 가까운 Context를 읽는 것입니다.

```text
Global
  ↓
Domain
  ↓
Module
  ↓
Local
```

이 방식은 여전히 유용합니다.

특정 directory에 적용되는 convention이나 ownership을 표현하기에는 좋은 방법입니다.

하지만 실제 software dependency는 directory hierarchy와 정확하게 일치하지 않습니다.

Payment Refund 하나를 수정하는 작업이 다음과 연결될 수 있습니다.

```text
Payment Refund
     │
     ├── Payment Architecture
     ├── Ledger Consistency
     ├── Transaction Boundary
     ├── API Compatibility
     ├── Idempotency
     └── Security Policy
```

이 정보들은 repository의 서로 다른 위치에 존재할 수 있습니다.

즉:

**Directory proximity는 Context Relevance를 판단하는 좋은 signal이지만 충분한 signal은 아닙니다.**

## 결국 Agent가 Context Retrieval을 수행하게 된다

Context File을 분리하면 Context가 사라지는 것이 아닙니다.

단지 문제가 다음과 같이 바뀝니다.

```text
Before

Large Context
     ↓
   Agent
```

에서:

```text
After

Task
 ↓
Agent explores repository
 ↓
Find candidate context
 ↓
Determine relevance
 ↓
Read selected context
 ↓
Implementation
```

즉 Context Selection 책임의 상당 부분을 Agent에게 넘기게 됩니다.

여기서 Agent가 필요한 ADR을 발견하지 못하거나, 잘못된 Convention을 선택하거나, 이미 superseded된 문서를 읽거나, 중요한 기존 구현을 놓친다면 결과의 품질이 떨어집니다.

문서가 없어서가 아닙니다.

**필요한 문서가 있었지만 올바르게 전달되지 않은 것입니다.**

# Context가 많아서가 아니라, 필요한 Context를 찾는 것이 어렵다

이 지점에서 최근 연구들이 흥미로운 데이터를 제공합니다.

## Repository Context를 많이 제공한다고 문제가 해결되지는 않는다

**Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents? (2026)**

https://arxiv.org/abs/2602.11988

이 연구는 repository-level context file이 Coding Agent의 성능에 어떤 영향을 주는지 평가했습니다.

Context를 추가했을 때 task 성공률은 일관되게 향상되지 않았지만 inference cost는 **20% 이상 증가**했습니다.

Agent가 instruction을 단순히 무시한 것도 아니었습니다.

추가된 instruction에 따라 더 많은 repository exploration과 validation을 수행하기도 했지만, 이것이 반드시 task 성공률 향상으로 이어지지는 않았습니다.

즉 Context Discovery 문제를 해결하기 위해 모든 정보를 항상 제공하는 것도 좋은 해결책은 아닙니다.

## Context File 자체도 잘못 구성될 수 있다

**Configuration Smells in AGENTS.md Files: Common Mistakes in Configuring Coding Agents (2026)**

https://arxiv.org/abs/2606.15828

100개의 open-source repository를 분석한 이 연구에서는 다음과 같은 문제가 발견됐습니다.

- **Lint Leakage — 62%**
- **Context Bloat — 42%**
- **Skill Leakage — 35%**

이는 모든 Engineering Knowledge를 Agent instruction으로 다시 모으는 접근 역시 scaling하기 어렵다는 것을 보여줍니다.

따라서 두 극단 모두 문제가 있습니다.

```text
모든 Context를 항상 제공
          ↓
     Context Bloat

Context를 모두 분리하고 Agent가 알아서 찾게 함
          ↓
Context Retrieval Problem
```

# 실제 Agent는 필요한 Context를 얼마나 잘 찾을까?

이 문제를 보다 직접적으로 다룬 연구가 있습니다.

**Agent Retrieval Bench: Evaluating Repository Context Retrieval for Coding Agents (2026)**

https://arxiv.org/abs/2607.24882

이 연구는 25개 repository, 약 392,000개의 file과 약 790만 개의 chunk를 대상으로 repository context retrieval을 평가했습니다.

특히 흥미로운 결과는 실제 Coding Agent trajectory가 필요한 **gold file을 하나도 찾지 못한 경우가 약 27–35%**였다는 점입니다.

즉 Agent가 repository를 탐색했다고 해서 필요한 Context를 반드시 발견하는 것은 아닙니다.

또한 lexical search, embedding, RepoMap 등 어느 하나의 retrieval 방식도 모든 종류의 Task에서 가장 좋은 결과를 내지는 않았습니다.

이 결과는 중요한 시사점을 줍니다.

**Context Retrieval은 Agent가 알아서 해결할 세부 동작이 아니라, 별도로 설계하고 평가해야 하는 Engineering Problem이다.**

# 문제는 Context Storage가 아니라 Context Routing이다

여기까지 오면 문제를 조금 다르게 정의할 수 있습니다.

Engineering Knowledge를 체계적으로 저장하는 것은 이미 어느 정도 해결 가능한 문제입니다.

```text
Architecture
Convention
ADR
Skill
Policy
Canonical Code
```

이들을 directory와 document로 잘 분류할 수 있습니다.

하지만 실제 Agent Task에서는 그 위에 하나의 단계가 더 필요합니다.

```text
                   Repository Knowledge
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
       ADRs            Conventions         Skills
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ?
                           │
                           ▼
                          Task
```

바로 이 `?`가 문제입니다.

현재는 많은 경우 Agent가 repository를 탐색하면서 암묵적으로 이 역할까지 수행합니다.

하지만 프로젝트가 커질수록 이 판단은 어려워집니다.

따라서 필요한 것은:

```text
Task
  ↓
Context Resolver
  ↓
Relevant Context
  ├── ADRs
  ├── Conventions
  ├── Skills
  ├── Policies
  └── Canonical Code
  ↓
Agent
```

와 같은 **체계적인 Context Resolution Layer**일 수 있습니다.

# Context Organization에서 Context Resolution으로

지금까지 우리가 주로 고민했던 질문이:

**Engineering Knowledge를 어떻게 잘 정리할 것인가?**

였다면, Agent 시대에는 그 다음 질문이 중요해집니다.

**현재 Task에 필요한 Engineering Knowledge를 어떻게 결정할 것인가?**

두 문제는 다릅니다.

```text
Context Organization
        ↓
Where does knowledge live?

Context Resolution
        ↓
Which knowledge does this task need?
```

좋은 directory structure와 잘 작성된 ADR은 여전히 중요합니다.

하지만 그것만으로 Agent가 올바른 Context를 사용한다는 보장은 없습니다.

결국 우리가 해결해야 할 문제는 **더 좋은 Context File을 만드는 것에서, 더 좋은 Context Resolution System을 만드는 것으로 확장됩니다.**

다음 글에서는 이 Context Resolver가 어떤 역할을 해야 하는지, 그리고 ADR, Convention, Skill, Canonical Code, Lint/Test를 어떻게 조합하면 되는지 살펴보겠습니다.

## References

1. **Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents? (2026)**  
   https://arxiv.org/abs/2602.11988
2. **Configuration Smells in AGENTS.md Files: Common Mistakes in Configuring Coding Agents (2026)**  
   https://arxiv.org/abs/2606.15828
3. **Agent Retrieval Bench: Evaluating Repository Context Retrieval for Coding Agents (2026)**  
   https://arxiv.org/abs/2607.24882
