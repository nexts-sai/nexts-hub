"""Thin bridge to OpenAdapt Flow 2.0.0; stdin carries data, never shell code."""
import importlib.metadata
import json
import sys
import threading
from pathlib import Path


def main():
    request = json.loads(sys.stdin.readline())
    version = importlib.metadata.version("openadapt-flow")
    if version != "2.0.0":
        raise RuntimeError(f"Expected openadapt-flow 2.0.0, found {version}")
    if request["operation"] == "status":
        import playwright.sync_api
        print(json.dumps({"flow_version": version, "python": sys.version.split()[0]}))
        return
    if request["operation"] == "record":
        from openadapt_flow.interactive_recorder import record_interactive

        stop = threading.Event()

        def read_stop():
            # EOF means the host went away: finish and flush the recording.
            sys.stdin.readline()
            stop.set()

        threading.Thread(target=read_stop, daemon=True).start()
        record_interactive(
            request["url"], Path(request["out"]),
            param_fields=tuple(request["param_fields"]),
            secret_fields=tuple(request["secret_fields"]),
            stop_when=stop.is_set, surface="web",
        )
        return
    # Use the upstream CLI for compilation, replay and official emitters.
    from openadapt_flow.__main__ import main as flow_main
    sys.argv = ["openadapt-flow", *request["argv"]]
    result = flow_main()
    raise SystemExit(result or 0)


if __name__ == "__main__":
    main()
