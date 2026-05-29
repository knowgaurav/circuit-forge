"""Course service package.

Replaces the former single-file ``course_service.py``. Public surface
unchanged: callers still write
``from app.services.course_service import CourseService``.

Sub-modules
-----------
* :mod:`.suggestions` — static ``TOPIC_SUGGESTIONS`` list.
* :mod:`.generation`  — LLM-backed course-plan / level-content generation.
* :mod:`.enrollment`  — enroll, list courses, complete levels.
* :mod:`.validation`  — validate a circuit against level requirements.
* :mod:`.service`     — the ``CourseService`` class that ties them together.

``TOPIC_SUGGESTIONS`` is re-exported too, since it was importable from the
original module.
"""

from .service import CourseService
from .suggestions import TOPIC_SUGGESTIONS

__all__ = ["CourseService", "TOPIC_SUGGESTIONS"]
