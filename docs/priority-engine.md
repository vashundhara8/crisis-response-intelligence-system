# Emergency Priority Engine

## Overview
The **Emergency Priority Engine** computes dynamic priority ratings for simultaneous incidents using an interpretable, multi-factor weighting model.

## Demonstration Weights & Formula

$$\text{Priority Score} = (\text{Severity} \times w_s) + (\text{Impact} \times w_i) + (\text{Urgency} \times w_u) + (\text{Vulnerability} \times w_v) + (\text{Accessibility} \times w_a)$$

### Default Demonstration Weights:
- **Severity ($w_s = 0.30$)**: Physical hazard intensity and danger.
- **Impact ($w_i = 0.25$)**: Scale of affected population and area.
- **Urgency ($w_u = 0.20$)**: Immediate time-criticality to save life.
- **Vulnerability ($w_v = 0.15$)**: Special susceptibility (pediatric, geriatric, critical infrastructure).
- **Accessibility ($w_a = 0.10$)**: Ingress difficulty and route feasibility.

$$\sum weights = 0.30 + 0.25 + 0.20 + 0.15 + 0.10 = 1.00$$

## Priority Classification Tiers

| Score Range | Priority Level | Tactical Action | Color Indicator |
|---|---|---|---|
| **80.0 – 100.0** | **CRITICAL** | Immediate response dispatch; priority route clearance | Red (`#d92d20`) |
| **60.0 – 79.9** | **HIGH** | Priority response within standard dispatch window | Orange (`#f79009`) |
| **40.0 – 59.9** | **MODERATE** | Monitored queued dispatch | Blue (`#3B82F6`) |
| **0.0 – 39.9** | **LOW** | Routine / secondary assessment | Slate (`#64748b`) |

## Explainability Generation
For every score, the backend generates:
1. Individual factor contribution values ($V \times W$).
2. Relative factor ranking to identify primary and secondary drivers.
3. Natural-language operational rationale for command briefings.

> **Academic Disclaimer**: These demonstration weights are illustrative parameters for decision-support evaluation and do not represent validated government standards.
