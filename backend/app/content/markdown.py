import re

HEADING = re.compile(r"^#\s+(?P<title>.+?)\s*$")
PREFIX = re.compile(r"^\d+[-_]")


def extract_title(text: str) -> str | None:
    """Возвращает первый заголовок первого уровня, не заглядывая внутрь блоков кода."""
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            return None
        match = HEADING.match(stripped)
        if match:
            return match.group("title")
    return None


def humanize(stem: str) -> str:
    """Превращает имя файла в читаемое название: 01-what-is-python -> What is python."""
    name = PREFIX.sub("", stem).replace("-", " ").replace("_", " ").strip()
    if not name:
        return stem
    return name[0].upper() + name[1:]
