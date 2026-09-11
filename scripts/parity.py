"""Generate parity fixtures from the Python original.

Runs yield_hunter.scan_symbol against the vendored chain snapshots under
public/data/ (network patched out) and writes the expected rows to
src/lib/__fixtures__/<SYM>.expected.json. The vitest suite then asserts the
TypeScript port produces the same rows. Re-run after re-vendoring data.

    python3 scripts/parity.py            # all symbols in public/data/index.json
"""
import datetime as dt
import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "public", "data")
FIX = os.path.join(ROOT, "src", "lib", "__fixtures__")
YH = os.path.expanduser("~/Claude/option_analysis/scripts/yield_hunter.py")

spec = importlib.util.spec_from_file_location("yield_hunter", YH)
yh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(yh)


def local_get(url, timeout=25):
    sym = url.rsplit("/", 1)[1].split(".")[0]
    with open(os.path.join(DATA, sym + ".json")) as f:
        return json.load(f)


yh._get = local_get
os.makedirs(FIX, exist_ok=True)
with open(os.path.join(DATA, "index.json")) as f:
    index = json.load(f)
for entry in index["symbols"]:
    sym = entry["symbol"]
    # Same "as of" convention as the app: the snapshot's own trade date.
    today = dt.date.fromisoformat(entry["last_trade_time"][:10])
    res = yh.scan_symbol(sym, today)
    out = {"symbol": sym, "as_of": today.isoformat(), "rules_version": yh.RULES_VERSION,
           "result": res}
    with open(os.path.join(FIX, sym + ".expected.json"), "w") as f:
        json.dump(out, f, indent=1, default=str)
    n = len(res["rows"]) if res else 0
    print("%s: %d rows as of %s" % (sym, n, today))
