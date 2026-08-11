---
title: "From AGENTS.md as a Knowledge Base to Task-Specific Context"
date: "2026-08-11"
category: "note"
label:
  - "ai-generated"
---

**English version first. Korean version follows below.**

## English

### Background

As coding agents become increasingly autonomous inside large repositories, a new engineering question emerges:

> How much engineering knowledge should an agent receive?

The intuitive answer is “as much as possible”: architecture principles, coding conventions, database and API rules, testing strategies, security requirements, ADRs, and exceptions. This often turns `AGENTS.md` into a complete engineering handbook.

That works surprisingly well in small repositories. As the codebase grows, however, the surrounding knowledge grows with it, while the knowledge relevant to one task usually remains small.

For a task such as “add idempotency support to the payment refund API,” an agent may need the payment architecture, refund API conventions, idempotency and transaction-boundary ADRs, canonical refund code, and relevant contract tests. It probably does not need frontend conventions, analytics architecture, or unrelated migration history.

**Repository knowledge grows with the system; task-relevant knowledge remains relatively small.**

### Layering helps, but is not enough

Hierarchical context—global, domain, module, and local—improves ownership and reduces duplication. But layering mainly solves organization and scope, not relevance selection.

Agents can still accumulate global, domain, module, local, and task instructions. Moreover, dependencies do not always follow directory boundaries. A payment change may depend on ledger consistency, security, API compatibility, and transaction rules located elsewhere.

Directory hierarchy is therefore only one signal for relevance.

### What recent research suggests

Three 2026 papers reinforce this concern:

1. **Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?** reports that repository-level context did not consistently improve task success, while inference cost increased by more than 20%. The authors recommend keeping human-written context focused on minimal requirements.

2. **Configuration Smells in AGENTS.md Files** reports context bloat, skill leakage, lint leakage, and conflicting or redundant instructions in real repositories. Procedures needed only for particular tasks should not always occupy global context. Machine-verifiable constraints are generally better enforced through formatters, linters, architecture tests, schemas, types, static analysis, or CI.

3. **Agent Retrieval Bench** shows that finding the right context is itself difficult. Across its evaluation, logged agent trajectories failed to retrieve any required gold file in roughly 27–35% of samples, and no single retrieval strategy dominated all task types.

The practical implication is that **context retrieval must be treated as a first-class engineering problem**, not left entirely to ad hoc repository exploration.

### From context organization to context selection

The first generation of agent configuration asked:

> How should instructions be organized?

The next generation should ask:

> Which knowledge should this task receive?

`AGENTS.md` can evolve from a knowledge container into the entry point and router for an engineering knowledge system.

A target structure might separate:

- `AGENTS.md`: critical invariants, context-discovery rules, and validation requirements
- `.agent/skills/`: task procedures loaded on demand
- `.agent/examples/`: canonical implementations
- `.agent/policies/`: relevant policies
- `docs/architecture/`, `docs/adr/`, `docs/conventions/`: discoverable engineering knowledge
- `tools/resolve-context`: context selection
- `tools/check-changed`: executable validation

The exact directory names matter less than **when information enters the agent context**.

### Three types of engineering knowledge

#### 1. Always-on context

Keep a small project constitution containing rules that apply to almost every task:

- Do not break public API compatibility.
- Respect domain and security boundaries.
- Add appropriate tests for new behavior.
- Run required validation.

#### 2. On-demand knowledge

Load domain architecture, ADRs, conventions, workflows, and examples only when relevant to the task.

#### 3. Executable constraints

Move machine-verifiable rules out of prose where possible:

| Constraint | Enforcement |
|---|---|
| Formatting | Formatter |
| Import restrictions | Linter |
| Layer dependencies | Architecture tests |
| API contracts | Contract tests or schema validation |
| Type invariants | Type system |
| Security policies | Static analysis or policy checks |

### Task-specific context as compilation

Agent execution can evolve from:

`Task → Large AGENTS.md → Implementation`

to:

`Task → Minimal AGENTS.md → Context resolution → Relevant knowledge → Implementation → Executable validation`

This resembles compilation:

`Repository knowledge + Task + Affected files + Dependency graph → Context resolver → Task-specific context`

The goal is to let repository knowledge grow while keeping the context for an individual task small and bounded.

For “add partial refund support,” the resolver might produce:

- Payment domain architecture
- ADR-042: transaction boundaries
- ADR-071: ledger consistency
- ADR-103: idempotency
- Refund API convention
- Canonical payment handlers
- Payment, contract, and architecture tests

### Make ADRs discoverable

A folder with hundreds of ADRs helps humans but is insufficient for automatic selection. Lightweight metadata can make ADRs retrievable:

```yaml
---
id: ADR-042
status: accepted
scope:
  - payment
  - checkout
applies_to:
  - services/payment/**
  - services/checkout/**
topics:
  - transaction
  - idempotency
  - retry
supersedes:
  - ADR-017
---
```

A resolver can then combine task semantics, affected paths, domain ownership, dependencies, and ADR metadata.

### Separate conventions, skills, and examples

A convention is a rule:

> Public REST resources use kebab-case.

A skill is a procedure:

> Inspect the contract, identify the owning domain, create models, implement authorization, update the contract, add tests, and run validation.

Rules and procedures have different lifecycles. Task-specific procedures should generally be loaded on demand.

Canonical code is another powerful context source. Pointing an agent to a well-selected implementation can communicate structure, naming, dependencies, error handling, transaction boundaries, and testing style more effectively than several paragraphs of documentation.

### Practical migration path

1. **Reduce always-on context.** Classify instructions as always required, task-specific, machine-verifiable, or obsolete/duplicated.
2. **Externalize detailed knowledge.** Move architecture, ADRs, conventions, skills, and examples into discoverable locations.
3. **Introduce executable enforcement.** Convert suitable conventions into lint rules, tests, schemas, types, and CI checks.
4. **Start with deterministic resolution.** Use paths, ownership, task type, dependency graphs, and ADR metadata before adding complex retrieval infrastructure.
5. **Improve retrieval after measurement.** Add lexical, semantic, embedding, repository-map, dependency-aware, or hybrid retrieval only where evaluation shows a need.

### Measure the context system

Once context becomes infrastructure, evaluate it like infrastructure:

- **Context precision:** How much retrieved material was relevant?
- **Context recall:** Were required ADRs and files retrieved?
- **Context size:** How many tokens were injected?
- **First-pass success:** Did the implementation pass validation without repair?
- **Architecture violations:** Were known constraints broken?
- **Human correction rate:** How often did people correct convention-related issues?

Historical pull requests can become an evaluation dataset for comparing large static `AGENTS.md`, layered context, and task-specific retrieval.

### Conclusion

The target architecture is:

**Minimal global context + task-based retrieval + canonical examples + executable guardrails**

Hierarchy solves organization and scope. Retrieval solves relevance. Executable checks solve enforcement.

An agent should not need to understand the entire engineering knowledge base for every task. It should receive the smallest sufficient context for the problem at hand.

`AGENTS.md` remains important—but as a **context router that teaches the agent how to find the right knowledge at the right time**, rather than as the knowledge base itself.

---

## 한국어 — AGENTS.md를 지식 저장소에서 Task-Specific Context로

### 배경

Coding Agent가 대규모 repository 안에서 점점 더 자율적으로 일하게 되면서 새로운 질문이 생깁니다.

> 엔지니어링 지식을 Agent에게 얼마나 제공해야 할까?

처음에는 architecture, coding convention, database와 API 규칙, testing 전략, security 요구사항, ADR, 예외사항을 가능한 한 많이 주는 것이 좋아 보입니다. 작은 프로젝트에서는 실제로 잘 동작합니다.

그러나 시스템과 주변 지식은 계속 커지는 반면, 하나의 Task에 필요한 지식은 대체로 작게 유지됩니다.

예를 들어 “payment refund API에 idempotency를 추가하라”는 Task에는 payment architecture, refund API convention, idempotency와 transaction boundary ADR, canonical refund 구현, contract test가 필요할 수 있습니다. Frontend convention, analytics architecture, 관련 없는 migration 이력까지 필요하지는 않습니다.

**Repository 전체 지식은 계속 증가하지만 개별 Task에 필요한 지식은 상대적으로 작습니다.**

### Layering의 한계

Global, domain, module, local로 context를 계층화하면 ownership과 중복 문제를 개선할 수 있습니다. 하지만 layering은 주로 organization과 scope를 해결할 뿐, relevance selection까지 보장하지 않습니다.

실제 dependency도 directory hierarchy와 항상 일치하지 않습니다. Payment 변경이 다른 위치의 ledger consistency, security, API compatibility, transaction rule에 의존할 수 있습니다. 경로는 relevance를 판단하는 여러 신호 중 하나일 뿐입니다.

### 최근 연구의 시사점

2026년의 세 연구는 이 문제를 뒷받침합니다.

1. **Evaluating AGENTS.md**는 repository-level context가 task 성공률을 일관되게 높이지 못한 반면 inference cost는 20% 이상 증가했다고 보고합니다. 사람이 작성하는 context에는 최소한의 필수 요구사항만 남길 것을 제안합니다.

2. **Configuration Smells in AGENTS.md Files**는 실제 repository에서 context bloat, skill leakage, lint leakage, conflicting/redundant instruction을 관찰합니다. 특정 Task에만 필요한 절차는 global context에 상주할 이유가 없고, 기계적으로 검증할 수 있는 규칙은 formatter, linter, architecture test, schema, type system, static analysis, CI로 강제하는 편이 낫습니다.

3. **Agent Retrieval Bench**는 올바른 context를 찾는 것 자체가 어렵다는 점을 보여줍니다. 평가된 실제 Agent trajectory의 약 27–35%는 필요한 gold file을 하나도 찾지 못했고, 모든 Task 유형에서 항상 우수한 retrieval 전략도 없었습니다.

따라서 **Context Retrieval을 Coding Agent infrastructure의 first-class engineering problem으로 다뤄야 합니다.**

### Context Organization에서 Context Selection으로

기존 질문은 “instruction을 어떻게 정리할까?”였습니다. 앞으로는 “이 Task가 어떤 지식을 받아야 하는가?”를 물어야 합니다.

`AGENTS.md`는 engineering handbook 전체를 담는 container가 아니라 engineering knowledge system의 entry point이자 **Context Router**가 될 수 있습니다.

- `AGENTS.md`: critical invariant, context discovery rule, validation requirement
- `.agent/skills/`: 필요할 때 로드하는 작업 절차
- `.agent/examples/`: canonical implementation
- `.agent/policies/`: 관련 policy
- `docs/architecture/`, `docs/adr/`, `docs/conventions/`: discoverable knowledge
- `tools/resolve-context`: context 선택
- `tools/check-changed`: executable validation

Directory 이름보다 중요한 것은 **정보가 언제 Agent context에 들어오는가**입니다.

### 엔지니어링 지식의 세 종류

#### 1. Always-On Context

거의 모든 Task에 적용되는 작은 “프로젝트 헌법”입니다.

- Public API compatibility를 깨지 않는다.
- Domain과 security boundary를 지킨다.
- 새 동작에 적절한 test를 추가한다.
- 필수 validation을 수행한다.

#### 2. On-Demand Knowledge

Domain architecture, ADR, convention, workflow, example은 관련 Task에서만 로드합니다.

#### 3. Executable Constraints

기계 검증이 가능한 규칙은 prose instruction 대신 실행 가능한 guardrail로 이동합니다.

| Constraint | Enforcement |
|---|---|
| Formatting | Formatter |
| Import restriction | Linter |
| Layer dependency | Architecture test |
| API contract | Contract test / schema validation |
| Type invariant | Type system |
| Security policy | Static analysis / policy check |

### Context를 Compilation으로 생각하기

실행 흐름을 다음과 같이 바꿀 수 있습니다.

`Task → Minimal AGENTS.md → Context Resolution → Relevant Knowledge → Implementation → Executable Validation`

이는 compiler와 비슷합니다.

`Repository Knowledge + Task + Affected Files + Dependency Graph → Context Resolver → Task-Specific Context`

목표는 repository knowledge가 계속 성장해도 개별 Task의 context는 작고 bounded하게 유지하는 것입니다.

### ADR을 Discoverable하게 만들기

수백 개의 ADR 파일을 저장하는 것만으로는 자동 selection에 충분하지 않습니다. ADR에 `id`, `status`, `scope`, `applies_to`, `topics`, `supersedes` 같은 lightweight metadata를 붙일 수 있습니다.

Resolver는 task semantics, affected path, domain ownership, dependency, ADR metadata를 조합해 관련 지식을 찾을 수 있습니다.

### Convention, Skill, Canonical Code를 분리하기

Convention은 규칙입니다.

> Public REST resource는 kebab-case를 사용한다.

Skill은 절차입니다.

> Contract 확인, owning domain 식별, model 생성, authorization 구현, contract 갱신, test 추가, validation 실행.

Task에만 필요한 procedural knowledge는 on-demand로 로드하는 것이 적절합니다.

또한 canonical code는 중요한 context source입니다. 잘 선택된 실제 구현 하나가 structure, naming, dependency, error handling, transaction boundary, testing style을 여러 문단의 문서보다 구체적으로 전달할 수 있습니다.

### 점진적인 Migration

1. **Always-On Context 축소:** instruction을 always required, task-specific, machine-verifiable, obsolete/duplicated로 분류합니다.
2. **Knowledge Externalization:** 상세 architecture, ADR, convention, skill, example을 discoverable한 위치로 이동합니다.
3. **Executable Enforcement:** 적절한 규칙을 lint, architecture test, schema validation, type constraint, CI로 옮깁니다.
4. **Simple Context Resolution:** path, ownership, task type, dependency graph, ADR metadata 같은 deterministic signal부터 사용합니다.
5. **Retrieval 고도화:** 측정 결과 필요할 때 lexical, semantic, embedding, repository map, dependency-aware, hybrid retrieval을 도입합니다.

### Context System 측정

Context가 infrastructure라면 다음을 측정해야 합니다.

- **Context Precision:** 가져온 정보 중 실제 관련 있는 비율
- **Context Recall:** 필요한 ADR과 file을 빠뜨리지 않았는가
- **Context Size:** 주입한 token 수
- **First-Pass Success:** 첫 구현이 repair 없이 validation을 통과했는가
- **Architecture Violations:** 알려진 constraint를 위반했는가
- **Human Correction Rate:** convention 문제를 사람이 얼마나 수정했는가

과거 PR을 evaluation dataset으로 삼아 large static `AGENTS.md`, layered context, task-specific retrieval을 비교할 수 있습니다.

### 결론

목표 구조는 다음과 같습니다.

**Minimal Global Context + Task-Based Context Retrieval + Canonical Examples + Executable Guardrails**

Hierarchy는 organization과 scope를, retrieval은 relevance를, executable check는 enforcement를 해결합니다.

Agent가 매 Task마다 전체 engineering knowledge base를 이해할 필요는 없습니다. 현재 문제를 해결하는 데 필요한 **최소한의 충분한 context**를 받으면 됩니다.

`AGENTS.md`는 여전히 중요합니다. 다만 지식 저장소 자체가 아니라, Agent가 필요한 순간에 올바른 지식을 찾게 하는 **Context Router**가 되어야 합니다.

## References

1. [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents? (2026)](https://arxiv.org/abs/2602.11988)
2. [Configuration Smells in AGENTS.md Files: Common Mistakes in Configuring Coding Agents (2026)](https://arxiv.org/abs/2606.15828)
3. [Agent Retrieval Bench: Evaluating Repository Context Retrieval for Coding Agents (2026)](https://arxiv.org/abs/2607.24882)
