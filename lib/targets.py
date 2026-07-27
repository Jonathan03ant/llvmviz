import subprocess
import re


def get_architectures(llc_path: str):
    """
    Query llc for available target architectures.
    Returns list of dicts: [{"name": "amdgcn", "description": "AMD GCN GPUs"}, ...]
    """
    try:
        result = subprocess.run(
            [llc_path, '--version'],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode != 0:
            return []

        output = result.stdout + result.stderr

        #Find Registered Targets
        in_targets_section = False
        targets = []

        for line in output.split('\n'):
            if 'Registered Targets:' in line:
                in_targets_section = True
                continue
            if in_targets_section:
                match = re.match(r'\s+(\S+)\s+-\s+(.+)', line)
                if match:
                    targets.append({
                        "name": match.group(1),
                        "description": match.group(2)
                    })
                elif line.strip() == '':
                    break

        return targets
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
        print(f"Error getting architectures: {e}")
        return []


def get_cpus(llc_path: str, arch: str):
    """
    Query llc for available CPUs for a given architecture.
    Returns list of dicts: [{"name": "gfx1101", "description":... "
    """
    try:
        result = subprocess.run(
            [llc_path, f'-march={arch}', '-mcpu=help'],
            capture_output=True,
            text=True,
            timeout=5
        )

        output = result.stdout + result.stderr
        cpus = []

        for line in output.split('\n'):
            # Stop when we hit the features section
            if 'Available features' in line:
                break

            match = re.match(r'\s+(\S+)\s+-\s+(.+)', line)
            if match:
                cpus.append({
                    "name": match.group(1),
                    "description": match.group(2)
                })

        return cpus

    except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
        print(f"Error getting CPUs: {e}")
        return []