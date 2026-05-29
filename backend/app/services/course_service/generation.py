"""Course-plan and level-content generation (LLM-backed).

Why this module exists separately
---------------------------------
These are the two methods that call the LLM and persist what comes back.
They are the heavy, network-touching part of the course service, so they
live in their own mixin.

generate_course_plan flow
--------------------------
1. Ask ``llm_service`` to produce a plan for ``topic`` using the *user's* API
   key (we never use a server key — see ``docs`` / the API layer).
2. Stamp the creator's participant id onto the plan.
3. Save it; the repository returns the new id which we attach back.

get_level_content flow (with caching + retry)
---------------------------------------------
1. If a fully-generated record already exists for this (course, level), return
   it — generation is expensive, so we never redo it.
2. Otherwise create (or reset to GENERATING) a level-content record.
3. Call the LLM to produce theory + practical content.
4. On success, save the content and return the refreshed record.
5. On failure, flip the record to FAILED with the error message and re-raise,
   so the caller can surface it and a later retry can pick up from GENERATING.
"""

from app.core.logger import enrich_context, get_logger
from app.models.course import CoursePlan, GenerationState, LevelContent
from app.services.llm_service import llm_service

logger = get_logger()


class GenerationMixin:
    """LLM-backed course-plan and level-content generation.

    Relies on the host class providing ``self.course_plan_repo`` and
    ``self.level_content_repo``.
    """

    async def generate_course_plan(
        self,
        topic: str,
        participant_id: str | None = None,
        provider_id: str = "openai",
        api_key: str = "",
        model: str = "gpt-4o",
        temperature: float = 0.7,
        max_tokens: int = 4000,
        base_url: str | None = None,
        bridge_token: str | None = None,
        location: str = "global",
    ) -> CoursePlan:
        """Generate a new course plan for the given topic using user's API key.

        Args:
            topic: The course topic
            participant_id: Optional participant ID
            provider_id: LLM provider ID
            api_key: User's API key (used only for this request)
            model: Model to use
            temperature: Temperature setting
            max_tokens: Max tokens for response
            base_url: Tunnel URL for local LLM
            bridge_token: Bridge token for local LLM
            location: Vertex AI location/region (Google provider)
        """
        enrich_context(operation="create_course", course_topic=topic)
        logger.info(f"Generating course plan for topic: {topic} using {provider_id}/{model}")

        # Generate plan using user's API key
        course_plan, token_usage = await llm_service.generate_course_plan(
            topic=topic,
            provider_id=provider_id,
            api_key=api_key,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            base_url=base_url,
            bridge_token=bridge_token,
            location=location,
        )
        course_plan.creator_participant_id = participant_id

        # Save to database
        plan_id = await self.course_plan_repo.create(course_plan)
        course_plan.id = plan_id

        enrich_context(
            course_id=str(plan_id),
            course_levels_count=len(course_plan.levels),
            course_difficulty=course_plan.difficulty.value,
        )
        logger.info(
            f"Created course plan {plan_id} with {len(course_plan.levels)} levels, "
            f"used {token_usage} tokens"
        )

        return course_plan

    async def get_level_content(
        self,
        course_plan_id: str,
        level_number: int,
        provider_id: str = "openai",
        api_key: str = "",
        model: str = "gpt-4o",
        temperature: float = 0.7,
        max_tokens: int = 4000,
        base_url: str | None = None,
        bridge_token: str | None = None,
        location: str = "global",
    ) -> LevelContent | None:
        """Get level content, generating if needed using user's API key."""
        course_plan = await self.course_plan_repo.get_by_id(course_plan_id)
        if not course_plan:
            return None

        # Check if content record exists
        content = await self.level_content_repo.get_by_course_and_level(
            course_plan_id, level_number
        )

        # Return cached content if it's already generated successfully
        if content and content.generation_state == GenerationState.GENERATED:
            logger.info(f"Returning cached level {level_number} content for course {course_plan_id}")
            return content

        # Create or update level content record
        if not content:
            content = LevelContent(
                coursePlanId=course_plan_id,
                levelNumber=level_number,
                generationState=GenerationState.GENERATING,
            )
            content_id = await self.level_content_repo.create(content)
            content.id = content_id
        else:
            # Only regenerate if failed or not completed
            await self.level_content_repo.update_generation_state(
                content.id,  # type: ignore
                GenerationState.GENERATING,
            )

        # Generate content using LLM with user's API key
        try:
            theory, practical, token_usage = await llm_service.generate_level_content(
                course_plan=course_plan,
                level_number=level_number,
                provider_id=provider_id,
                api_key=api_key,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                base_url=base_url,
                bridge_token=bridge_token,
                location=location,
            )

            # Save content
            await self.level_content_repo.set_content(
                content.id,  # type: ignore
                theory.model_dump(by_alias=True),
                practical.model_dump(by_alias=True),
                token_usage,
            )

            # Refresh and return
            return await self.level_content_repo.get_by_course_and_level(
                course_plan_id, level_number
            )

        except Exception as e:
            logger.error(f"Failed to generate level content: {e}")
            await self.level_content_repo.update_generation_state(
                content.id,  # type: ignore
                GenerationState.FAILED,
                error_message=str(e),
            )
            raise
