"""Course API package.

Replaces the former single-file ``courses.py``. Public surface unchanged:
``app.main`` still does ``from app.api import courses`` and mounts
``courses.router``.

Route-ordering matters
----------------------
FastAPI matches routes in the order they're registered. ``/courses/{course_id}``
is a single-segment catch-all, so the static paths
(``/courses/suggestions``, ``/courses/generate-plan``,
``/courses/test-connection``, ``/courses/test-local-connection``,
``/courses/local-models``) MUST be included **before** the
:mod:`.courses` router that owns ``/courses/{course_id}``. The include order
below preserves exactly the order the original single file declared its
routes in.

Sub-modules
-----------
* :mod:`._shared`    — shared models, the service dependency, error mapper.
* :mod:`.generation` — suggestions, generate-plan, test-connection.
* :mod:`.local_llm`  — local-LLM connection test + model list.
* :mod:`.courses`    — get course, enroll, my-courses.
* :mod:`.levels`     — generate level content, validate, complete.
"""

from fastapi import APIRouter

from . import courses as _courses
from . import generation as _generation
from . import levels as _levels
from . import local_llm as _local_llm

router = APIRouter()

# Static-path routers first so their exact paths win over /courses/{course_id}.
router.include_router(_generation.router)
router.include_router(_local_llm.router)
# Dynamic /courses/{course_id}/... routers last.
router.include_router(_levels.router)
router.include_router(_courses.router)

__all__ = ["router"]
