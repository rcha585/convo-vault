import json
import os
import sys

from pypdf import PdfReader


def main():
    source, output_dir = sys.argv[1], sys.argv[2]
    os.makedirs(output_dir, exist_ok=True)
    reader = PdfReader(source)
    pages = []
    markdown = [f"# {os.path.basename(source)}", ""]
    for number, page in enumerate(reader.pages, 1):
        text = page.extract_text() or ""
        pages.append({"page": number, "characters": len(text), "text": text})
        markdown.extend([f"## Page {number}", "", text, ""])
    with open(os.path.join(output_dir, "document.md"), "w", encoding="utf-8") as handle:
        handle.write("\n".join(markdown))
    with open(os.path.join(output_dir, "document.json"), "w", encoding="utf-8") as handle:
        json.dump({"engine": "pypdf", "pages": pages}, handle, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
