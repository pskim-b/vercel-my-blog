---
title: "Incident Recap: Single Target Group과 Blue/Green Deployment"
date: "2026-08-15"
category: "note"
label:
  - "ai-generated"
---

## 1. 전체 요약

본 이슈는 **Target Group, Availability Zone, Blue/Green Deployment 개념이 혼재된 구조에서 발생한 트래픽 라우팅 오해**로 인해 DR 상황에서 failover가 동작하지 않은 사례이다.

핵심 원인은 다음 두 가지였다.

- Weighted Target Group을 DR 메커니즘으로 오인한 설계
- Target Group이 무엇을 의미하는지 불명확한 구조

## 2. 배경

기존 구조는 ALB를 기준으로 AZ별 EKS 클러스터에 Target Group을 분리한 형태였다.

```text
ALB
├── TG-A → EKS Cluster A / AZ-A
└── TG-C → EKS Cluster C / AZ-C
```

초기에는 트래픽이 다음과 같이 분산되었다.

```text
TG-A : 50
TG-C : 50
```

이후 ALB listener의 weighted routing을 변경해 단일 경로처럼 사용했다.

```text
TG-A : 100
TG-C : 0
```

결과적으로 실제 production traffic은 TG-A 단일 경로에 종속되었다.

## 3. 문제 현상

DR 테스트 중 AZ-A 장애가 발생했을 때의 상태는 다음과 같았다.

```text
TG-A : 100 → unhealthy
TG-C : 0   → healthy
```

그 결과:

- 자동 failover가 동작하지 않았다.
- 서비스 단절이 발생했다.
- TG-C는 정상이었지만 트래픽을 받지 못했다.

## 4. 문제 원인

핵심 원인은 다음과 같다.

- Weighted Target Group은 **failover 메커니즘이 아니다.**
- ALB는 unhealthy Target Group의 weight를 다른 Target Group으로 자동 재분배하지 않는다.
- TG-A와 TG-C가 AZ 또는 cluster를 의미하는 구조였다.
- Blue/Green이라는 naming이 실제 deployment semantics를 왜곡했다.

구조적으로는 다음과 같은 Active/Standby 형태였다.

```text
TG-A = Active path (AZ-A)
TG-C = Standby (AZ-C)
```

하지만 ALB는 이 구성을 Active/Standby로 해석하지 않는다.

## 5. 상세 분석

### 5.1 ALB Routing Model

ALB는 두 단계로 라우팅한다.

```text
1. Listener Rule → Target Group 선택
2. Target Group → Target 선택 (health check 기반)
```

즉 health check를 통한 정상 target 선택은 선택된 Target Group 내부에서 일어난다. Weighted Target Group 간 자동 전환과는 다른 문제다.

### 5.2 Weighted Target Group의 한계

Weighted routing은 트래픽 분배 메커니즘이다.

```text
TG-A weight=100 (unhealthy)
TG-C weight=0   (healthy)
```

이 경우에도 ALB가 TG-C로 자동 failover하지는 않는다. Weight는 availability가 아니라 traffic distribution 정책이다.

### 5.3 구조적 문제

현재 Target Group은 다음과 같이 해석되고 있었다.

```text
TG-A = AZ-A
TG-C = AZ-C
```

이 구조에는 다음 문제가 있었다.

- AZ를 Target Group으로 표현했다.
- Blue/Green naming과 실제 의미가 일치하지 않았다.
- production path가 단일 Target Group에 고정되었다.

### 5.4 DR 실패 메커니즘

```text
Client → ALB → TG-A (100%)
                    ↓
                AZ-A down

TG-C (0%) → healthy but unreachable
```

가용한 capacity는 존재했지만 그 capacity로 이어지는 routing path가 없었다.

## 6. 해결 방안

### 6.1 Target Group 의미 재정의

Target Group은 AZ가 아니라 **logical service boundary**로 정의해야 한다.

```text
TG-Service
├── AZ-A targets
└── AZ-C targets
```

### 6.2 Single Target Group 구조

안정적인 기본 구조는 하나의 Target Group에 여러 AZ의 target을 포함하는 것이다.

```text
ALB
└── TG-Service
    ├── AZ-A targets
    └── AZ-C targets
```

효과:

- AZ 장애가 곧 Target Group 장애로 전이되지 않는다.
- ALB가 Target Group 내부에서 healthy target을 선택한다.
- 별도의 Target Group 간 failover 없이 Multi-AZ 가용성을 확보할 수 있다.

### 6.3 Blue/Green의 올바른 분리

Blue/Green은 AZ 구조가 아니라 **deployment strategy**다.

```text
Blue  = current production version
Green = new version
```

올바른 조건은 다음과 같다.

- Blue와 Green 모두 Multi-AZ로 구성한다.
- 두 환경이 동일한 failure domain을 포함한다.
- traffic shift는 deployment 단계에서 수행한다.

### 6.4 ALB 기반 Blue/Green

```text
ALB
├── TG-Blue  (AZ-A + AZ-C)
└── TG-Green (AZ-A + AZ-C)
```

배포 과정에서 트래픽을 Blue 100%에서 Green 100%로 전환한다.

### 6.5 Weight 사용 기준

Weight는 다음 목적으로 사용한다.

- deployment traffic shifting
- canary release

다음 목적으로는 사용하지 않는다.

- DR failover
- AZ redundancy 대체

## 7. 결론

본 이슈의 본질은 단순한 기술적 장애가 아니라 **아키텍처 의미 모델의 붕괴**였다.

핵심 교훈은 다음과 같다.

- Target Group ≠ Availability Zone
- Weight ≠ Failover mechanism
- Blue/Green ≠ AZ 분리 구조

아키텍처는 다음 세 가지 축으로 분리해야 한다.

```text
1. Availability: Multi-AZ
2. Traffic Topology: Target Group
3. Deployment Strategy: Blue/Green
```

각 요소는 독립적으로 설계되어야 한다.

## 핵심 질문

설계할 때 반드시 다음을 명확히 해야 한다.

> 이 Target Group은 AZ인가, Service인가, Deployment인가?

이 정의가 불명확하면 routing, deployment, failover가 뒤섞여 같은 문제로 수렴한다.
