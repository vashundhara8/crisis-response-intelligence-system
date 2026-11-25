# Resource Allocation Engine

## Operational Matching Workflow

The **Resource Allocation Engine** pairs prioritized incidents with the most suitable emergency fleet units using a multi-criteria heuristic scoring algorithm.

```
Incoming Prioritized Incident
         │
         ▼
[1] Hazard Compatibility Filter (Ambulance / Rescue / Medical / Shelter)
         │
         ▼
[2] Fleet Availability Filter (Status == AVAILABLE)
         │
         ▼
[3] Geospatial Distance Calculation (Haversine Formula in km)
         │
         ▼
[4] Capacity Fit Evaluation (Units vs Affected Population)
         │
         ▼
[5] Ingress Accessibility Penalty Assessment
         │
         ▼
[6] Composite Suitability Ranking & Recommendation Response
```

## Compatibility Rules Matrix

| Incident Type | Compatible Primary Fleet Units |
|---|---|
| **Building Collapse** | Rescue Team, Fire and Rescue Unit, Ambulance, Medical Unit, Emergency Supply Unit |
| **Flash Flood** | Rescue Team, Fire and Rescue Unit, Shelter, Ambulance, Medical Unit, Emergency Supply Unit |
| **Road Accident** | Ambulance, Rescue Team, Fire and Rescue Unit, Medical Unit |
| **Industrial / Commercial Fire** | Fire and Rescue Unit, Rescue Team, Medical Unit, Ambulance, Emergency Supply Unit |
| **Medical Emergency** | Ambulance, Medical Unit, Emergency Supply Unit |
| **Chemical Leak** | Fire and Rescue Unit, Medical Unit, Rescue Team, Ambulance, Emergency Supply Unit |
| **Structural Threat** | Rescue Team, Fire and Rescue Unit, Shelter, Emergency Supply Unit |

## Suitability Scoring Function

$$\text{Suitability} = (S_{\text{distance}} \times 0.45) + (S_{\text{compat}} \times 0.30) + (S_{\text{capacity}} \times 0.15) + (S_{\text{avail}} \times 0.10)$$

Where:
- $S_{\text{distance}} = \max(0, 100 - ((\text{Distance}_{km} + \text{AccessibilityPenalty}_{km}) \times 4.0))$
- $S_{\text{compat}} = 100$ for primary compatible types, $20$ otherwise (requires manual coordinator override).
- $S_{\text{capacity}} = 100$ if unit capacity $\ge$ affected population, $75$ if $\ge 30\%$, $50$ otherwise.
- $S_{\text{avail}} = 100$ if `AVAILABLE` and unassigned, $0$ otherwise.

## Dispatch State Machine

```
Resource: [ AVAILABLE ]  ──────> [ DEPLOYED ] (or released back to [ AVAILABLE ])
                                     │
Incident: [ ACTIVE ] ──────────> [ RESOURCES_ASSIGNED ]
```
When an operator executes dispatch:
1. Resource availability is marked `DEPLOYED`.
2. Incident status is marked `RESOURCE_ALLOCATED`.
3. `ResourceAllocation` record is stored with exact distance and timestamp.
4. `IncidentStatusHistory` audit event is written.
