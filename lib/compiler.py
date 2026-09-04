import subprocess
import glob
import os
import datetime

DAG_STAGE_FLAGS = {
    'dag-combine1': '-view-dag-combine1-dags',    # After build, before first optimization pass
    'legalize': '-view-legalize-dags',            # Before legalization (after dag-combine1)
    'dag-combine2': '-view-dag-combine2-dags',    # Before second optimization pass (after legalization)
    'isel': '-view-isel-dags',                    # Before instruction selection (after dag-combine2)
    'sched': '-view-sched-dags'                   # Before scheduling (after instruction selection)
}

GLOBAL_ISEL_STAGES = {
    "irtranslator": "irtranslator",
    "legalizer": "legalizer",
    "regbankselect": "amdgpu-regbankselect",
    "instruction-select": "instruction-select",
    "finalize-isel": "finalize-isel",
}


def run_llc(ir_code: str, stage: str, llc_path: str, arch: str = 'amdgcn', mcpu: str = 'gfx1101'):
    """
    Generates graph .dot file from LLVM IR
    """
    with open('/tmp/input.ll', 'w') as f:
        f.write(ir_code)

    flag = DAG_STAGE_FLAGS[stage]

    cmd = [
        llc_path,
        f'-march={arch}',
        f'-mcpu={mcpu}',
        '/tmp/input.ll',
        flag,
        '-o', '/dev/null'
    ]

    # ViewGraph always writes the DOT file first. Restrict PATH for this
    # subprocess so desktop viewers such as xdg-open are not launched.
    graph_env = os.environ.copy()
    graph_env['PATH'] = os.path.dirname(os.path.abspath(llc_path))

    result = subprocess.run(
        cmd,
        check=True,
        capture_output=True,
        text=True,
        env=graph_env
    )

    terminal_output = []
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
    terminal_output.append({
        "type": "command",
        "text": " ".join(cmd),
        "timestamp": timestamp
    })

    if result.stdout.strip():
        for line in result.stdout.strip().split('\n'):
            terminal_output.append({
                "type": "stdout",
                "text": line,
                "timestamp": timestamp
            })
    terminal_output.append({
        "type": "success",
        "text": f"✓ Compiled successfully (exit code: {result.returncode})",
        "timestamp": timestamp
    })

    dot_files = glob.glob('/tmp/dag.*.dot')
    dot_files.sort(key=os.path.getmtime, reverse=True)
    dot_file = dot_files[0]

    return dot_file, terminal_output

def build_mir_command(
    llc_path: str,
    input_path: str,
    output_path: str,
    arch: str,
    mcpu: str,
    selector = "selectiondag",
    stop_after = "finalize-isel"
):
    """
    Build the llc command to produce MIR snapshot
    selector:
        "selectiondag" uses the traditional SelectionDag path
        "globalisel" uses the GlobalIsel path
    stop_after:
        the machine pass after which llc serializes MIR
    """
    if selector not in {"selectiondag", "globalisel"}:
        raise ValueError(f"Unknown instruction selector: {selector}")

    if selector == "globalisel":
        pass_id = GLOBAL_ISEL_STAGES.get(stop_after)

        if pass_id is None:
            raise ValueError(f"Unknown GlobalISel stage: {stop_after}")
    else:
        if stop_after != "finalize-isel":
            raise ValueError(
                f"SelectionDAG MIR only supports finalize-isel, got: {stop_after}"
            )

        pass_id = stop_after

    cmd = [
        llc_path,
        f"-march={arch}",
        f"-mcpu={mcpu}",
    ]

    if selector == 'globalisel':
        cmd.extend([
            "-global-isel",
            "-global-isel-abort=1", #do not silently fail back to SelectionDag
        ])
    else:
        cmd.append("-global-isel=0")

    cmd.extend([
        input_path,
        f"-stop-after={pass_id}",
        "-o",
        output_path,
    ])

    return cmd


def generate_mir(
    ir_code: str,
    llc_path: str,
    arch: str,
    mcpu: str,
    selector: str = "selectiondag",
    stop_after: str = "finalize-isel"
):
    """
    Generates Machine IR (MIR) output from LLVM IR.
    Shows machine instructions with virtual registers
    This is the MIR before we enter the actual MIR pipeline..
    """
    with open('/tmp/input.ll', 'w') as f:
        f.write(ir_code)

    output_mir = '/tmp/output.mir'

    cmd = build_mir_command(
        llc_path=llc_path,
        input_path="/tmp/input.ll",
        output_path=output_mir,
        arch=arch,
        mcpu=mcpu,
        selector=selector,
        stop_after=stop_after,
    )


    result = subprocess.run(
        cmd,
        check=True,
        capture_output=True,
        text=True
    )

    # Read generated MIR content
    with open(output_mir, 'r') as f:
        mir_content = f.read()

    # Build terminal output
    terminal_output = []
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")

    terminal_output.append({
        "type": "command",
        "text": " ".join(cmd),
        "timestamp": timestamp
    })

    if result.stdout.strip():
        for line in result.stdout.strip().split('\n'):
            terminal_output.append({
                "type": "stdout",
                "text": line,
                "timestamp": timestamp
            })

    terminal_output.append({
        "type": "success",
        "text": f"✓ MIR generated successfully ({len(mir_content)} bytes)",
        "timestamp": timestamp
    })

    return mir_content, terminal_output


