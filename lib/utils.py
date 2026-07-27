import subprocess
import os
import signal
import time
from lib.parser import get_opcodes


def generate_comparison(nodes1, edges1, stage1_name, nodes2, edges2, stage2_name):
    """
    Compare two DAG stages and return diff analysis.

    stage1 = primary stage (shown on top)
    stage2 = compare stage (shown on bottom)
    """
    opcodes1 = get_opcodes(nodes1)
    opcodes2 = get_opcodes(nodes2)

    # Operations in stage1 but not in stage2
    added = sorted(list(opcodes1 - opcodes2))
    # Operations in stage2 but not in stage1
    removed = sorted(list(opcodes2 - opcodes1))

    return {
        'added_opcodes': added,    # In stage1, not in stage2 (will be removed going stage1→stage2)
        'removed_opcodes': removed,  # In stage2, not in stage1 (will be added going stage1→stage2)
        'node_count_change': len(nodes1) - len(nodes2),
        'edge_count_change': len(edges1) - len(edges2),
        'stage1_name': stage1_name,
        'stage2_name': stage2_name,
        'stage1_nodes': len(nodes1),
        'stage2_nodes': len(nodes2),
        'stage1_edges': len(edges1),
        'stage2_edges': len(edges2)
    }

def kill_port_8080():
    """Kill any process using port 8080"""
    try:
        result = subprocess.run(
            ['lsof', '-ti', ':8080'],
            capture_output=True,
            text=True
        )

        if result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                try:
                    print(f'Killing existing process on port 8080 (PID: {pid})')
                    os.kill(int(pid), signal.SIGKILL)
                except ProcessLookupError:
                    pass

            time.sleep(0.5)
    except FileNotFoundError:
        try:
            subprocess.run(['fuser', '-k', '-9', '8080/tcp'], stderr=subprocess.DEVNULL)
            print('Killed existing process on port 8080')
            time.sleep(0.5)
        except FileNotFoundError:
            pass
