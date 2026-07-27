"""
MIR Pipeline Discovery and Analysis
Discovers the LLVM MIR pass pipeline by parsing llc --debug-pass=Structure output
and categorizing passes into semantic stages.

NEW: Dynamic stage detection by analyzing MIR characteristics (no hardcoded pass names!)
"""
import subprocess
import tempfile
import os
import re
from typing import Dict, List, Optional, Tuple

# Pass name to -stop-after ID mapping
# mpas human-readable name from --debug-pass=Structure to llc --stop-after IDs
PASS_NAME_TO_ID = {
    "Finalize ISel and expand pseudo-instructions": "finalize-isel",
    "Virtual Register Rewriter": "virtregrewriter",
    "Prologue/Epilogue Insertion & Frame Finalization": "prologepilog",
    "AMDGPU DAG->DAG Pattern Instruction Selection": "amdgpu-isel",
    "Machine Common Subexpression Elimination": "machine-cse",
    "Greedy Register Allocator": "greedy",
    "AMDGPU Assembly Printer": "amdgpu-asm-printer",
    "Peephole Optimizations": "peephole-opt",
    # MORE
}

def parse_debug_pass_structure(output: str):
    """
    Parses llc --debug-pass=Structure output to extract pass hierarchy.
        - 0 spaces: Module-level
        - 2 spaces: ModulePass Manager
        - 4 spaces: FunctionPass Manager
        - 6 spaces: Function passes
        - 8 spaces: Nested passes (most MIR passes are here)
    """
    passes = []
    for line in output.split('\n'):
        if not line.strip() or line.startswith('Pass Arguments:'):
            continue

        indent = len(line) - len(line.lstrip(' '))
        pass_name = line.strip()

        # Categorize by indentation level
        if indent == 0:
            level = "module"
        elif indent == 2:
            level = "module_manager"
        elif indent == 4:
            level = "function_manager"
        elif indent == 6:
            level = "function_pass"
        elif indent == 8:
            level = "nested_pass"  # Most MIR passes are here
        else:
            level = "unknown"

        passes.append({
            "name": pass_name,
            "indent": indent,
            "level": level,
        })

    return passes

def map_pass_name_to_id(pass_name: str) -> str:
    """
    Maps human-readable pass name to llc -stop-after ID.
    """
    # Check hardcoded mapping first
    if pass_name in PASS_NAME_TO_ID:
        return PASS_NAME_TO_ID[pass_name]

    # Fallback: lowercase and replace spaces with hyphens
    # This won't always be correct, but gives us a starting point
    return pass_name.lower().replace(' ', '-')

def extract_mir_passes(all_passes: List[Dict]):
    """
    Extract MIR passes from all passes
        MIR passes start after "DAG->DAG Pattern Instruction Selection".
        Everything before that is IR passes.
    """
    mir_passes = []
    mir_started = False

    for pass_obj in all_passes:
        pass_name = pass_obj["name"]

        # Detect MIR boundary
        if "DAG->DAG Pattern Instruction Selection" in pass_name:
            mir_started = True

        if mir_started and pass_obj["level"] in ["function_pass", "nested_pass"]:
            # Map human name to pass ID
            pass_id = map_pass_name_to_id(pass_name)

            mir_passes.append({
                "name": pass_name,
                "id": pass_id,
                "indent": pass_obj["indent"],
                "level": pass_obj["level"],
            })

    return mir_passes

def categorize_selectiondag_passes(mir_passes: List[Dict]):
    """
    DEPRECATED: Old hardcoded stage categorization. Use infer_pipeline_stage_from_mir() instead.

    Categorizes MIR passes into 5 semantic stages using hardcoded pass name matching.
    Stages:
        1. Instruction Selection - until we see "finalize-isel"
        2. Pre-RA Optimization - until we see "virtregrewriter"
        3. Register Allocation - until we see "prologepilog"
        4. Post-RA - until we see "Assembly Printer"
        5. Code Emission - everything after
    """
    stages = {
        "Instruction Selection": {"count": 0, "passes": []},
        "Pre-RA Optimization": {"count": 0, "passes": []},
        "Register Allocation": {"count": 0, "passes": []},
        "Post-RA": {"count": 0, "passes": []},
        "Code Emission": {"count": 0, "passes": []},
    }

    current_stage = "Instruction Selection"

    for pass_obj in mir_passes:
        pass_name = pass_obj["name"]
        pass_id = pass_obj["id"]

        # Add to current stage
        stages[current_stage]["passes"].append({
            "name": pass_name,
            "id": pass_id
        })
        stages[current_stage]["count"] += 1

        # Check if we hit a stage boundary marker
        if "Finalize ISel" in pass_name or pass_id == "finalize-isel":
            current_stage = "Pre-RA Optimization"
        elif "Virtual Register Rewriter" in pass_name or pass_id == "virtregrewriter":
            current_stage = "Register Allocation"
        elif "Prologue/Epilogue Insertion" in pass_name or pass_id == "prologepilog":
            current_stage = "Post-RA"
        elif "Assembly Printer" in pass_name:
            current_stage = "Code Emission"

    return stages

def analyze_mir_characteristics(mir_text: str) -> Dict:
    """
    Extract objective characteristics from MIR content.
    These patterns are universal across ALL architectures!

    Returns dictionary of boolean characteristics that reveal pipeline stage.
    """
    # Extract flags from function header
    flags = set()
    match = re.search(r'# Machine code for function \w+: (.+)', mir_text)
    if match:
        flags = set(flag.strip() for flag in match.group(1).split(','))

    # Analyze MIR content
    characteristics = {
        # Register characteristics
        'has_virtual_registers': bool(re.search(r'%\d+:', mir_text)),
        'has_physical_registers': bool(re.search(r'(?:=|,)\s*(?:killed\s+)?(?:renamable\s+)?\$\w+', mir_text)),
        'virtual_reg_count': len(re.findall(r'%\d+:', mir_text)),

        # SSA characteristics
        'is_ssa': 'IsSSA' in flags,
        'has_phi_nodes': 'NoPHIs' not in flags,
        'no_vregs': 'NoVRegs' in flags,

        # Stack/Frame characteristics
        'has_frame_setup': 'frame-setup' in mir_text,
        'has_stack_objects': bool(re.search(r'stack:', mir_text)),
        'has_cfi': 'CFI_INSTRUCTION' in mir_text,

        # Liveness tracking
        'tracks_liveness': 'TracksLiveness' in flags,
        'has_kill_flags': bool(re.search(r'\bkilled\b', mir_text)),
        'has_renamable': bool(re.search(r'\brenamable\b', mir_text)),

        # Debug info
        'tracks_debug': 'TracksDebugUserValues' in flags,

        # Instruction count (for change magnitude)
        'num_instructions': len(re.findall(r'^\s+[A-Z_]+', mir_text, re.MULTILINE)),
    }

    return characteristics


def infer_pipeline_stage_from_mir(characteristics: Dict) -> Tuple[str, float]:
    """
    Infer which pipeline stage produced this MIR based on its characteristics.
    Uses universal MIR patterns that work across ALL architectures.

    Returns:
        (stage_name, confidence_score)
    """
    # Define universal stage signatures
    STAGE_SIGNATURES = {
        'INSTRUCTION_SELECTION': {
            'has_virtual_registers': True,
            'is_ssa': True,
            'no_vregs': False,
            'has_frame_setup': False,
        },
        'PRE_RA_OPTIMIZATION': {
            'has_virtual_registers': True,
            'is_ssa': True,
            'has_phi_nodes': False,  # PHIs eliminated early
            'no_vregs': False,
            'has_frame_setup': False,
        },
        'POST_RA_OPTIMIZATION': {
            'has_virtual_registers': False,
            'no_vregs': True,
            'has_physical_registers': True,
            'has_frame_setup': False,  # Not yet
        },
        'POST_RA_LATE': {
            'has_virtual_registers': False,
            'no_vregs': True,
            'has_physical_registers': True,
            'has_frame_setup': True,  # Stack frame added!
        },
        'CODE_EMISSION': {
            'has_virtual_registers': False,
            'no_vregs': True,
            'has_physical_registers': True,
            'has_frame_setup': True,
        }
    }

    best_stage = None
    best_score = 0.0

    for stage_name, signature in STAGE_SIGNATURES.items():
        matches = 0
        total = len(signature)

        for key, expected in signature.items():
            if characteristics.get(key) == expected:
                matches += 1

        score = matches / total if total > 0 else 0.0

        if score > best_score:
            best_score = score
            best_stage = stage_name

    return best_stage, best_score


def detect_pass_importance(pass_name: str, mir_before: Optional[str], mir_after: str) -> Dict:
    """
    Determine pass importance/color based on what it does.
    Analyzes MIR changes to detect critical transformations.

    Returns dict with: importance level, color, reason
    """
    if mir_before is None:
        # First pass - always important
        return {
            'importance': 'critical',
            'color': 'green',
            'reason': 'Instruction selection - IR to MIR conversion'
        }

    chars_before = analyze_mir_characteristics(mir_before)
    chars_after = analyze_mir_characteristics(mir_after)

    # Detect what changed

    # PURPLE: Register allocation (virtual -> physical)
    if chars_before['has_virtual_registers'] and chars_after['no_vregs']:
        return {
            'importance': 'critical',
            'color': 'purple',
            'reason': 'Register allocation - converts virtual to physical registers'
        }

    # ORANGE: Stack frame setup (prologue/epilogue)
    if not chars_before['has_frame_setup'] and chars_after['has_frame_setup']:
        return {
            'importance': 'critical',
            'color': 'orange',
            'reason': 'Prologue/Epilogue insertion - adds stack frame'
        }

    # BLUE: Scheduling passes
    if 'sched' in pass_name.lower():
        return {
            'importance': 'high',
            'color': 'blue',
            'reason': 'Instruction scheduling - reorders for performance'
        }

    # GREEN: Stage transition
    stage_before, _ = infer_pipeline_stage_from_mir(chars_before)
    stage_after, _ = infer_pipeline_stage_from_mir(chars_after)
    if stage_before != stage_after:
        return {
            'importance': 'high',
            'color': 'green',
            'reason': f'Pipeline stage transition: {stage_before} -> {stage_after}'
        }

    # Calculate change magnitude
    inst_before = chars_before['num_instructions']
    inst_after = chars_after['num_instructions']
    change_pct = abs(inst_after - inst_before) / max(inst_before, 1) * 100

    if change_pct > 20:
        return {
            'importance': 'medium',
            'color': 'yellow',
            'reason': f'Significant transformation ({change_pct:.0f}% instruction change)'
        }

    # DEFAULT: Minor or no change
    return {
        'importance': 'normal',
        'color': 'default',
        'reason': 'Optimization or analysis pass'
    }


def detect_key_milestones(mir_passes: List[Dict]) -> List[Dict]:
    """
    Detects the 11 universal MIR milestones from discovered passes.

    These milestones represent stable conceptual boundaries that work
    across all targets (AMDGPU, x86, ARM, etc.).

    Returns list of milestones with name, pass_id, and description.
    """
    milestones = []

    # Helper to find pass by name or ID
    def find_pass(passes, search_terms, start_idx=0):
        if isinstance(search_terms, str):
            search_terms = [search_terms]
        for i, p in enumerate(passes[start_idx:], start=start_idx):
            for term in search_terms:
                if term.lower() in p['name'].lower() or term.lower() == p['id'].lower():
                    return (i, p)
        return None

    # 1. LLVM IR entering code generation (virtual - no actual pass)
    milestones.append({
        "name": "LLVM IR Input",
        "pass_id": None,  # Special: view original IR
        "description": "Original LLVM IR before code generation"
    })

    # 2. After instruction selection
    result = find_pass(mir_passes, ["finalize-isel", "Finalize ISel"])
    if result:
        idx, pass_obj = result
        milestones.append({
            "name": "After Instruction Selection",
            "pass_id": pass_obj['id'],
            "description": "Target-specific instructions with virtual registers"
        })
        last_isel_idx = idx
    else:
        last_isel_idx = 0

    # Find register allocator for subsequent milestones
    regalloc_result = find_pass(mir_passes, ["greedy", "regallocfast", "Register Allocator"])
    regalloc_idx = regalloc_result[0] if regalloc_result else len(mir_passes)

    # Find scheduler
    scheduler_result = find_pass(mir_passes, ["MachineScheduler", "Machine Scheduler"], last_isel_idx)

    # 3. After pre-RA optimization (last pass before scheduler or regalloc)
    if scheduler_result:
        sched_idx = scheduler_result[0]
        if sched_idx > last_isel_idx + 1:
            # Take pass before scheduler
            pre_opt_pass = mir_passes[sched_idx - 1]
            milestones.append({
                "name": "After Pre-RA Optimization",
                "pass_id": pre_opt_pass['id'],
                "description": "Optimized MIR before scheduling"
            })
    elif regalloc_idx > last_isel_idx + 1:
        # No scheduler, take pass before regalloc
        pre_opt_pass = mir_passes[regalloc_idx - 1]
        milestones.append({
            "name": "After Pre-RA Optimization",
            "pass_id": pre_opt_pass['id'],
            "description": "Optimized MIR before register allocation"
        })

    # 4. After machine scheduling
    if scheduler_result:
        idx, sched_pass = scheduler_result
        milestones.append({
            "name": "After Machine Scheduling",
            "pass_id": sched_pass['id'],
            "description": "Instructions reordered for performance"
        })

    # 5. Immediately before register allocation
    if regalloc_result and regalloc_idx > 0:
        before_ra_pass = mir_passes[regalloc_idx - 1]
        milestones.append({
            "name": "Before Register Allocation",
            "pass_id": before_ra_pass['id'],
            "description": "Final virtual-register MIR (allocator input)"
        })

    # 6. After register allocation (right after greedy/fast, before rewrite)
    if regalloc_result:
        idx, regalloc_pass = regalloc_result
        milestones.append({
            "name": "After Register Allocation",
            "pass_id": regalloc_pass['id'],
            "description": "Physical registers chosen, not yet rewritten"
        })

    # 7. After virtual-register rewriting
    virtrewrite_result = find_pass(mir_passes, ["virtregrewriter", "Virtual Register Rewriter"])
    if virtrewrite_result:
        idx, vr_pass = virtrewrite_result
        milestones.append({
            "name": "After Virtual-Register Rewriting",
            "pass_id": vr_pass['id'],
            "description": "All virtual registers replaced with physical registers"
        })
        last_vr_idx = idx
    else:
        last_vr_idx = regalloc_idx

    # 8. After frame lowering
    prologepilog_result = find_pass(mir_passes, ["prologepilog", "Prologue/Epilogue"])
    if prologepilog_result:
        idx, pe_pass = prologepilog_result
        milestones.append({
            "name": "After Frame Lowering",
            "pass_id": pe_pass['id'],
            "description": "Stack frame finalized, prologue/epilogue inserted"
        })
        last_pe_idx = idx
    else:
        last_pe_idx = last_vr_idx

    # Find assembly printer for remaining milestones
    asmprinter_result = find_pass(mir_passes, ["Assembly Printer", "AsmPrinter"])
    asmprinter_idx = asmprinter_result[0] if asmprinter_result else len(mir_passes)

    # 9. After post-RA / late target passes (last pass before asm printer)
    if asmprinter_idx > last_pe_idx + 1:
        post_ra_pass = mir_passes[asmprinter_idx - 1]
        milestones.append({
            "name": "After Post-RA Passes",
            "pass_id": post_ra_pass['id'],
            "description": "Late optimizations and target-specific fixups"
        })

    # 10. Before assembly emission
    if asmprinter_result:
        idx, asm_pass = asmprinter_result
        # Take the pass right before asm printer
        if idx > 0:
            before_asm = mir_passes[idx - 1]
            milestones.append({
                "name": "Before Assembly Emission",
                "pass_id": before_asm['id'],
                "description": "Final MIR before MC lowering"
            })

    # 11. Final assembly (virtual - needs different command)
    milestones.append({
        "name": "Final Assembly",
        "pass_id": "asm-output",  # Special: use llc without -stop-after
        "description": "Target assembly code output"
    })

    return milestones

def get_valid_pass_ids(llc_path: str, arch: str, mcpu: str, ir_code: str) -> set:
    """
    Get set of pass IDs that support -stop-after by parsing --print-after-all output.
    Returns set of valid pass IDs like {'finalize-isel', 'greedy', ...}
    """
    # Write IR to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.ll', delete=False) as f:
        f.write(ir_code)
        ir_file = f.name

    try:
        # Run llc --print-after-all to see which passes actually run
        cmd = [
            llc_path,
            '--print-after-all',
            f'-march={arch}',
            f'-mcpu={mcpu}',
            ir_file,
            '-o', '/dev/null'
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )

        # Extract pass IDs from "IR Dump After PassName (pass-id)" lines
        valid_ids = set()
        for line in result.stderr.split('\n'):
            # Match: "# *** IR Dump After PassName (pass-id) ***:"
            if 'IR Dump After' in line and '(' in line and ')' in line:
                # Extract pass-id from parentheses
                start = line.rfind('(')
                end = line.rfind(')')
                if start != -1 and end != -1 and start < end:
                    pass_id = line[start+1:end].strip()
                    valid_ids.add(pass_id)

        return valid_ids

    except Exception as e:
        # If this fails, return empty set (won't filter any passes)
        print(f"Warning: Could not get valid pass IDs: {e}")
        return set()
    finally:
        if os.path.exists(ir_file):
            os.remove(ir_file)

def discover_mir_passes(llc_path: str, arch: str, mcpu: str, ir_code: str):
    """
    DEPRECATED: Use discover_mir_passes_with_analysis() instead.

    Old implementation that only uses --debug-pass=Structure without MIR analysis.
    Kept for compatibility but should not be used in new code.

    Args:
        llc_path: Path to llc binary
        arch: Target architecture (e.g., "amdgcn")
        mcpu: Target CPU (e.g., "gfx1101")
        ir_code: LLVM IR code to compile
    Returns:
        Dictionary with categorized pass hierarchy and metadata
    """
    # Write IR to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.ll', delete=False) as f:
        f.write(ir_code)
        ir_file = f.name

    try:
        # Run llc --debug-pass=Structure
        cmd = [
            llc_path,
            '--debug-pass=Structure',
            f'-march={arch}',
            f'-mcpu={mcpu}',
            ir_file,
            '-o', '/dev/null'
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )

        output = result.stderr

        # Get valid pass IDs (that support -stop-after)
        valid_pass_ids = get_valid_pass_ids(llc_path, arch, mcpu, ir_code)

        # Parse pass structure
        all_passes = parse_debug_pass_structure(output)

        # Extract MIR passes only
        mir_passes = extract_mir_passes(all_passes)

        # Mark each pass as supporting -stop-after or not
        for pass_obj in mir_passes:
            pass_obj['supports_stop_after'] = pass_obj['id'] in valid_pass_ids

        # Categorize into semantic stages (all passes)
        stages = categorize_selectiondag_passes(mir_passes)

        # Extract all viewable passes (those that support -stop-after)
        # Track duplicates by counting occurrences
        pass_counters = {}
        viewable_passes = []

        for p in mir_passes:
            if p.get('supports_stop_after', False):
                pass_id = p['id']
                pass_name = p['name']

                # Track how many times this pass has occurred
                if pass_id not in pass_counters:
                    pass_counters[pass_id] = 0
                pass_counters[pass_id] += 1

                # Check if this pass will appear multiple times (peek ahead)
                total_count = sum(1 for pp in mir_passes if pp.get('id') == pass_id and pp.get('supports_stop_after', False))

                # Add occurrence number if pass runs multiple times
                display_name = pass_name
                if total_count > 1:
                    display_name = f"{pass_name} ({pass_counters[pass_id]})"

                viewable_passes.append({
                    "name": display_name,
                    "pass_id": pass_id,
                    "occurrence": pass_counters[pass_id],
                    "description": f"View MIR after {display_name}"
                })


        return {
            "success": True,
            "pipeline": {
                "total_passes": len(mir_passes),
                "viewable_passes": viewable_passes,  # List of all ~85 viewable passes
                "semantic_stages": stages,  # All 171 passes categorized
            },
            "terminal_output": f"Discovered {len(mir_passes)} MIR passes ({len(viewable_passes)} viewable)\nCategorized into {len(stages)} stages"
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "llc command timed out",
            "terminal_output": "Error: Command timed out after 30 seconds"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "terminal_output": f"Error: {str(e)}"
        }
    finally:
        # Clean up temp file
        if os.path.exists(ir_file):
            os.remove(ir_file)

def discover_mir_passes_with_analysis(llc_path: str, arch: str, mcpu: str, ir_code: str) -> Dict:
    """
    Enhanced pipeline discovery that analyzes actual MIR content to:
    1. Dynamically detect pipeline stages (no hardcoded pass names!)
    2. Determine pass importance/colors based on what changed
    3. Identify section boundaries from MIR characteristics

    Uses --print-changed to get MIR snapshots and analyze them.
    """
    # Write IR to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.ll', delete=False) as f:
        f.write(ir_code)
        ir_file = f.name

    try:
        # Step 1: Get pass list from --debug-pass=Structure
        cmd = [
            llc_path,
            '--debug-pass=Structure',
            f'-march={arch}',
            f'-mcpu={mcpu}',
            ir_file,
            '-o', '/dev/null'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        all_passes = parse_debug_pass_structure(result.stderr)
        mir_passes = extract_mir_passes(all_passes)

        # Step 2: Get MIR snapshots with --print-changed
        cmd_changed = [
            llc_path,
            '--print-changed',
            f'-march={arch}',
            f'-mcpu={mcpu}',
            ir_file,
            '-o', '/dev/null'
        ]
        result_changed = subprocess.run(cmd_changed, capture_output=True, text=True, timeout=60)

        # Step 3: Parse MIR dumps from --print-changed output
        mir_dumps = parse_print_changed_output(result_changed.stderr)

        # Step 4: Analyze each MIR dump to infer stage and importance
        prev_mir = None
        prev_stage = None
        analyzed_passes = []

        for dump in mir_dumps:
            pass_name = dump['pass_name']
            pass_id = dump['pass_id']
            mir_content = dump['mir']

            # Analyze MIR characteristics
            chars = analyze_mir_characteristics(mir_content)

            # Infer pipeline stage from MIR content
            inferred_stage, confidence = infer_pipeline_stage_from_mir(chars)

            # Detect importance/color based on changes
            importance_info = detect_pass_importance(pass_name, prev_mir, mir_content)

            # Check if this is a stage transition
            is_transition = (inferred_stage != prev_stage and prev_stage is not None)

            analyzed_passes.append({
                'name': pass_name,
                'id': pass_id,
                'viewable': True,  # All passes in --print-changed are viewable
                'stage': inferred_stage,
                'stage_confidence': confidence,
                'is_transition': is_transition,
                **importance_info,  # Add importance, color, reason
                'characteristics': chars,
            })

            prev_mir = mir_content
            prev_stage = inferred_stage

        # Step 5: Group passes into sections based on detected stages
        sections = group_passes_by_stage(analyzed_passes)

        # Step 6: Mark ALL passes (not just viewable) with their sections
        viewable_ids = {p['id'] for p in analyzed_passes}
        all_passes_with_sections = []

        for p in mir_passes:
            pass_id = p['id']
            is_viewable = pass_id in viewable_ids

            # Find stage for this pass (from analyzed data or heuristic)
            if is_viewable:
                analyzed = next((ap for ap in analyzed_passes if ap['id'] == pass_id), None)
                if analyzed:
                    section = analyzed['stage']
                    color = analyzed.get('color', 'default')
                    importance = analyzed.get('importance', 'normal')
                else:
                    section = 'UNKNOWN'
                    color = 'default'
                    importance = 'normal'
            else:
                # For non-viewable passes, infer section from position
                section = infer_section_from_position(p, analyzed_passes)
                color = 'default'
                importance = 'analysis'

            all_passes_with_sections.append({
                **p,
                'viewable': is_viewable,
                'section': section,
                'color': color,
                'importance': importance,
            })

        return {
            "success": True,
            "pipeline": {
                "total_passes": len(mir_passes),
                "viewable_count": len(analyzed_passes),
                "all_passes": all_passes_with_sections,  # All 171 passes with sections
                "viewable_passes": analyzed_passes,  # 85 viewable with full analysis
                "sections": sections,  # NEW: Grouped by dynamically detected stage
                "semantic_stages": {},  # DEPRECATED: Empty for backward compatibility
            },
            "terminal_output": f"Discovered {len(mir_passes)} passes ({len(analyzed_passes)} viewable)\nDetected {len(sections)} pipeline stages"
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "terminal_output": f"Error: {str(e)}"
        }
    finally:
        if os.path.exists(ir_file):
            os.remove(ir_file)


def parse_print_changed_output(output: str) -> List[Dict]:
    """
    Parse llc --print-changed output to extract MIR dumps.

    Returns list of {pass_name, pass_id, mir} dictionaries.
    """
    dumps = []
    lines = output.split('\n')
    i = 0

    while i < len(lines):
        line = lines[i]

        # Look for IR dump headers
        if '*** IR Dump After' in line and 'omitted because no change' not in line:
            # Extract pass name and ID
            # Format: "*** IR Dump After PassName (pass-id) on function ***"
            match = re.search(r'\*\*\* IR Dump After (.+?) \(([^\)]+)\)', line)
            if match:
                pass_name = match.group(1).strip()
                pass_id = match.group(2).strip()

                # Collect MIR content until next dump or end
                mir_lines = []
                i += 1
                while i < len(lines) and '*** IR Dump After' not in lines[i]:
                    mir_lines.append(lines[i])
                    i += 1

                mir_content = '\n'.join(mir_lines)

                dumps.append({
                    'pass_name': pass_name,
                    'pass_id': pass_id,
                    'mir': mir_content
                })
                continue

        i += 1

    return dumps


def group_passes_by_stage(analyzed_passes: List[Dict]) -> List[Dict]:
    """
    Group analyzed passes into sections based on their detected stages.

    Returns list of section objects with metadata.
    """
    sections = []
    current_section = None
    current_passes = []

    for p in analyzed_passes:
        stage = p['stage']

        if stage != current_section:
            # Save previous section if exists
            if current_section and current_passes:
                sections.append({
                    'name': format_stage_name(current_section),
                    'stage_id': current_section,
                    'passes': current_passes,
                    'count': len(current_passes),
                })

            # Start new section
            current_section = stage
            current_passes = [p]
        else:
            current_passes.append(p)

    # Add final section
    if current_section and current_passes:
        sections.append({
            'name': format_stage_name(current_section),
            'stage_id': current_section,
            'passes': current_passes,
            'count': len(current_passes),
        })

    return sections


def format_stage_name(stage_id: str) -> str:
    """Convert stage ID to human-readable name"""
    names = {
        'INSTRUCTION_SELECTION': 'Instruction Selection',
        'PRE_RA_OPTIMIZATION': 'Pre-RA Optimization',
        'POST_RA_OPTIMIZATION': 'Post-RA Optimization',
        'POST_RA_LATE': 'Post-RA Late',
        'CODE_EMISSION': 'Code Emission',
    }
    return names.get(stage_id, stage_id.replace('_', ' ').title())


def infer_section_from_position(pass_obj: Dict, analyzed_passes: List[Dict]) -> str:
    """
    Infer section for non-viewable pass based on its position relative to viewable passes.
    """
    # Simple heuristic: find closest viewable pass and use its section
    pass_name = pass_obj['name']

    # Look for nearby analyzed passes
    for ap in analyzed_passes:
        if ap['name'] in pass_name or pass_name in ap['name']:
            return ap['stage']

    # Fallback to heuristic based on pass name
    name_lower = pass_name.lower()
    if 'isel' in name_lower or 'selection' in name_lower:
        return 'INSTRUCTION_SELECTION'
    elif 'register' in name_lower and 'rewriter' in name_lower:
        return 'POST_RA_OPTIMIZATION'
    elif 'prologue' in name_lower or 'epilog' in name_lower:
        return 'POST_RA_LATE'
    elif 'asm' in name_lower or 'assembly' in name_lower:
        return 'CODE_EMISSION'
    else:
        return 'PRE_RA_OPTIMIZATION'  # Most passes are here


def generate_mir_at_pass(llc_path: str, arch: str, mcpu: str, ir_code: str, pass_id: str) -> Dict:
    """
    Generates MIR snapshot after a specific pass.

    Runs: llc -stop-after={pass_id} -march={arch} -mcpu={mcpu} input.ll -o -

    Args:
        llc_path: Path to llc binary
        arch: Target architecture
        mcpu: Target CPU
        ir_code: LLVM IR code
        pass_id: Pass ID for -stop-after (e.g., "finalize-isel")

    Returns:
        Dictionary with MIR content and metadata
    """
    # Validate llc_path exists
    if not os.path.exists(llc_path):
        return {
            "success": False,
            "error": f"llc not found at: {llc_path}",
            "terminal_output": f"Error: llc binary not found at {llc_path}"
        }

    # Write IR to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.ll', delete=False) as f:
        f.write(ir_code)
        ir_file = f.name

    try:
        # Run llc -stop-after={pass_id}
        cmd = [
            llc_path,
            f'-stop-after={pass_id}',
            f'-march={arch}',
            f'-mcpu={mcpu}',
            ir_file,
            '-o', '-'  # Output to stdout
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60  # Increased timeout
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": result.stderr,
                "terminal_output": f"Error generating MIR:\n{result.stderr}"
            }

        mir_content = result.stdout
        line_count = len(mir_content.split('\n'))

        return {
            "success": True,
            "mir_content": mir_content,
            "pass_id": pass_id,
            "line_count": line_count,
            "terminal_output": f"Generated MIR after {pass_id} ({line_count} lines)"
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "llc command timed out",
            "terminal_output": "Error: Command timed out after 60 seconds"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "terminal_output": f"Error: {str(e)}"
        }
    finally:
        # Clean up temp file
        if os.path.exists(ir_file):
            os.remove(ir_file)