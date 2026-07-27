import os
import sys
import datetime
import subprocess
from flask import Flask, jsonify, request
from flask_cors import CORS

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from lib.compiler import run_llc, DAG_STAGE_FLAGS, generate_mir
from lib.parser import parse_dot
from lib.targets import get_architectures, get_cpus
from lib.utils import kill_port_8080, generate_comparison
from lib.mir_pipeline import discover_mir_passes_with_analysis, generate_mir_at_pass

app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'message': 'DagLens Python API is running'
    })

@app.route('/api/compile', methods=['POST'])
def compile_endpoint():
    """
    Receives LLVM IR code and DAG stage, compiles and returns graph data.
    Optionally accepts compare_stage to compare two DAG stages.
    """
    try:
        data = request.get_json()
        ir_code = data.get('ir_code', '')
        stage = data.get('stage', 'isel')
        compare_stage = data.get('compare_stage', None)
        llc_path = data.get('llc_path', 'llc')
        arch = data.get('arch', 'amdgcn')
        mcpu = data.get('mcpu', 'gfx1101')

        # Validate inputs
        if not ir_code:
            return jsonify({'error': 'No IR code provided'}), 400
        if stage not in DAG_STAGE_FLAGS:
            return jsonify({'error': f'Invalid stage: {stage}'}), 400
        if compare_stage and compare_stage not in DAG_STAGE_FLAGS:
            return jsonify({'error': f'Invalid compare_stage: {compare_stage}'}), 400

        # Compile primary stage
        dot_file_path, terminal_output = run_llc(ir_code, stage, llc_path, arch, mcpu)
        graph_data = parse_dot(dot_file_path)

        response = {
            **graph_data,
            "terminal_output": terminal_output
        }

        # If compare_stage is provided, compile it and generate comparison
        if compare_stage:
            compare_dot_path, compare_terminal = run_llc(ir_code, compare_stage, llc_path, arch, mcpu)
            compare_graph_data = parse_dot(compare_dot_path)

            # Generate comparison between the two stages
            comparison = generate_comparison(
                nodes1=graph_data['nodes'],
                edges1=graph_data['edges'],
                stage1_name=stage,
                nodes2=compare_graph_data['nodes'],
                edges2=compare_graph_data['edges'],
                stage2_name=compare_stage
            )

            # Add comparison data to response
            response['compare_nodes'] = compare_graph_data['nodes']
            response['compare_edges'] = compare_graph_data['edges']
            response['comparison'] = comparison
            # Append compare terminal output
            response['terminal_output'].extend(compare_terminal)

        return jsonify(response)

    except subprocess.CalledProcessError as e:
        import traceback
        traceback.print_exc()
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        terminal_output = [
            {"type": "command", "text": f"llc -march=amdgcn -mcpu=gfx1101 ...", "timestamp": timestamp},
            {"type": "error", "text": f"✗ llc compilation failed: {str(e)}", "timestamp": timestamp}
        ]
        return jsonify({'error': f'llc compilation failed: {str(e)}', 'terminal_output': terminal_output}), 500
    except Exception as e:
        import traceback
        traceback.print_exc()
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        terminal_output = [
            {"type": "error", "text": f"✗ Error: {str(e)}", "timestamp": timestamp}
        ]
        return jsonify({'error': f'Server error: {str(e)}', 'terminal_output': terminal_output}), 500

@app.route('/api/targets', methods=['GET'])
def get_targets():
    llc_path = request.args.get('llc_path')
    arch = request.args.get('arch')

    if not llc_path:
        return jsonify({'error': 'llc_path required'}), 400

    result = {}

    result["architectures"] = get_architectures(llc_path)
    if arch:
        result["cpus"] = get_cpus(llc_path, arch)

    return jsonify(result)

@app.route('/api/generate_mir', methods=['POST'])
def generate_mir_endpoint():
    """
    Generates MIR output for viewing/downloading
    """
    try:
        data = request.get_json()
        ir_code = data.get('ir_code', '')
        llc_path = data.get('llc_path', 'llc')
        arch = data.get('arch', 'amdgcn')
        mcpu = data.get('mcpu', 'gfx1101')

        if not ir_code:
            timestamp = datetime.datetime.now().strftime("%H:%M:%S")
            return jsonify({
                'success': False,
                'error': 'No IR code provided',
                'terminal_output': [{
                    "type": "error",
                    "text": "✗ No IR code provided",
                    "timestamp": timestamp
                }]
            }), 400

        mir_content, terminal_output = generate_mir(ir_code, llc_path, arch, mcpu)

        return jsonify({
            'success': True,
            'mir': mir_content,
            'filename': 'output.mir',
            'terminal_output': terminal_output
        })

    except subprocess.CalledProcessError as e:
        import traceback
        traceback.print_exc()
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        terminal_output = [
            {"type": "command", "text": f"llc -march=... -mcpu=... -stop-after=finalize-isel", "timestamp": timestamp},
            {"type": "error", "text": f"✗ llc compilation failed: {str(e)}", "timestamp": timestamp}
        ]
        if e.stderr:
            terminal_output.append({"type": "error", "text": e.stderr, "timestamp": timestamp})
        return jsonify({
            'success': False,
            'error': f'llc compilation failed: {str(e)}',
            'terminal_output': terminal_output
        }), 500

    except Exception as e:
        import traceback
        traceback.print_exc()
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        terminal_output = [
            {"type": "error", "text": f"✗ Error: {str(e)}", "timestamp": timestamp}
        ]
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}',
            'terminal_output': terminal_output
        }), 500

@app.route('/api/discover_mir_passes', methods=['POST'])
def discover_mir_passes_endpoint():
    """
    Discovers MIR pass pipeline with dynamic stage detection and importance analysis.

    Uses:
    - llc --debug-pass=Structure (get all passes)
    - llc --print-changed (analyze MIR content)

    Returns passes with:
    - Dynamic stage categorization (no hardcoded pass names!)
    - Color coding (purple=RA, orange=stack, blue=scheduling, etc.)
    - Viewability detection
    - Section grouping
    """
    try:
        data = request.get_json()
        ir_code = data.get('ir_code', '')
        llc_path = data.get('llc_path', 'llc')
        arch = data.get('arch', 'amdgcn')
        mcpu = data.get('mcpu', 'gfx1101')

        if not ir_code:
            timestamp = datetime.datetime.now().strftime("%H:%M:%S")
            return jsonify({
                'success': False,
                'error': 'No IR code provided',
                'terminal_output': [{
                    "type": "error",
                    "text": "No IR code provided",
                    "timestamp": timestamp
                }]
            }), 400

        result = discover_mir_passes_with_analysis(llc_path, arch, mcpu, ir_code)

        # Format terminal output with detailed command info
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        if result.get('success'):
            pipeline = result.get('pipeline', {})
            total = pipeline.get('total_passes', 0)
            viewable = pipeline.get('viewable_count', 0)
            sections = len(pipeline.get('sections', []))

            terminal_entries = [
                {"type": "command", "text": f"{llc_path} --debug-pass=Structure -march={arch} -mcpu={mcpu} input.ll", "timestamp": timestamp},
                {"type": "success", "text": f"Discovered {total} MIR passes", "timestamp": timestamp},
                {"type": "command", "text": f"{llc_path} --print-changed -march={arch} -mcpu={mcpu} input.ll", "timestamp": timestamp},
                {"type": "success", "text": f"Analyzed {viewable} viewable passes across {sections} pipeline stages", "timestamp": timestamp}
            ]
        else:
            terminal_entries = [
                {"type": "error", "text": result.get('terminal_output', 'Unknown error'), "timestamp": timestamp}
            ]

        result['terminal_output'] = terminal_entries
        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        return jsonify({
            'success': False,
            'error': str(e),
            'terminal_output': [{
                "type": "error",
                "text": f"Error: {str(e)}",
                "timestamp": timestamp
            }]
        }), 500


@app.route('/api/generate_mir_at_pass', methods=['POST'])
def generate_mir_at_pass_endpoint():
    """
    Generates MIR snapshot after a specific pass
    """
    try:
        data = request.get_json()
        ir_code = data.get('ir_code', '')
        llc_path = data.get('llc_path', 'llc')
        arch = data.get('arch', 'amdgcn')
        mcpu = data.get('mcpu', 'gfx1101')
        pass_id = data.get('pass_id', 'finalize-isel')

        if not ir_code:
            timestamp = datetime.datetime.now().strftime("%H:%M:%S")
            return jsonify({
                'success': False,
                'error': 'No IR code provided',
                'terminal_output': [{
                    "type": "error",
                    "text": "✗ No IR code provided",
                    "timestamp": timestamp
                }]
            }), 400

        result = generate_mir_at_pass(llc_path, arch, mcpu, ir_code, pass_id)

        # Convert terminal_output string to structured format with full details
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        if result.get('success'):
            line_count = result.get('line_count', 0)
            terminal_entries = [
                {"type": "command", "text": f"{llc_path} -stop-after={pass_id} -march={arch} -mcpu={mcpu} input.ll -o -", "timestamp": timestamp},
                {"type": "success", "text": f"Generated {line_count} lines of MIR after '{pass_id}' pass", "timestamp": timestamp}
            ]
        else:
            error_msg = result.get('error', 'Unknown error')
            terminal_entries = [
                {"type": "command", "text": f"{llc_path} -stop-after={pass_id} -march={arch} -mcpu={mcpu} input.ll -o -", "timestamp": timestamp},
                {"type": "error", "text": f"Error: {error_msg}", "timestamp": timestamp}
            ]

        result['terminal_output'] = terminal_entries
        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        return jsonify({
            'success': False,
            'error': str(e),
            'terminal_output': [{
                "type": "error",
                "text": f"✗ Error: {str(e)}",
                "timestamp": timestamp
            }]
        }), 500


if __name__ == '__main__':
    # Only kill port on initial startup, not on Flask reloader restart
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        kill_port_8080()
    print('DagLens server starting on http://localhost:8080')
    app.run(host='0.0.0.0', port=8080, debug=True)
