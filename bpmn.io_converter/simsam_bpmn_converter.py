#!/usr/bin/env python3
"""
Fixed Simsam to BPMN Converter
Usage: python3 simsam_bpmn_converter3.py

Conventions (folders):
- Read Simsam JSON inputs from:   fromZ1M/
- Write generated BPMN XML to:    toBPMN/
- (Future) Read BPMN XML from:    fromBPMN/
- (Future) Write generated JSON to: toZ1M/
"""

import json
import re
import math
import os
import sys
import argparse
import xml.etree.ElementTree as ET

class SimsamToBPMNFixed:
    """Fixed converter that handles XML parsing issues robustly"""

    def __init__(self):
        self.type_mapping = {
            "Resource": "startEvent",
            "Action": "task", 
            "Decision": "exclusiveGateway",
            "State": "endEvent"
        }

        self.subtype_mapping = {
            "Form Incoming": "receiveTask",
            "Mail Outgoing": "sendTask", 
            "SMS Outgoing": "sendTask",
            "Call Outgoing": "serviceTask",
            "Call Incoming": "receiveTask",
            "Message Outgoing": "sendTask",
            "Message Incoming": "receiveTask",
            "Manual Form Fillout": "userTask",
            "Manual Account Generation": "userTask",
            "Manual Form Update": "userTask",
            "Videocall": "userTask",
            "Video Incoming": "receiveTask",
            "Fundraising": "userTask",
        }

        # Expected schemas for round-trip completeness
        self.element_schema = [
            'id', 'name', 'incomingNumber', 'variable', 'type', 'subType', 'aOR',
            'execution', 'account', 'platform', 'monitoring', 'monitoredData',
            'description', 'avgCostTime', 'avgCost', 'effectiveCost', 'lastUpdate',
            'nextUpdate', 'kPI', 'scheduleStart', 'scheduleEnd', 'frequency\r'
        ]
        self.connection_schema = [
            'id', 'fromId', 'toId', 'probability', 'time', 'condition',
            'execution', 'AOR', 'type', 'description\r'
        ]

    def _layout_map(self, layout):
        """Extract a simple id -> {x,y} map from various layout JSON shapes"""
        lm = {}
        if not isinstance(layout, dict):
            return lm

        nodes = layout.get('nodes') or layout.get('elements') or layout.get('items')
        if isinstance(nodes, list):
            for n in nodes:
                try:
                    eid = n.get('id') or n.get('key') or n.get('elementId')
                    if not eid:
                        continue
                    if 'x' in n and 'y' in n:
                        lm[str(eid)] = {'x': float(n['x']), 'y': float(n['y'])}
                    elif isinstance(n.get('position'), dict) and {'x', 'y'} <= set(n['position'].keys()):
                        lm[str(eid)] = {
                            'x': float(n['position']['x']),
                            'y': float(n['position']['y'])
                        }
                    elif isinstance(n.get('bounds'), dict) and {'x', 'y'} <= set(n['bounds'].keys()):
                        lm[str(eid)] = {
                            'x': float(n['bounds']['x']),
                            'y': float(n['bounds']['y'])
                        }
                except Exception:
                    # ignore malformed node entries
                    pass

        if not lm:
            # flat dict: { id: { x, y } }
            for k, v in layout.items():
                try:
                    if isinstance(v, dict) and ('x' in v and 'y' in v):
                        lm[str(k)] = {'x': float(v['x']), 'y': float(v['y'])}
                    elif isinstance(v, dict) and isinstance(v.get('position'), dict):
                        p = v['position']
                        if 'x' in p and 'y' in p:
                            lm[str(k)] = {'x': float(p['x']), 'y': float(p['y'])}
                except Exception:
                    pass
        return lm

    def _build_di(self, element_infos, connection_infos, layout):
        """Build BPMN DI so the diagram renders in bpmn.io"""
        size_map = {
            'startEvent': (36, 36),
            'endEvent': (36, 36),
            'exclusiveGateway': (50, 50),
            'task': (100, 80),
            'userTask': (100, 80),
            'serviceTask': (100, 80),
            'sendTask': (100, 80),
            'receiveTask': (100, 80),
        }

        layout_map = self._layout_map(layout or {})
        n = len(element_infos)

        # fallback grid
        cols = max(1, math.ceil(math.sqrt(max(1, n))))
        h_gap, v_gap = 200, 150
        x0, y0 = 100, 100

        # assign bounds
        bounds = {}
        for idx, info in enumerate(element_infos):
            eid = info['id']
            bpmn_type = info['bpmn_type']
            w, h = size_map.get(bpmn_type, (100, 80))

            if eid in layout_map:
                x = layout_map[eid]['x']
                y = layout_map[eid]['y']
            else:
                col = idx % cols
                row = idx // cols
                x = x0 + col * h_gap
                y = y0 + row * v_gap

            bounds[eid] = {'x': float(x), 'y': float(y), 'w': float(w), 'h': float(h)}

        di_lines = []
        di_lines.append('  <bpmndi:BPMNDiagram id="BPMNDiagram_1">')
        di_lines.append('    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_simsam">')

        # shapes
        for eid, b in bounds.items():
            di_lines.append(f'      <bpmndi:BPMNShape id="DI_{eid}" bpmnElement="{eid}">')
            di_lines.append(f'        <dc:Bounds x="{b["x"]:.1f}" y="{b["y"]:.1f}" width="{b["w"]:.1f}" height="{b["h"]:.1f}" />')
            di_lines.append('      </bpmndi:BPMNShape>')

        # edges
        for conn in connection_infos:
            cid = conn['id']
            s = bounds.get(conn['source'])
            t = bounds.get(conn['target'])
            if not s or not t:
                continue
            sx = s['x'] + s['w'] / 2.0
            sy = s['y'] + s['h'] / 2.0
            tx = t['x'] + t['w'] / 2.0
            ty = t['y'] + t['h'] / 2.0

            di_lines.append(f'      <bpmndi:BPMNEdge id="DI_{cid}" bpmnElement="{cid}">')
            di_lines.append(f'        <di:waypoint x="{sx:.1f}" y="{sy:.1f}" />')
            di_lines.append(f'        <di:waypoint x="{tx:.1f}" y="{ty:.1f}" />')
            di_lines.append('      </bpmndi:BPMNEdge>')

        di_lines.append('    </bpmndi:BPMNPlane>')
        di_lines.append('  </bpmndi:BPMNDiagram>')
        return di_lines

    def escape_xml_thoroughly(self, text):
        """Thoroughly escape XML special characters"""
        if not text:
            return ""

        text = str(text)

        replacements = [
            ('&', '&amp;'),  # Must be first
            ('<', '&lt;'),
            ('>', '&gt;'),
            ('"', '&quot;'),
            ("'", '&apos;'),
            ('\r\n', ' '),
            ('\n', ' '),
            ('\r', ' '),
            ('\t', ' '),
        ]

        for old, new in replacements:
            text = text.replace(old, new)

        # Remove control characters
        text = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]', '', text)

        return text.strip()

    def make_xml_safe_id(self, id_string):
        """Make ID safe for XML"""
        if not id_string:
            return "element_1"

        safe_id = str(id_string).strip()
        safe_id = re.sub(r'[^a-zA-Z0-9_.-]', '_', safe_id)

        if safe_id and not (safe_id[0].isalpha() or safe_id[0] == '_'):
            safe_id = 'el_' + safe_id

        return safe_id or 'element_1'

    def _parse_simsam_properties(self, xml_element, ns):
        """Read back simsam extension properties into a dict"""
        props = {}
        if xml_element is None:
            return props
        ext = xml_element.find('bpmn:extensionElements', ns)
        if ext is None:
            return props
        props_el = ext.find('simsam:properties', ns)
        if props_el is None:
            return props
        for p in props_el.findall('simsam:property', ns):
            name = p.get('name')
            value = p.get('value')
            if name is None:
                continue
            # try restore types (int/float/bool/null)
            if isinstance(value, str):
                v = value.strip()
                if v.lower() == 'true':
                    props[name] = True
                elif v.lower() == 'false':
                    props[name] = False
                elif v.lower() in ('none', 'null'):
                    props[name] = None
                else:
                    try:
                        if '.' in v:
                            props[name] = float(v)
                        else:
                            props[name] = int(v)
                    except Exception:
                        props[name] = value
            else:
                props[name] = value
        return props

    def convert(self, elements_file='fromZ1M/elements.json', connections_file='fromZ1M/connections.json', 
                variables_file='fromZ1M/variables.json', layout_file='fromZ1M/default.json', 
                output_file='toBPMN/simsam_fixed.bpmn'):
        """Convert Simsam JSON to BPMN with robust error handling"""

        print(f"Converting {elements_file} + {connections_file} -> {output_file}")

        # Load data
        with open(elements_file, 'r', encoding='utf-8') as f:
            elements = json.load(f)
        with open(connections_file, 'r', encoding='utf-8') as f:
            connections = json.load(f)

        try:
            with open(variables_file, 'r', encoding='utf-8') as f:
                variables = json.load(f)
        except:
            variables = {}

        try:
            with open(layout_file, 'r', encoding='utf-8') as f:
                layout = json.load(f)
        except:
            layout = {}

        # Ensure output folder exists
        out_dir = os.path.dirname(output_file)
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)

        # Create XML
        xml_lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"',
            '  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"',
            '  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"',
            '  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"',
            '  xmlns:simsam="http://simsam.process/extension"',
            '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
            '  id="Definitions_simsam"',
            '  targetNamespace="http://bpmn.io/schema/bpmn">',
            '',
            '  <process id="Process_simsam" isExecutable="false">'
        ]

        # Collect info for DI
        element_infos = []

        # Process elements
        for element in elements:
            element_type = element.get("type", "Action")
            subtype = element.get("subType", "")

            if subtype in self.subtype_mapping:
                bpmn_type = self.subtype_mapping[subtype]
            else:
                bpmn_type = self.type_mapping.get(element_type, "task")

            element_id = self.make_xml_safe_id(element["id"])
            element_name = self.escape_xml_thoroughly(element.get("name", ""))

            xml_lines.append(f'    <{bpmn_type} id="{element_id}" name="{element_name}">')

            # Add properties
            skip_props = {"id", "name", "type"}
            custom_props = {k: v for k, v in element.items() 
                           if k not in skip_props and v is not None and str(v).strip()}

            if custom_props:
                xml_lines.extend([
                    '      <extensionElements>',
                    '        <simsam:properties>'
                ])
                for key, value in custom_props.items():
                    safe_key = self.make_xml_safe_id(str(key))
                    safe_value = self.escape_xml_thoroughly(str(value))
                    if safe_value:
                        xml_lines.append(f'          <simsam:property name="{safe_key}" value="{safe_value}" />')
                xml_lines.extend([
                    '        </simsam:properties>',
                    '      </extensionElements>'
                ])

            xml_lines.append(f'    </{bpmn_type}>')
            xml_lines.append('')

            # collect for DI
            element_infos.append({'id': element_id, 'bpmn_type': bpmn_type})

        # Collect connections for DI
        connection_infos = []

        # Process connections
        for connection in connections:
            conn_id = self.make_xml_safe_id(connection["id"].replace('->', '_to_'))
            source_ref = self.make_xml_safe_id(connection["fromId"])
            target_ref = self.make_xml_safe_id(connection["toId"])

            xml_lines.append(f'    <sequenceFlow id="{conn_id}" sourceRef="{source_ref}" targetRef="{target_ref}">')

            # Handle probability
            prob = connection.get("probability")
            if prob is not None and str(prob).strip() not in ["", "None", "1"]:
                xml_lines.extend([
                    '      <conditionExpression xsi:type="tFormalExpression">',
                    f'        ${{Math.random() &lt;= {prob}}}',
                    '      </conditionExpression>'
                ])

            xml_lines.append('    </sequenceFlow>')
            xml_lines.append('')

            connection_infos.append({'id': conn_id, 'source': source_ref, 'target': target_ref})

        xml_lines.extend([
            '  </process>'
        ])

        # Add BPMN DI so bpmn.io can display the diagram
        xml_lines.extend(self._build_di(element_infos, connection_infos, layout))

        xml_lines.append('</definitions>')

        # Save file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(xml_lines))

        print(f"✅ Successfully created {output_file}")
        print(f"   Elements: {len(elements)}")
        print(f"   Connections: {len(connections)}")
        print(f"\n🚀 Ready for bpmn.io: https://demo.bpmn.io/")

        return output_file

    def convert_bpmn_to_json(
        self,
        bpmn_file='fromBPMN/simsam_fixed.bpmn',
        out_elements='toZ1M/elements.json',
        out_connections='toZ1M/connections.json',
        out_variables='toZ1M/variables.json',
        out_layout='toZ1M/layout.json'
    ):
        """Convert BPMN XML back to Simsam-like JSON files.

        - Reads: fromBPMN/simsam_fixed.bpmn
        - Writes: toZ1M/elements.json, toZ1M/connections.json, toZ1M/variables.json, toZ1M/layout.json
        """

        print(f"Converting {bpmn_file} -> {out_elements}, {out_connections}, {out_layout}")

        ns = {
            'bpmn': 'http://www.omg.org/spec/BPMN/20100524/MODEL',
            'bpmndi': 'http://www.omg.org/spec/BPMN/20100524/DI',
            'dc': 'http://www.omg.org/spec/DD/20100524/DC',
            'di': 'http://www.omg.org/spec/DD/20100524/DI',
            'simsam': 'http://simsam.process/extension',
            'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        }

        tree = ET.parse(bpmn_file)
        root = tree.getroot()

        process = root.find('bpmn:process', ns)
        if process is None:
            raise RuntimeError('No <bpmn:process> found in BPMN file')

        # Reverse mapping from BPMN element to Simsam type
        bpmn_to_type = {
            'startEvent': 'Resource',
            'endEvent': 'State',
            'exclusiveGateway': 'Decision',
            'task': 'Action',
            'userTask': 'Action',
            'serviceTask': 'Action',
            'sendTask': 'Action',
            'receiveTask': 'Action',
        }

        # Elements (collect, then pad schema)
        elements = []
        element_tags = ['startEvent', 'endEvent', 'exclusiveGateway', 'task', 'userTask', 'serviceTask', 'sendTask', 'receiveTask']
        for tag in element_tags:
            for el in process.findall(f'bpmn:{tag}', ns):
                eid = el.get('id') or ''
                name = el.get('name') or ''
                simsam_type = bpmn_to_type.get(tag, 'Action')
                props = self._parse_simsam_properties(el, ns)

                # Base element record
                rec = {
                    'id': eid,
                    'name': name,
                    'type': simsam_type,
                }
                # Merge extension properties back (may include subType and other metadata)
                for k, v in props.items():
                    # Avoid clobbering the base id/name/type accidentally
                    if k in ('id', 'name', 'type'):
                        continue
                    rec[k] = v

                # Ensure all expected element fields exist
                for fld in self.element_schema:
                    if fld not in rec:
                        rec[fld] = None

                elements.append(rec)

        # Connections (collect, then pad schema)
        connections = []
        for sf in process.findall('bpmn:sequenceFlow', ns):
            cid = sf.get('id') or ''
            src = sf.get('sourceRef') or ''
            tgt = sf.get('targetRef') or ''
            conn = {
                'id': cid,
                'fromId': src,
                'toId': tgt,
                'probability': None,
                'time': None,
                'condition': None,
                'execution': None,
                'AOR': None,
                'type': None,
                'description\r': None,
            }
            cond = sf.find('bpmn:conditionExpression', ns)
            if cond is not None and cond.text:
                txt = cond.text.strip()
                # Expect pattern like ${Math.random() <= 0.7}
                m = re.search(r"<=\s*([0-9]*\.?[0-9]+)", txt)
                if m:
                    try:
                        conn['probability'] = float(m.group(1))
                    except Exception:
                        pass
                else:
                    # Store raw condition if not a probability threshold
                    conn['condition'] = txt
            connections.append(conn)

        # Layout from BPMN DI
        layout_nodes = []
        plane = root.find('bpmndi:BPMNDiagram/bpmndi:BPMNPlane', ns)
        if plane is not None:
            for sh in plane.findall('bpmndi:BPMNShape', ns):
                be = sh.get('bpmnElement')
                b = sh.find('dc:Bounds', ns)
                if be and b is not None:
                    try:
                        x = float(b.get('x'))
                        y = float(b.get('y'))
                        layout_nodes.append({'id': be, 'x': x, 'y': y})
                    except Exception:
                        continue

        layout = {'nodes': layout_nodes} if layout_nodes else {}

        # Ensure output directory exists
        for p in [out_elements, out_connections, out_variables, out_layout]:
            d = os.path.dirname(p)
            if d:
                os.makedirs(d, exist_ok=True)

        # Write files
        with open(out_elements, 'w', encoding='utf-8') as f:
            json.dump(elements, f, indent=2, ensure_ascii=False)
        with open(out_connections, 'w', encoding='utf-8') as f:
            json.dump(connections, f, indent=2, ensure_ascii=False)
        with open(out_variables, 'w', encoding='utf-8') as f:
            json.dump({}, f, indent=2, ensure_ascii=False)
        with open(out_layout, 'w', encoding='utf-8') as f:
            json.dump(layout, f, indent=2, ensure_ascii=False)

        print(f"✅ Wrote: {out_elements}, {out_connections}, {out_variables}, {out_layout}")
        print(f"   Elements: {len(elements)} | Connections: {len(connections)} | Layout nodes: {len(layout_nodes)}")
        return out_elements, out_connections, out_variables, out_layout


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Simsam <-> BPMN converter")
    parser.add_argument('--reverse', action='store_true', default=False,
                        help='Run BPMN -> JSON (fromBPMN -> toZ1M). Default is JSON -> BPMN (fromZ1M -> toBPMN).')
    # Allow overriding files if needed
    parser.add_argument('--elements', default='fromZ1M/elements.json')
    parser.add_argument('--connections', default='fromZ1M/connections.json')
    parser.add_argument('--variables', default='fromZ1M/variables.json')
    parser.add_argument('--layout', default='fromZ1M/default.json')
    parser.add_argument('--out-bpmn', default='toBPMN/simsam_fixed.bpmn')
    parser.add_argument('--bpmn', default='fromBPMN/simsam_fixed.bpmn')
    parser.add_argument('--out-elements', default='toZ1M/elements.json')
    parser.add_argument('--out-connections', default='toZ1M/connections.json')
    parser.add_argument('--out-variables', default='toZ1M/variables.json')
    parser.add_argument('--out-layout', default='toZ1M/layout.json')
    args = parser.parse_args()

    converter = SimsamToBPMNFixed()
    if args.reverse:
        converter.convert_bpmn_to_json(
            bpmn_file=args.bpmn,
            out_elements=args.out_elements,
            out_connections=args.out_connections,
            out_variables=args.out_variables,
            out_layout=args.out_layout,
        )
    else:
        converter.convert(
            elements_file=args.elements,
            connections_file=args.connections,
            variables_file=args.variables,
            layout_file=args.layout,
            output_file=args.out_bpmn,
        )
