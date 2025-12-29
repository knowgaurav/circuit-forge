"""LLM Service for generating course content using OpenAI."""

import json
import logging
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings
from app.models.circuit import ComponentType
from app.models.course import (
    CoursePlan,
    Difficulty,
    LevelContent,
    LevelOutline,
    PracticalSection,
    TheorySection,
)

logger = logging.getLogger(__name__)


# Available components for the LLM to use
AVAILABLE_COMPONENTS = [ct.value for ct in ComponentType]


COURSE_PLAN_SYSTEM_PROMPT = """You are an expert electronics educator creating circuit design courses.
You will generate a structured course plan for building electronic circuits.

Available components in CircuitForge:
{components}

Rules:
1. Create 8-15 levels that progress from basic to advanced
2. Each level should build on previous knowledge
3. Only use components from the available list
4. Start with fundamentals before complex circuits
5. The final levels should result in a working version of the requested project

Output must be valid JSON matching this schema:
{{
  "title": "Course title",
  "description": "Detailed course description (100-500 chars)",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "estimatedHours": number (1-50),
  "levels": [
    {{
      "levelNumber": 1,
      "title": "Level title",
      "description": "What student will learn and build (50-200 chars)"
    }}
  ]
}}"""


LEVEL_CONTENT_SYSTEM_PROMPT = """You are an expert electronics educator creating detailed lesson content.
You will generate content for a specific level in a circuit design course.

Available components in CircuitForge:
{components}

Course context:
- Topic: {topic}
- Course title: {course_title}
- This is Level {level_number} of {total_levels}
- Level title: {level_title}
- Level description: {level_description}
- Previous levels covered: {previous_levels}

Rules:
1. Theory section should explain concepts clearly for beginners
2. Practical section should have step-by-step instructions
3. Only use components from the available list
4. Validation criteria should be specific and testable
5. Include 2-4 learning objectives
6. Include real-world examples to make concepts relatable

Output must be valid JSON matching this schema:
{{
  "theory": {{
    "objectives": ["objective 1", "objective 2"],
    "conceptExplanation": "Detailed explanation (200+ chars)",
    "realWorldExamples": ["example 1"],
    "keyTerms": [{{"term": "name", "definition": "meaning"}}]
  }},
  "practical": {{
    "componentsNeeded": [{{"type": "COMPONENT_TYPE", "count": 1}}],
    "steps": [{{"stepNumber": 1, "instruction": "Do this...", "hint": "optional"}}],
    "expectedBehavior": "What should happen when circuit works",
    "validationCriteria": {{
      "requiredComponents": [{{"type": "COMPONENT_TYPE", "minCount": 1}}],
      "requiredConnections": [{{"from": "TYPE:index:pin", "to": "TYPE:index:pin"}}]
    }},
    "commonMistakes": ["mistake 1"]
  }}
}}"""


class LLMService:
    """Service for interacting with OpenAI-compatible APIs (including ohmygpt.com)."""

    def __init__(self) -> None:
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.max_tokens = settings.openai_max_tokens
        self.temperature = settings.openai_temperature
        self.base_url = settings.openai_base_url

    async def _call_openai(
        self,
        system_prompt: str,
        user_prompt: str,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """Make a call to OpenAI API with retry logic."""
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "response_format": {"type": "json_object"},
        }

        last_error: Optional[Exception] = None

        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        self.base_url,
                        headers=headers,
                        json=payload,
                    )
                    response.raise_for_status()
                    result = response.json()

                    content = result["choices"][0]["message"]["content"]
                    parsed = json.loads(content)

                    # Log token usage
                    usage = result.get("usage", {})
                    logger.info(
                        f"OpenAI API call: {usage.get('total_tokens', 0)} tokens used"
                    )

                    return {
                        "content": parsed,
                        "token_usage": usage.get("total_tokens", 0),
                    }

            except httpx.HTTPStatusError as e:
                last_error = e
                logger.warning(f"OpenAI API error (attempt {attempt + 1}): {e}")
                if e.response.status_code == 429:
                    # Rate limited, wait longer
                    import asyncio
                    await asyncio.sleep(2 ** attempt)
                elif e.response.status_code >= 500:
                    # Server error, retry
                    import asyncio
                    await asyncio.sleep(1)
                else:
                    raise

            except json.JSONDecodeError as e:
                last_error = e
                logger.warning(f"JSON parse error (attempt {attempt + 1}): {e}")

            except Exception as e:
                last_error = e
                logger.warning(f"Unexpected error (attempt {attempt + 1}): {e}")

        raise RuntimeError(f"Failed after {max_retries} attempts: {last_error}")

    async def generate_course_plan(self, topic: str) -> tuple[CoursePlan, int]:
        """Generate a course plan for the given topic.
        
        Returns:
            Tuple of (CoursePlan, token_usage)
        """
        system_prompt = COURSE_PLAN_SYSTEM_PROMPT.format(
            components=", ".join(AVAILABLE_COMPONENTS)
        )
        user_prompt = f"Create a comprehensive course plan for: {topic}"

        result = await self._call_openai(system_prompt, user_prompt)
        content = result["content"]
        token_usage = result["token_usage"]

        # Parse and validate the response
        levels = [
            LevelOutline(
                levelNumber=level["levelNumber"],
                title=level["title"],
                description=level["description"],
            )
            for level in content["levels"]
        ]

        course_plan = CoursePlan(
            topic=topic,
            title=content["title"],
            description=content["description"],
            difficulty=Difficulty(content["difficulty"]),
            estimatedHours=content["estimatedHours"],
            levels=levels,
        )

        return course_plan, token_usage

    async def generate_level_content(
        self,
        course_plan: CoursePlan,
        level_number: int,
    ) -> tuple[TheorySection, PracticalSection, int]:
        """Generate content for a specific level.
        
        Returns:
            Tuple of (TheorySection, PracticalSection, token_usage)
        """
        # Find the level outline
        level_outline = next(
            (l for l in course_plan.levels if l.level_number == level_number),
            None,
        )
        if not level_outline:
            raise ValueError(f"Level {level_number} not found in course plan")

        # Get previous levels summary
        previous_levels = [
            f"Level {l.level_number}: {l.title}"
            for l in course_plan.levels
            if l.level_number < level_number
        ]

        system_prompt = LEVEL_CONTENT_SYSTEM_PROMPT.format(
            components=", ".join(AVAILABLE_COMPONENTS),
            topic=course_plan.topic,
            course_title=course_plan.title,
            level_number=level_number,
            total_levels=len(course_plan.levels),
            level_title=level_outline.title,
            level_description=level_outline.description,
            previous_levels="; ".join(previous_levels) if previous_levels else "None",
        )
        user_prompt = f"Generate detailed content for Level {level_number}: {level_outline.title}"

        result = await self._call_openai(system_prompt, user_prompt)
        content = result["content"]
        token_usage = result["token_usage"]

        # Parse theory section
        theory_data = content["theory"]
        theory = TheorySection(
            objectives=theory_data["objectives"],
            conceptExplanation=theory_data["conceptExplanation"],
            realWorldExamples=theory_data["realWorldExamples"],
            keyTerms=theory_data.get("keyTerms", []),
        )

        # Parse practical section
        practical_data = content["practical"]
        practical = PracticalSection(
            componentsNeeded=practical_data["componentsNeeded"],
            steps=practical_data["steps"],
            expectedBehavior=practical_data["expectedBehavior"],
            validationCriteria=practical_data["validationCriteria"],
            commonMistakes=practical_data.get("commonMistakes", []),
        )

        return theory, practical, token_usage


# Singleton instance
llm_service = LLMService()
