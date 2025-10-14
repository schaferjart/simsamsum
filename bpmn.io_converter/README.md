# Simsam ⇄ BPMN Converter 

Python script that converts between Z1MZ4MZ00M JSON format and BPMN 2.0 XML. It supports both directions and uses a simple folder convention for inputs/outputs.

## Version 0.1 (2025-10-14)
Idea: Use bpmn.io interface for GUI substitute - as it allows for manual addition of elements. The current state allows fucntional conversion between both applications, so technically the aim is achieved. Remaining bugs include loss of values and imperfect reintegration of layout and volume calculation. 

## Folder conventions

- Input JSON (from Z1M) goes in: `fromZ1M/`
- Output BPMN (to BPMN) goes in: `toBPMN/`
- Input BPMN (from BPMN) goes in: `fromBPMN/`
- Output JSON (to Z1M) goes in: `toZ1M/`

These defaults can be overridden via CLI flags (see below).

## Requirements

- Python 3.8+ (script uses only the Python standard library)

## Files of interest

- `simsam_bpmn_converter3.py` — the converter script
- `fromZ1M/` — default location for source JSON when converting to BPMN
  - `elements.json`
  - `connections.json`
  - `variables.json` (optional)
  - `default.json` (optional layout positions)
- `fromBPMN/` — default location for source BPMN when converting to JSON
  - `simsam_fixed.bpmn`

## Quick start

### JSON → BPMN (default)

- Reads JSON from `fromZ1M/`
- Writes BPMN to `toBPMN/simsam_fixed.bpmn`

```bash
python3 simsam_bpmn_converter3.py
```

Open the result in the BPMN viewer:
- https://demo.bpmn.io/

Notes:
- The script embeds BPMN DI (diagram information). If `fromZ1M/default.json` contains coordinates, those are used; otherwise, a simple auto-layout grid is generated.

### BPMN → JSON (reverse)

- Reads BPMN from `fromBPMN/simsam_fixed.bpmn`
- Writes JSON to `toZ1M/` as:
  - `elements.json`
  - `connections.json`
  - `variables.json` (currently an empty object `{}` by default)
  - `layout.json` (extracted from BPMN DI if present)

```bash
python3 simsam_bpmn_converter3.py --reverse
```

## CLI options

```
--reverse                 Run BPMN -> JSON (default is JSON -> BPMN)
--elements PATH           Path to elements.json (default: fromZ1M/elements.json)
--connections PATH        Path to connections.json (default: fromZ1M/connections.json)
--variables PATH          Path to variables.json (default: fromZ1M/variables.json)
--layout PATH             Path to default.json (layout) (default: fromZ1M/default.json)
--out-bpmn PATH           Output BPMN file (default: toBPMN/simsam_fixed.bpmn)
--bpmn PATH               Input BPMN for reverse (default: fromBPMN/simsam_fixed.bpmn)
--out-elements PATH       Output elements.json (default: toZ1M/elements.json)
--out-connections PATH    Output connections.json (default: toZ1M/connections.json)
--out-variables PATH      Output variables.json (default: toZ1M/variables.json)
--out-layout PATH         Output layout.json (default: toZ1M/layout.json)
```

## Mappings

The converter maps Z1M element types/subtypes to BPMN element types.

- Type mapping:
  - Resource → startEvent
  - Action → task
  - Decision → exclusiveGateway
  - State → endEvent

- Subtype mapping overrides (examples):
  - Form Incoming → receiveTask
  - Mail Outgoing → sendTask
  - SMS Outgoing → sendTask
  - Call Outgoing → serviceTask
  - Call Incoming → receiveTask
  - Message Outgoing → sendTask
  - Message Incoming → receiveTask
  - Manual Form Fillout → userTask
  - Manual Account Generation → userTask
  - Manual Form Update → userTask
  - Videocall → userTask
  - Video Incoming → receiveTask
  - Fundraising → userTask

If a subtype is present in this table, it wins; otherwise the generic type mapping applies.

## Round-trip behavior and schemas

- Forward (JSON → BPMN)
  - Writes `simsam:properties` under `extensionElements` for any extra fields present on elements, so the data can be round-tripped.
  - Adds BPMN DI (shapes/edges) so viewers like bpmn.io can render the diagram without errors.

- Reverse (BPMN → JSON)
  - Always includes the full set of expected fields for each record, filling unknowns with `null`.
  - Elements schema includes:
    - `id`, `name`, `incomingNumber`, `variable`, `type`, `subType`, `aOR`, `execution`, `account`, `platform`, `monitoring`, `monitoredData`, `description`, `avgCostTime`, `avgCost`, `effectiveCost`, `lastUpdate`, `nextUpdate`, `kPI`, `scheduleStart`, `scheduleEnd`, `frequency\r`
  - Connections schema includes:
    - `id`, `fromId`, `toId`, `probability`, `time`, `condition`, `execution`, `AOR`, `type`, `description\r`
  - Probability extraction: if a sequenceFlow has a condition like `${Math.random() <= 0.7}`, `probability` is set to `0.7`. Otherwise, the original condition text is copied to `condition`.
  - Layout: if BPMN DI has shapes with `dc:Bounds`, a simple `layout.json` with `{ nodes: [{ id, x, y }, ...] }` is written.

## Troubleshooting

- "no diagram to display" in bpmn.io
  - The script writes a `<bpmndi:BPMNDiagram>` with `<BPMNShape>` and `<BPMNEdge>` for all elements and connections. If you still see this, ensure you opened the BPMN generated in `toBPMN/simsam_fixed.bpmn`.
- Missing or extra elements when reversing
  - The reverse converter reads standard BPMN tags: `startEvent`, `endEvent`, `exclusiveGateway`, `task`, `userTask`, `serviceTask`, `sendTask`, `receiveTask`. Additional BPMN artifacts (e.g., text annotations) are not mapped to JSON rows.
- Subtype fidelity on reverse
  - If a subtype was stored in `simsam:properties`, it’ll be restored. Otherwise a generic type is used.

## Customization

- Extend `type_mapping` or `subtype_mapping` in `simsam_bpmn_converter3.py` to cover more specific behaviors.
- Update the schemas (`element_schema`, `connection_schema`) if your JSON contracts change—reverse conversion will pad to the new shape automatically.


