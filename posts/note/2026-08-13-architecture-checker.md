---
title: "Architecture Checker: 아키텍처 규칙을 실행 가능한 가드레일로 만들기"
date: "2026-08-13"
category: "note"
label:
  - "ai-generated"
---

# Architecture Checker

## 1. Architecture Checker란?

Architecture Checker는 코드의 **구조와 의존성이 정의된 Architecture Rule을 지키는지 정적으로 검증하는 도구**다.

일반적인 계층 구조를 예로 들면 다음과 같다.

```text
Controller → Application → Domain
             ↑
        Infrastructure
```

이 구조에서 다음과 같은 위반을 실행 가능한 규칙으로 만들 수 있다.

```text
Domain → Infrastructure          ❌
Domain → Framework               ❌
Controller → Repository Impl     ❌
Cross-domain internal access     ❌
Circular dependency              ❌
```

즉 ADR이나 Convention에 적혀 있던 다음 문장을:

> Domain layer must not depend on infrastructure.

CI에서 실제 빌드를 실패시키는 규칙으로 바꿀 수 있다.

Java의 대표적인 도구인 **ArchUnit**은 컴파일된 Java bytecode를 분석해 class, package, member dependency를 모델링하고 이를 일반 unit test처럼 검증한다.

## 2. Lint와 무엇이 다른가?

경계가 완전히 명확한 것은 아니다. 같은 규칙을 Lint와 Architecture Checker 양쪽에서 구현할 수 있는 경우도 있다. 실무에서는 검사 범위를 기준으로 구분하는 것이 유용하다.

| 구분 | Lint | Architecture Checker |
|---|---|---|
| 주요 관심 | 코드 품질, syntax, local rule | 시스템 구조, dependency |
| 분석 범위 | 파일, AST 중심 | Class, Module, Dependency Graph |
| 대표 규칙 | naming, unused code, forbidden API | layer, domain boundary, cycle |
| 대표 도구 | ESLint, Checkstyle | ArchUnit, dependency-cruiser |
| CI 사용 | 가능 | 가능 |

예를 들면 다음과 같다.

- Boolean 이름은 `is` 또는 `has`로 시작한다 → Lint
- Domain은 Infrastructure에 의존하면 안 된다 → Architecture Checker
- Payment domain은 Order의 internal package를 사용할 수 없다 → Architecture Checker

따라서 둘을 상위 개념인 **Executable Guardrail**로 묶어 생각하는 것이 편하다.

```text
Executable Guardrails
├─ Linter
├─ Architecture Checker
├─ Static Analyzer
├─ Schema Validator
└─ Policy Checker
```

## 3. 어떤 도구가 있는가?

### Java — ArchUnit

가장 대표적이고 성숙한 Architecture Testing 도구 중 하나다. 일반 JUnit 테스트처럼 Architecture Rule을 작성하며 다음을 지원한다.

- package/class dependency
- layered architecture
- onion architecture
- cyclic dependency
- annotation, interface, inheritance 규칙
- method, field 규칙
- custom predicates와 conditions

공식 사이트, User Guide, example repository도 잘 갖춰져 있어 **Java 프로젝트라면 우선 검토할 만한 선택지**다.

### JavaScript / TypeScript — dependency-cruiser

JS/TS 프로젝트의 module dependency를 분석하고 사용자 정의 dependency rule을 검사한다. Dependency graph 시각화도 지원한다.

```text
domain/** cannot depend on infrastructure/**
```

TypeScript에는 **TSArch**, **ArchUnitTS**처럼 ArchUnit 스타일의 architecture test library도 존재한다. 다만 Java의 ArchUnit과 비교하면 선택지가 분산되어 있고 생태계도 상대적으로 작다.

### .NET — ArchUnitNET

ArchUnit의 C#/.NET 계열 구현이다. C# bytecode를 분석해 class, member, interface, dependency 등을 검사하고 일반 test framework와 함께 사용할 수 있다.

`NetArchTest` 같은 대안도 있지만 신규 도입 시에는 각 도구의 최근 유지보수 상태를 별도로 확인하는 편이 좋다.

## 4. 어떤 규칙을 만들 수 있는가?

ArchUnit을 예로 들면 Architecture Rule은 단순한 package 검사에 한정되지 않는다.

### Package / Layer Dependency

```java
noClasses()
    .that().resideInAPackage("..domain..")
    .should().dependOnClassesThat()
    .resideInAPackage("..infrastructure..");
```

DDD 또는 Clean Architecture의 dependency direction을 검증하기 좋다.

```text
Domain ──────X──────> Infrastructure
```

### Layered Architecture

```java
layeredArchitecture()
    .consideringAllDependencies()
    .layer("Controller").definedBy("..controller..")
    .layer("Application").definedBy("..application..")
    .layer("Domain").definedBy("..domain..")
    .whereLayer("Domain")
    .mayOnlyBeAccessedByLayers("Application");
```

Architecture diagram의 dependency direction을 코드로 옮길 수 있다. ArchUnit은 layered architecture와 onion architecture 같은 대표 구조를 위한 predefined API도 제공한다.

### Annotation 기반 Rule

Architecture role을 package가 아니라 annotation으로 표시할 수도 있다.

```java
@DomainService
class PricingPolicy {
}
```

```java
classes()
    .that().areAnnotatedWith(DomainService.class)
    .should()
    .onlyDependOnClassesThat(...);
```

이를 통해 다음과 같은 Architecture Semantic을 표현할 수 있다.

```text
@DomainService
      ↓
Allowed Dependencies
      ↓
Domain Components only
```

### Interface / Inheritance 기반 Rule

예를 들어 Repository interface는 Domain에 존재해야 한다고 정의할 수 있다.

```java
classes()
    .that().areInterfaces()
    .and().haveSimpleNameEndingWith("Repository")
    .should()
    .resideInAPackage("..domain.repository..");
```

특정 interface의 구현체에 별도의 dependency rule을 적용하는 것도 가능하다.

### Framework Dependency 제한

Domain layer를 pure Java로 유지하려면 다음 규칙을 사용할 수 있다.

```java
noClasses()
    .that().resideInAPackage("..domain..")
    .should().dependOnClassesThat()
    .resideInAnyPackage("org.springframework..");
```

```text
Domain → Spring Framework ❌
```

### Method / Member Rule

Architecture Checker가 class dependency만 다루는 것은 아니다. 예를 들어 특정 역할의 method에 transaction annotation을 강제할 수도 있다.

```java
methods()
    .that().areDeclaredInClassesThat()
    .haveSimpleNameEndingWith("CommandHandler")
    .should()
    .beAnnotatedWith(Transactional.class);
```

### Circular Dependency

Module 또는 slice 사이의 cycle도 검출할 수 있다.

```text
Payment → Order
   ↑        ↓
   └ Shipping
```

이런 dependency cycle은 코드가 커질수록 사람이 발견하기 어렵기 때문에 자동화된 architecture check와 잘 맞는다. ArchUnit은 package/class dependency뿐 아니라 slice와 cyclic dependency 검사도 지원한다.

## 5. 어떤 Rule에 적합한가?

Architecture Checker는 **구조적으로 판정 가능한 Architecture Convention**에 특히 적합하다.

- Domain → Infrastructure 의존 금지
- Application → Infrastructure 구현체 의존 금지
- Bounded Context의 internal package 접근 금지
- Layer dependency 제한
- Framework dependency 제한
- Circular dependency 금지
- Repository 구현 위치
- Architecture stereotype 규칙

반면 business behavior는 Architecture Checker의 역할이 아니다.

> Completed Payment만 refund할 수 있다.

이 규칙은 Domain Test가 적절하다.

```text
Architecture / Structural Invariant
                ↓
       Architecture Checker

Business / Runtime Invariant
                ↓
               Test
```

## 6. 장점

Architecture Checker의 가장 큰 장점은 **Architecture Document를 Executable Documentation으로 바꿀 수 있다는 것**이다.

```text
ADR
 ↓
Architecture Rule
 ↓
CI
 ↓
Violation → Build Failure
```

특히 JUnit 같은 기존 test infrastructure를 그대로 활용하는 ArchUnit 방식은 개발자가 이해하기 쉽다.

```java
@Test
void domain_must_not_depend_on_infrastructure() {
    // ...
}
```

Test name 자체도 Architecture Documentation의 역할을 한다.

## 7. Skill로 만들 수 있는가?

가능성이 높다. 다만 프로젝트마다 Architecture Rule을 사람이 계속 직접 관리하면 maintenance cost가 커질 수 있다.

이를 줄이기 위해 재사용 가능한 `architecture-guardrail` Skill을 생각해볼 수 있다.

```text
Input
ADR / Convention / Architecture Decision
              ↓
Architecture Guardrail Skill
              ↓
1. 정적으로 검증 가능한 Rule인지 판단
2. 프로젝트 언어와 환경 파악
3. 적합한 checker 선택
4. 기존 rule 검색
5. Architecture Rule 생성
6. Positive / Negative test 작성
7. CI integration 확인
8. Documentation / ADR 연결
```

예를 들어 입력이 다음과 같다고 하자.

> Domain layer must not depend on Spring.

Skill은 프로젝트가 Java임을 확인하고 ArchUnit rule을 생성할 수 있다.

```java
noClasses()
    .that().resideInAPackage("..domain..")
    .should().dependOnClassesThat()
    .resideInAnyPackage("org.springframework..");
```

그리고 다음 메타데이터까지 함께 관리할 수 있다.

```text
Rule
Tests
Scope
Owner
Source ADR
Exceptions
CI command
```

이런 Skill을 두면 프로젝트에서는 **Architecture Policy를 정의하는 데 집중하고, 구체적인 checker 구현과 maintenance는 재사용 가능한 Skill에 위임**할 수 있다.

## 8. Agent / Context Resolver와의 연결

Architecture Checker는 Context Resolver와도 밀접하게 연결된다. 모든 Architecture Convention을 Agent Context에 넣을 필요가 없기 때문이다.

```text
Task
 ↓
Context Resolver
 ↓
Relevant ADR / Skill
 ↓
Agent Implementation
 ↓
Architecture Checker
 ↓
Violation
 ↓
Agent Repair
```

기계적으로 검증 가능한 Architecture Rule을 다음 위치에서 이동시킬 수 있다.

```text
Agent가 반드시 기억해야 하는 Context
                  ↓
Agent 결과를 검증하는 Executable Guardrail
```

이는 Agent Context를 줄이면서도 Architecture Compliance를 더 deterministic하게 만드는 방법이 될 수 있다.

## References

- [ArchUnit](https://www.archunit.org/)
- [ArchUnit User Guide](https://www.archunit.org/userguide/html/000_Index.html)
- [ArchUnit Examples](https://github.com/TNG/ArchUnit-Examples)
- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser)
- [ArchUnitNET](https://github.com/TNG/ArchUnitNET)
- [TSArch](https://github.com/ts-arch/ts-arch)
- [ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS)
