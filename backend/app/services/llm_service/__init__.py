"""LLM service package.

Replaces the former single-file ``llm_service.py``. Public surface unchanged:
callers still write ``from app.services.llm_service import LLMService,
llm_service``.

Sub-modules
-----------
* :mod:`.prompts`         — system prompts and the component pin reference.
* :mod:`.tool_calls`      — the tool-calling loop and the no-tools fallback.
* :mod:`.blueprint_fixer` — best-effort auto-repair of failed blueprints.
* :mod:`.generation`      — ``generate_course_plan`` / ``generate_level_content``.
* :mod:`.service`         — the ``LLMService`` class and ``llm_service`` singleton.
"""

from .service import LLMService, llm_service

__all__ = ["LLMService", "llm_service"]
