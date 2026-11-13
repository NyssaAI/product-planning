"""Register bundled plan-product skills with the Hermes Agent plugin runtime."""

from pathlib import Path


def register(ctx) -> None:
    for skill in sorted((Path(__file__).resolve().parent / "skills").glob("*/SKILL.md")):
        ctx.register_skill(skill.parent.name, skill)
