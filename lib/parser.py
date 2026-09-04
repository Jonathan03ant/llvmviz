import re
import os


def extract_label(line: str):
    """
    Extract the label content from a node definition line.
    Input:  'Node0x5bea79575b90 [shape=record,shape=Mrecord,label="{EntryToken|t0|{<d0>ch|<d1>glue}}"];'
    Output: '{EntryToken|t0|{<d0>ch|<d1>glue}}'
    """
    match = re.search(r'label="([^"]+)"', line)
    if match:
        return match.group(1)
    return ""


def extract_output_types(label: str):
    """
    Extract all output types from the label.
    Examples:
    "{EntryToken|t0|{<d0>ch|<d1>glue}}" → ["ch", "glue"]
    "{Register %8|t1|{<d0>i32}}" → ["i32"]
    "{{<s0>0|<s1>1}|add|t6|{<d0>i32}}" → ["i32"]
    """
    # Extract all <dN>type patterns from anywhere in the label
    output_types = re.findall(r'<d\d+>([^|}>]+)', label)
    return output_types if output_types else ["?"]


def parse_label(label: str):
    """
    Parse the label to extract opcode, node number, and output types.
    Examples:
    "{EntryToken|t0|{<d0>ch|<d1>glue}}" → ("EntryToken", "t0", ["ch", "glue"])
    "{Register %8|t1|{<d0>i32}}" → ("Register %8", "t1", ["i32"])
    "{{<s0>0|<s1>1}|add|t6|{<d0>i32}}" → ("add", "t6", ["i32"])
    """
    # Extract opcode and node number
    # Pattern 1: Simple node {Opcode|tN|{outputs}}
    match = re.match(r'\{([^{|]+)\|t(\d+)\|', label)
    if match:
        opcode = match.group(1)
        node_num = f"t{match.group(2)}"
        output_types = extract_output_types(label)
        return (opcode, node_num, output_types)

    # Pattern 2: Node with inputs {{inputs}|Opcode|tN|{outputs}}
    match = re.match(r'\{\{.*?\}\|([^|]+)\|t(\d+)\|', label)
    if match:
        opcode = match.group(1)
        node_num = f"t{match.group(2)}"
        output_types = extract_output_types(label)
        return (opcode, node_num, output_types)

    # Fallback
    return (label, "t?", ["?"])


def parse_dot(dot_file_path: str):
    """
        # Opens the .dot file
        # Parses the GraphViz DOT syntax
        # Extracts:
        #   - Nodes: {id, label (opcode), type, etc.}
        #   - Edges: {source, target, type}
    # Returns: JSON structure for React Flow
    """
    nodes = []
    edges = []

    with open(dot_file_path, "r") as f:
        for line in f:
            if '[shape=record' in line:
                # Node definition
                node_id = line.split()[0]                               # Node0x5bea79575b90
                label = extract_label(line)                             # label="{EntryToken|t0|{<d0>ch|<d1>glue}}"];
                opcode, node_num, output_types = parse_label(label)
                nodes.append({
                    "id": node_id,
                    "position": {"x": 0, "y": 0},
                    "data": {
                        "label": opcode,
                        "opcode": opcode,
                        "node_num": node_num,
                        "output_types": output_types  # Now an array!
                    }
                })
            elif '->' in line:
                # Edge definition
                parts = line.split('->')
                target_parts = parts[0].strip().split(':')
                source_parts = parts[1].split('[')[0].strip().split(':')

                target = target_parts[0]
                source = source_parts[0]
                source_port = source_parts[1] if len(source_parts) > 1 else None

                is_chain = 'color=blue' in line
                is_glue = 'color=red' in line
                edge_type = "glue" if is_glue else ("chain" if is_chain else "data")

                edges.append({
                    "id": f"{source}->{target}",
                    "source": source,
                    "target": target,
                    "source_port": source_port,
                    "type": edge_type
                })

    node_map = {node["id"]: node for node in nodes}

    for node in nodes:
        input_types = []
        incoming_edges = [e for e in edges if e["target"] == node["id"]]

        for edge in incoming_edges:
            source_node = node_map.get(edge["source"])
            if source_node:
                source_port = edge.get("source_port")
                output_types = source_node["data"]["output_types"]

                if source_port and source_port.startswith('d'):
                    port_num = re.search(r'd(\d+)', source_port)
                    if port_num:
                        port_index = int(port_num.group(1))
                        output_type = output_types[port_index] if port_index < len(output_types) else output_types[0]
                    else:
                        output_type = output_types[0]
                else:
                    output_type = output_types[0] if output_types else "?"

                input_types.append({
                    "type": output_type,
                    "edge_type": edge["type"]
                })

        node["data"]["input_types"] = input_types

    return {"nodes": nodes, "edges": edges}


def parse_dag_graph(dot_file_path):
    """
    Parse one DOT file and attach its LLVM graph identity
    Used by SelectionDag Graph and run_llc()
    """
    with open(dot_file_path, 'r') as dot_file:
        first_line = dot_file.readline().strip()

    title_match = re.match(r'^digraph "([^"]+)"', first_line)
    title = (
        title_match.group(1)
        if title_match
        else os.path.basename(dot_file_path)
    )

    stage_name = ''
    function_name = ''
    block_name = ''

    stage_name, separator, location = title.partition(' input for ')

    if separator:
        function_name, block_separator, block_name = location.rpartition(':')

        if not block_separator:
            function_name = location
            block_name = ''

    graph_data = parse_dot(dot_file_path)
    graph_data.update({
        "title": title,
        "stage": stage_name,
        "function": function_name,
        "block": block_name
    })

    return graph_data


def get_opcodes(nodes):
    """
    Extract operation opcodes from nodes.
    """
    opcodes = set()
    for n in nodes:
        opcode = n.get('data', {}).get('opcode', '')
        if (opcode and
            not opcode.startswith('Register') and
            not opcode.startswith('Constant') and
            opcode != "EnteryToken" and
            '\\<' not in opcode):
            opcodes.add(opcode)
    return opcodes
