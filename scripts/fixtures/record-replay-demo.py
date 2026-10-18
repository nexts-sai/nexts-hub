"""Synthetic local browser fixture for the opt-in integration test."""
import contextlib
import json
import sys
from pathlib import Path

from openadapt_flow.demo_driver import record_triage_demo
from openadapt_flow.mockmed.server import serve

url, stop = serve(port=0)
try:
    with contextlib.redirect_stdout(sys.stderr):
        record_triage_demo(url, Path(sys.argv[1]), note_text="Synthetic fixture note", param_name="note")
    print(json.dumps({"url": url}), flush=True)
    sys.stdin.readline()
finally:
    stop()
