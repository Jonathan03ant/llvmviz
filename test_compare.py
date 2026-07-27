#!/usr/bin/env python3
"""
Quick test for the compare functionality
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from lib.parser import get_opcodes
from lib.utils import generate_comparison

# Mock test data
nodes_stage1 = [
    {"id": "n1", "data": {"opcode": "add", "label": "add"}},
    {"id": "n2", "data": {"opcode": "mul", "label": "mul"}},
    {"id": "n3", "data": {"opcode": "ISD::LOAD", "label": "ISD::LOAD"}},
    {"id": "n4", "data": {"opcode": "Register %x", "label": "Register %x"}},  # Should be filtered
]

edges_stage1 = [
    {"id": "e1", "source": "n1", "target": "n2"},
    {"id": "e2", "source": "n2", "target": "n3"},
]

nodes_stage2 = [
    {"id": "n1", "data": {"opcode": "add", "label": "add"}},
    {"id": "n2", "data": {"opcode": "ISD::LOAD", "label": "ISD::LOAD"}},
    {"id": "n5", "data": {"opcode": "V_ADD_U32_e64", "label": "V_ADD_U32_e64"}},
    {"id": "n6", "data": {"opcode": "Constant 0", "label": "Constant 0"}},  # Should be filtered
]

edges_stage2 = [
    {"id": "e1", "source": "n1", "target": "n2"},
]

print("Testing get_opcodes()...")
opcodes1 = get_opcodes(nodes_stage1)
print(f"  Stage 1 opcodes: {opcodes1}")

opcodes2 = get_opcodes(nodes_stage2)
print(f"  Stage 2 opcodes: {opcodes2}")

print("\nTesting generate_comparison()...")
comparison = generate_comparison(
    nodes_stage1, edges_stage1, "legalize",
    nodes_stage2, edges_stage2, "isel"
)

print(f"\nComparison result:")
print(f"  Stage 1: {comparison['stage1_name']} ({comparison['stage1_nodes']} nodes, {comparison['stage1_edges']} edges)")
print(f"  Stage 2: {comparison['stage2_name']} ({comparison['stage2_nodes']} nodes, {comparison['stage2_edges']} edges)")
print(f"  Node change: {comparison['node_count_change']:+d}")
print(f"  Edge change: {comparison['edge_count_change']:+d}")
print(f"  Added opcodes: {comparison['added_opcodes']}")
print(f"  Removed opcodes: {comparison['removed_opcodes']}")

print("\n✅ Test passed!")
