"""Builds every page of the student site from tools/*.template.html and the shared partials.

  /            tools/index.template.html   (inlines the finished wordmark so the logo shows without JS)
  /about/      tools/about.template.html
  /join/       tools/join.template.html     (students who build + investors, one page)
  /support/    tools/doc.template.html      body = the page's existing <div class="policy">
  /privacy/    tools/doc.template.html      body = the page's existing <div class="policy">

Support and privacy keep their text where it already lives: the privacy policy is republished
from the app repo's legal/PRIVACY_POLICY.md, so this script only re-wraps whatever is inside
<div class="policy"> (or <article class="wrap policy"> after a first run) in the new layout.

Run from the repo root: python3 tools/build_pages.py
"""
import json, re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
tools = root / "tools"
# Region-less App Store links redirect to /us/, where Klera is not listed ("not available in your
# country"). Default to a European storefront; site.js swaps in the visitor's own European store.
STORE = "https://apps.apple.com/gb/app/kleraai/id6826322672"

def part(name):
    return (tools / f"{name}.partial.html").read_text()

def wordmark():
    data = json.loads((root / "assets/data/klera-wordmark.json").read_text())
    def d(stroke):
        pts = list(zip(stroke["x"], stroke["y"]))
        keep = pts[::2] + ([pts[-1]] if (len(pts) - 1) % 2 else [])
        return "".join(f"{'L' if i else 'M'}{x:.1f} {y:.1f}" for i, (x, y) in enumerate(keep))
    return d(data["strokes"][0]), d(data["strokes"][1])

def render(template, *, path, title, desc, current=None, extra=None):
    p = "../" * path.count("/")
    out = template
    out = out.replace("{{HEAD}}", part("head"))
    out = out.replace("{{ICONS}}", part("icons"))
    out = out.replace("{{NAV}}", part("nav"))
    out = out.replace("{{FOOTER}}", part("footer"))
    out = re.sub(r"\{\{STORE_BTN:(\w+)\}\}", lambda m: part("store").replace("{{WHERE}}", m.group(1)), out)
    for key, val in (extra or {}).items():
        out = out.replace("{{" + key + "}}", val)
    out = (out.replace("{{TITLE}}", title).replace("{{DESC}}", desc)
              .replace("{{PATH}}", path).replace("{{STORE}}", STORE).replace("{{P}}", p))
    for page in ("ABOUT", "JOIN"):
        out = out.replace("{{CUR_" + page + "}}", ' aria-current="page"' if current == page else "")
    left = re.findall(r"\{\{\w+(?::\w+)?\}\}", out)
    assert not left, left
    target = root / path / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(out)
    print(f"/{path:<10} {len(out):>7} bytes")

def policy_body(path):
    html = (root / path / "index.html").read_text()
    m = (re.search(r'<article class="wrap policy">\n?(.*?)\n?  </article>', html, re.S)
         or re.search(r'<div class="policy">\n?(.*?)\n?    </div>\n  </section>', html, re.S))
    assert m, f"no policy body in {path}"
    return m.group(1)

tpl = lambda name: (tools / f"{name}.template.html").read_text()
wm0, wm1 = wordmark()

render(tpl("index"), path="", extra={"WM0": wm0, "WM1": wm1},
       title="Klera: the AI tutor that works on your handwriting",
       desc="Write a maths or science problem on your iPad. Klera watches how you solve it and helps only as much as you need: hints, mistakes, next steps and full solutions, written by hand. Free on the App Store.")
render(tpl("about"), path="about/", current="ABOUT",
       title="About Klera",
       desc="Klera is built by two Bocconi students who wanted a tutor that sits next to you and watches the pen.")
render(tpl("join"), path="join/", current="JOIN",
       title="Work with Klera",
       desc="Students who love building, and investors who back education and AI: come and talk to the Klera team.")
render(tpl("doc"), path="support/", title="Klera support",
       desc="Help with Klera: getting started, common problems and deleting your account.",
       extra={"KICKER": "Help", "H1": "Support", "BODY": policy_body("support")})
render(tpl("doc"), path="privacy/", title="Klera privacy policy",
       desc="What Klera collects, why, and your choices.",
       extra={"KICKER": "Legal", "H1": "Privacy policy", "BODY": policy_body("privacy")})
