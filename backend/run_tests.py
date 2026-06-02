#!/usr/bin/env python
"""
Venue Simulation Tool — Formatted Unit Test Runner
====================================================
Run from the backend/ directory:

    python run_tests.py

Each module prints a clear header, per-test input/expected data, and a
pass/fail result with timing.  A summary table is printed at the end.
"""

import io
import os
import sys
import time
import unittest
from datetime import datetime

# ── Django setup ─────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402
django.setup()

# Allow Django's test client to send requests to 'testserver'
from django.conf import settings as _dj_settings  # noqa: E402
_dj_settings.ALLOWED_HOSTS = ["*"]

# Silence Django's request logger so "Bad Request: /api/..." lines don't appear
import logging as _logging  # noqa: E402
_logging.disable(_logging.CRITICAL)

# ── ANSI colours ─────────────────────────────────────────────────────────────

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
RESET  = "\033[0m"

W = 74   # total box width

# ── Box-drawing helpers ───────────────────────────────────────────────────────

def _box_top(title=""):
    inner = W - 2
    if title:
        pad   = inner - len(title) - 2
        left  = pad // 2
        right = pad - left
        return f"╔{'═' * (left + 1)}{title}{'═' * (right + 1)}╗"
    return f"╔{'═' * inner}╗"

def _box_row(text="", fill="║"):
    inner = W - 2
    return f"{fill}{(' ' + text):<{inner}}{fill}"

def _box_sep():
    return f"╠{'═' * (W - 2)}╣"

def _box_bot():
    return f"╚{'═' * (W - 2)}╝"

def _rule(char="━"):
    return f" {char * (W - 2)}"

def _divider(char="─"):
    return f" {char * (W - 2)}"


# ── Custom TestResult ─────────────────────────────────────────────────────────

class VenueTestResult(unittest.TestResult):
    """Captures outcomes per-test and prints formatted lines."""

    def __init__(self):
        super().__init__()
        self.results   = []   # list of (status, test, duration, stdout, err)
        self._start    = 0.0
        self._stdout   = None
        self._old_out  = None

    # ── lifecycle ──────────────────────────────────────────────────────────────

    def startTest(self, test):
        super().startTest(test)
        self._start   = time.perf_counter()
        self._stdout  = io.StringIO()
        self._old_out = sys.stdout
        sys.stdout    = self._stdout

    def _finish(self, outcome, test, err=None):
        duration = time.perf_counter() - self._start
        sys.stdout   = self._old_out
        captured     = self._stdout.getvalue()
        self.results.append((outcome, test, duration, captured, err))
        self._print_result(outcome, test, duration, captured, err)

    def addSuccess(self, test):
        super().addSuccess(test)
        self._finish("PASS", test)

    def addFailure(self, test, err):
        super().addFailure(test, err)
        self._finish("FAIL", test, err)

    def addError(self, test, err):
        super().addError(test, err)
        self._finish("ERROR", test, err)

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        self._finish("SKIP", test)

    # ── formatting ─────────────────────────────────────────────────────────────

    def _print_result(self, outcome, test, duration, captured, err):
        doc  = (test.shortDescription() or "").strip()
        # Parse   "TC-XX | Description"
        if "|" in doc:
            tc_id, desc = [p.strip() for p in doc.split("|", 1)]
        else:
            tc_id = test._testMethodName
            desc  = doc or test._testMethodName

        print(f"\n  {BOLD}{CYAN}[{tc_id}]{RESET}  {desc}")

        # Print captured stdout (indented)
        for line in captured.splitlines():
            if line.strip():
                print(f"  {DIM}{line.strip()}{RESET}")

        # Result line
        if outcome == "PASS":
            mark = f"{GREEN}✓  PASSED{RESET}"
        elif outcome == "SKIP":
            mark = f"{YELLOW}⊘  SKIPPED{RESET}"
        elif outcome == "FAIL":
            mark = f"{RED}✗  FAILED{RESET}"
        else:
            mark = f"{RED}⚡ ERROR{RESET}"

        timing = f"{DIM}[{duration:.3f}s]{RESET}"
        print(f"  {mark:<30} {timing:>20}")

        # Show assertion detail on failure
        if err and outcome in ("FAIL", "ERROR"):
            tb = self._exc_info_to_string(err, test)
            last_line = [l for l in tb.splitlines() if l.strip()][-1]
            print(f"  {RED}  ↳ {last_line.strip()}{RESET}")


# ── Module runner ─────────────────────────────────────────────────────────────

MODULES = [
    ("MODULE 1  ▸  LOGIN / SIGNIN MODULE",             "tests.test_01_auth"),
    ("MODULE 2  ▸  FORGOT PASSWORD / SESSION MGMT",    "tests.test_02_session"),
    ("MODULE 3  ▸  PROJECT MANAGEMENT MODULE",         "tests.test_03_projects"),
    ("MODULE 4  ▸  AI LAYOUT GENERATION MODULE",       "tests.test_04_ai_layout"),
    ("MODULE 5  ▸  FLOOR PLAN IMPORT MODULE",          "tests.test_05_imports"),
    ("MODULE 6  ▸  2D/3D EDITOR AND AV PLANNING",      "tests.test_06_editor_av"),
]


def run_module(label, module_path):
    """Load and run one test module.  Returns (passed, failed, total, duration)."""

    print(f"\n{_rule()}")
    print(f"  {BOLD}{label}{RESET}")
    print(_rule())

    loader = unittest.TestLoader()
    try:
        suite = loader.loadTestsFromName(module_path)
    except Exception as exc:
        print(f"  {RED}⚡ Could not load {module_path}: {exc}{RESET}")
        return 0, 1, 1, 0.0

    result  = VenueTestResult()
    t_start = time.perf_counter()
    suite.run(result)
    elapsed = time.perf_counter() - t_start

    passed = len([r for r in result.results if r[0] == "PASS"])
    failed = len([r for r in result.results if r[0] in ("FAIL", "ERROR")])
    total  = len(result.results)

    colour = GREEN if failed == 0 else RED
    bar    = f"{'─' * 49}"
    print(f"\n  {bar}")
    if failed == 0:
        print(f"  {colour}  Module complete:  {passed}/{total} tests passed  ✓  [{elapsed:.3f}s]{RESET}")
    else:
        print(f"  {colour}  Module complete:  {passed}/{total} passed  ·  {failed} failed  [{elapsed:.3f}s]{RESET}")
    print(f"  {bar}")

    return passed, failed, total, elapsed


# ── Summary table ─────────────────────────────────────────────────────────────

def print_summary(rows, grand_passed, grand_failed, grand_total, grand_elapsed):
    """Print the final summary box."""

    print(f"\n\n{BOLD}{_box_top(' FINAL TEST RESULTS ')}{RESET}")
    header = f"  {'Module':<42} {'Pass':>4}  {'Fail':>4}  {'Total':>5}  Status"
    print(_box_row(header.strip()))
    print(_box_sep())

    for label, passed, failed, total, _ in rows:
        short = label.split("▸")[-1].strip()[:40]
        status_str = f"{GREEN}✓ ALL PASSED{RESET}" if failed == 0 else f"{RED}✗ {failed} FAILED{RESET}"
        line = f"  {short:<42} {passed:>4}  {failed:>4}  {total:>5}  {status_str}"
        print(_box_row(line.strip()))

    print(_box_sep())
    overall = f"{GREEN}✓ ALL TESTS PASSED{RESET}" if grand_failed == 0 else f"{RED}✗ {grand_failed} FAILED{RESET}"
    totals  = f"  {'TOTAL':<42} {grand_passed:>4}  {grand_failed:>4}  {grand_total:>5}  {overall}"
    print(_box_row(totals.strip()))
    print(_box_sep())
    print(_box_row(f"  Total Duration: {grand_elapsed:.3f}s"))
    print(f"{BOLD}{_box_bot()}{RESET}\n")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    now = datetime.now().strftime("%Y-%m-%d   %H:%M:%S")

    print(f"\n{BOLD}{_box_top()}{RESET}")
    print(f"{BOLD}{_box_row('  VENUE SIMULATION TOOL  ▸  UNIT TEST SUITE')}{RESET}")
    print(f"{BOLD}{_box_row(f'  Started: {now}')}{RESET}")
    print(f"{BOLD}{_box_bot()}{RESET}")

    rows          = []
    grand_passed  = 0
    grand_failed  = 0
    grand_total   = 0
    grand_elapsed = 0.0

    for label, module_path in MODULES:
        passed, failed, total, elapsed = run_module(label, module_path)
        rows.append((label, passed, failed, total, elapsed))
        grand_passed  += passed
        grand_failed  += failed
        grand_total   += total
        grand_elapsed += elapsed

    print_summary(rows, grand_passed, grand_failed, grand_total, grand_elapsed)

    sys.exit(0 if grand_failed == 0 else 1)


if __name__ == "__main__":
    main()
