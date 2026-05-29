"""The two public generators: course plan and level content.

Why this module exists separately
---------------------------------
These are the user-facing entry points. Each one: guards the input, calls the
LLM via the tool-calling loop (:mod:`.tool_calls`), validates the output for
prompt-injection leakage, and parses the JSON into typed models.

generate_course_plan flow
--------------------------
1. Run the topic through the prompt guard (blocks/sanitizes injection).
2. Validate the API key format (skipped for the local provider).
3. Call the LLM with the course-plan system prompt and the topic wrapped in
   ``<user_topic>`` delimiters.
4. Reject empty responses or responses missing ``levels``.
5. Validate the output isn't leaking the system prompt.
6. Parse into a ``CoursePlan`` and return it with the token usage.

generate_level_content flow
---------------------------
Same shape, but the prompt is templated with the course/level context and the
result is parsed into ``TheorySection`` + ``PracticalSection`` (including the
optional ``CircuitBlueprint``).
"""

import time
from app.core.logger import enrich_context, get_logger
from app.models.course import (
    CircuitBlueprint,
    CoursePlan,
    Difficulty,
    LevelOutline,
    PracticalSection,
    TheorySection,
)
from app.services.prompt_guard import get_prompt_guard

from .prompts import COURSE_PLAN_SYSTEM_PROMPT, LEVEL_CONTENT_SYSTEM_PROMPT

logger = get_logger()


class GenerationMixin:
    """Course-plan and level-content generators.

    Relies on the host class providing ``self._get_provider``,
    ``self._validate_api_key``, and ``self._call_with_tools``.
    """

    async def generate_course_plan(
        self,
        topic: str,
        provider_id: str,
        api_key: str,
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
        base_url: str | None = None,
        bridge_token: str | None = None,
    ) -> tuple[CoursePlan, int]:
        """Generate a course plan using user's API key.

        Args:
            topic: The course topic
            provider_id: LLM provider ID (e.g., 'openai', 'anthropic', 'local')
            api_key: User's API key (used only for this request)
            model: Model to use
            temperature: Temperature setting
            max_tokens: Max tokens for response
            base_url: Tunnel URL for local LLM
            bridge_token: Bridge token for local LLM

        Returns:
            Tuple of (CoursePlan, token_usage)
        """
        llm_start = time.perf_counter()
        enrich_context(
            operation="generate_course_plan",
            course_topic=topic,
            llm_provider=provider_id,
            llm_model=model,
        )

        # Process input through prompt guard
        prompt_guard = get_prompt_guard()
        guard_result = prompt_guard.process_input(topic)

        if not guard_result.is_allowed:
            logger.warning(f"Topic blocked by prompt guard: {guard_result.blocked_reason}")
            raise ValueError(f"Invalid topic: {guard_result.blocked_reason}")

        # Use sanitized topic
        safe_topic = guard_result.sanitized_input or topic

        # Log warnings if any
        if guard_result.warnings:
            logger.info(f"Prompt guard warnings for topic: {guard_result.warnings}")

        # Validate API key format (skip for local provider)
        if provider_id != "local":
            self._validate_api_key(provider_id, api_key)

        provider = self._get_provider(provider_id)
        system_prompt = COURSE_PLAN_SYSTEM_PROMPT
        # Wrap user input with protective delimiters
        user_prompt = f"Create a comprehensive course plan for: <user_topic>{safe_topic}</user_topic>"

        result = await self._call_with_tools(
            provider, api_key, system_prompt, user_prompt, model, temperature, max_tokens,
            base_url=base_url, bridge_token=bridge_token,
        )

        content = result["content"]
        token_usage = result["token_usage"]

        # Validate response content
        if not content:
            raise ValueError("LLM returned empty response. Please try again or use a different model.")

        if "levels" not in content or not content["levels"]:
            raise ValueError(f"LLM response missing 'levels' field. Got: {list(content.keys()) if content else 'None'}")

        # Validate output for potential information leakage
        output_validation = prompt_guard.validate_output(content, output_type="course_plan")
        if not output_validation.is_valid:
            logger.warning(f"Output validation failed - leaked content: {output_validation.leaked_content}")
            raise ValueError("Generated content failed security validation. Please try again.")

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

        llm_duration = (time.perf_counter() - llm_start) * 1000
        enrich_context(
            llm_latency_ms=round(llm_duration, 2),
            llm_tokens_used=token_usage,
            llm_tool_calls_count=result.get("tool_calls_count", 0),
            course_levels_count=len(levels),
            course_difficulty=content["difficulty"],
        )

        return course_plan, token_usage

    async def generate_level_content(
        self,
        course_plan: CoursePlan,
        level_number: int,
        provider_id: str,
        api_key: str,
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
        base_url: str | None = None,
        bridge_token: str | None = None,
    ) -> tuple[TheorySection, PracticalSection, int]:
        """Generate content for a specific level using user's API key.

        Args:
            course_plan: The course plan
            level_number: The level number to generate
            provider_id: LLM provider ID
            api_key: User's API key
            model: Model to use
            temperature: Temperature setting
            max_tokens: Max tokens for response
            base_url: Tunnel URL for local LLM
            bridge_token: Bridge token for local LLM

        Returns:
            Tuple of (TheorySection, PracticalSection, token_usage)
        """
        llm_start = time.perf_counter()
        enrich_context(
            operation="generate_level_content",
            course_topic=course_plan.topic,
            level_number=level_number,
            total_levels=len(course_plan.levels),
            llm_provider=provider_id,
            llm_model=model,
        )

        # Get prompt guard for output validation
        prompt_guard = get_prompt_guard()

        # Validate API key format (skip for local provider)
        if provider_id != "local":
            self._validate_api_key(provider_id, api_key)

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
            topic=course_plan.topic,
            course_title=course_plan.title,
            level_number=level_number,
            total_levels=len(course_plan.levels),
            level_title=level_outline.title,
            level_description=level_outline.description,
            previous_levels="; ".join(previous_levels) if previous_levels else "None",
        )
        user_prompt = f"Generate detailed content for Level {level_number}: {level_outline.title}"

        provider = self._get_provider(provider_id)
        result = await self._call_with_tools(
            provider, api_key, system_prompt, user_prompt, model, temperature, max_tokens,
            base_url=base_url, bridge_token=bridge_token,
        )

        content = result["content"]
        token_usage = result["token_usage"]

        # Validate output for potential information leakage
        output_validation = prompt_guard.validate_output(content, output_type="level_content")
        if not output_validation.is_valid:
            logger.warning(f"Level content output validation failed - leaked content: {output_validation.leaked_content}")
            raise ValueError("Generated level content failed security validation. Please try again.")

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

        # Parse circuit blueprint if present
        circuit_blueprint = None
        if "circuitBlueprint" in practical_data:
            blueprint_data = practical_data["circuitBlueprint"]
            circuit_blueprint = CircuitBlueprint(
                components=blueprint_data.get("components", []),
                wires=blueprint_data.get("wires", []),
            )

        practical = PracticalSection(
            componentsNeeded=practical_data["componentsNeeded"],
            steps=practical_data["steps"],
            expectedBehavior=practical_data["expectedBehavior"],
            validationCriteria=practical_data["validationCriteria"],
            commonMistakes=practical_data.get("commonMistakes", []),
            circuitBlueprint=circuit_blueprint,
        )

        llm_duration = (time.perf_counter() - llm_start) * 1000
        enrich_context(
            llm_latency_ms=round(llm_duration, 2),
            llm_tokens_used=token_usage,
            llm_tool_calls_count=result.get("tool_calls_count", 0),
            level_has_blueprint=circuit_blueprint is not None,
        )

        return theory, practical, token_usage
