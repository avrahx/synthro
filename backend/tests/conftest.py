"""
conftest.py — Pytest session configuration for Synthro backend tests.

Sets PYTHONPATH so 'from app.xxx import ...' resolves correctly
whether pytest is run from backend/ or from the repo root.
"""

import sys
import pathlib

# Ensure the backend root (containing the 'app' package) is on sys.path
_ROOT = pathlib.Path(__file__).parent.parent  # .../backend/
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
