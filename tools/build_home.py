"""Builds index.html from tools/index.template.html.

Inlines the finished wordmark path (so the logo shows without JavaScript), the early-access
form (one copy, shared with nothing else now that the home page is the student page) and the
footer. Run from the repo root: python3 tools/build_home.py
"""
import json, re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
tpl = (root / "tools/index.template.html").read_text()
data = json.loads((root / "assets/data/klera-wordmark.json").read_text())

def d(stroke):
    pts = list(zip(stroke["x"], stroke["y"]))
    keep = pts[::2] + ([pts[-1]] if (len(pts) - 1) % 2 else [])
    return "".join(f"{'L' if i else 'M'}{x:.1f} {y:.1f}" for i, (x, y) in enumerate(keep))

form = (root / "tools/early-access.partial.html").read_text()
footer = (root / "tools/footer.partial.html").read_text().replace("{{P}}", "")
out = (tpl.replace("{{WM0}}", d(data["strokes"][0]))
          .replace("{{WM1}}", d(data["strokes"][1]))
          .replace("{{FORM}}", form.replace("{{P}}", ""))
          .replace("{{FOOTER}}", footer))
assert "{{" not in out, re.findall(r"\{\{\w+\}\}", out)
(root / "index.html").write_text(out)
print("index.html", len(out), "bytes")
