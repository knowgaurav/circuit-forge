"""LLM Service for generating course content using multiple providers."""

import json
import logging
import re
from typing import Any

from app.models.circuit import ComponentType
from app.models.course import (
    CircuitBlueprint,
    CoursePlan,
    Difficulty,
    LevelOutline,
    PracticalSection,
    TheorySection,
)
from app.services.llm_provider_factory import LLMProviderFactory
from app.services.llm_providers import (
    AuthenticationError,
    LLMProviderStrategy,
    LLMRequest,
    LLMResponse,
    ProviderUnavailableError,
    QuotaExceededError,
    RateLimitError,
)
from app.services.llm_tools import TOOL_DEFINITIONS, get_tool_handler

logger = logging.getLogger(__name__)


# Available components for the LLM to use
AVAILABLE_COMPONENTS = [ct.value for ct in ComponentType]


COURSE_PLAN_SYSTEM_PROMPT = """You are an expert electronics educator creating circuit design courses.
You will generate a structured course plan for building electronic circuits.

IMPORTANT: Before creating the course plan, you MUST call the get_available_components tool to see what components are available in CircuitForge.

Rules:
1. Create 8-15 levels that progress from basic to advanced
2. Each level should build on previous knowledge
3. Only use components from the available list (call get_available_components first!)
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

CRITICAL WORKFLOW - YOU MUST FOLLOW THESE STEPS:
1. Call get_available_components to see all available components
2. Call get_component_schema for EACH component type you plan to use
3. Design a COMPLETE circuit where EVERY input pin is connected
4. Call validate_blueprint - if it fails, FIX the errors and validate again
5. Only return the JSON after validation succeeds

CIRCUIT COMPLETENESS RULES:
- Every logic gate input pin MUST be connected to an output
- Every LED/output device input MUST be connected
- Use SWITCH_TOGGLE or CONST_HIGH/LOW for unused inputs
- NO floating inputs allowed - the circuit must be fully functional

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
3. Only use components you've verified with get_component_schema
4. Use EXACT pin names from the component schemas (case sensitive!)
5. Validation criteria should be specific and testable
6. Include 2-4 learning objectives
7. Include real-world examples to make concepts relatable
8. ALWAYS validate your blueprint before returning it

Position Guidelines:
- Canvas is 800x600 pixels
- Place inputs on the left (x: 100-200)
- Place logic gates in the middle (x: 300-500)
- Place outputs on the right (x: 600-700)
- Vertical spacing: 80-100 pixels between components
- Start y positions around 150-200

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
    "commonMistakes": ["mistake 1"],
    "circuitBlueprint": {{
      "components": [
        {{"type": "SWITCH_TOGGLE", "label": "SW1", "position": {{"x": 150, "y": 200}}, "properties": {{}}}},
        {{"type": "LED_RED", "label": "LED1", "position": {{"x": 650, "y": 200}}, "properties": {{}}}}
      ],
      "wires": [
        {{"from": "SW1:OUT", "to": "LED1:IN"}}
      ]
    }}
  }}
}}"""


# Component reference for fallback mode
COMPONENT_PIN_REFERENCE = """
=== COMPONENT PIN REFERENCE (USE EXACT NAMES) ===

Logic Gates:
- AND_2, OR_2, NAND_2, NOR_2, XOR_2: inputs "A", "B" → output "Y"
- NOT, BUFFER: input "A" → output "Y"

Input Devices:
- SWITCH_TOGGLE, SWITCH_PUSH: output "OUT"
- DIP_SWITCH_4: outputs "Q0", "Q1", "Q2", "Q3" (4 independent switches, NO VCC/GND pins!)
- NUMERIC_INPUT: outputs "Q0", "Q1", "Q2", "Q3" (4-bit binary output)
- CLOCK: output "CLK"
- CONST_HIGH: output "OUT" (always HIGH)
- CONST_LOW: output "OUT" (always LOW)

Output Devices:
- LED_RED, LED_GREEN, LED_YELLOW, LED_BLUE: input "IN"
- DISPLAY_7SEG: inputs "A", "B", "C", "D", "E", "F", "G"
- MOTOR_DC: inputs "FWD", "REV"

Flip-Flops:
- D_FLIPFLOP: inputs "D", "CLK" → outputs "Q", "Q'"
- SR_LATCH: inputs "S", "R" → outputs "Q", "Q'"
- JK_FLIPFLOP: inputs "J", "CLK", "K" → outputs "Q", "Q'"

Combinational:
- MUX_2TO1: inputs "A", "B", "S" → output "Y"
- DECODER_2TO4: inputs "A0", "A1" → outputs "Y0", "Y1", "Y2", "Y3"
- ADDER_4BIT: inputs "A0"-"A3", "B0"-"B3" → outputs "S0"-"S3", "Cout"
- COMPARATOR_4BIT: inputs "A0"-"A3", "B0"-"B3" → outputs "A>B", "A=B", "A<B"

Sequential:
- COUNTER_4BIT: input "CLK" → outputs "Q0", "Q1", "Q2", "Q3"
- SHIFT_REGISTER_8BIT: inputs "SI", "CLK" → outputs "Q0"-"Q7"

Power:
- VCC_5V, VCC_3V3: output "VCC"
- GROUND: input "GND" (receives signals, does NOT output)

Passive:
- RESISTOR: input "IN" → output "OUT"
- CAPACITOR: input "IN" → output "OUT"
- DIODE: input "A" → output "K"

Connectors:
- JUNCTION: input "IN" → outputs "OUT1", "OUT2" (splits signal)
- PROBE: input "IN"

=== CRITICAL WIRING RULES ===
1. Each INPUT pin can only have ONE driver (one wire going to it)
2. OUTPUT pins can drive multiple inputs (fan-out is OK)
3. Connect OUTPUT → INPUT only (never OUTPUT → OUTPUT or INPUT → INPUT)
4. Wire format: "LABEL:PIN" (e.g., "SW1:OUT", "AND1:Y", "LED1:IN")
5. GROUND receives signals - connect outputs TO ground, not FROM ground
6. EVERY input pin on logic gates and LEDs MUST be connected - NO floating inputs!
7. For unused gate inputs, connect them to CONST_HIGH or CONST_LOW

=== CIRCUIT COMPLETENESS CHECKLIST ===
Before finalizing your circuit, verify:
- [ ] Every AND/OR/NAND/NOR gate has ALL input pins connected
- [ ] Every NOT/BUFFER gate has its input pin connected
- [ ] Every LED has its input pin connected
- [ ] No component is isolated (disconnected from the circuit)
"""


class LLMService:
    """Service for LLM operations using user-provided API keys."""

    MAX_TOOL_CALLS = 10

    def __init__(self) -> None:
        self.tool_handler = get_tool_handler()

    def _get_provider(self, provider_id: str) -> LLMProviderStrategy:
        """Get provider strategy by ID."""
        return LLMProviderFactory.get_provider(provider_id)

    def _validate_api_key(self, provider_id: str, api_key: str) -> None:
        """Validate API key format for provider."""
        provider = self._get_provider(provider_id)
        is_valid, error = provider.validate_key_format(api_key)
        if not is_valid:
            raise ValueError(error)

    async def _call_with_tools(
        self,
        provider: LLMProviderStrategy,
        api_key: str,
        system_prompt: str,
        user_prompt: str,
        model: str,
        temperature: float,
        max_tokens: int,
        base_url: str | None = None,
        bridge_token: str | None = None,
    ) -> dict[str, Any]:
        """Make LLM call with tool support."""
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        tool_calls_count = 0
        total_tokens = 0

        # Check if this is a local provider
        is_local = provider.provider_id == "local"

        while tool_calls_count < self.MAX_TOOL_CALLS:
            request = LLMRequest(
                messages=messages,
                tools=TOOL_DEFINITIONS,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            try:
                # For local provider, pass base_url and bridge_token
                if is_local:
                    response = await provider.call(api_key, request, base_url=base_url, bridge_token=bridge_token)
                else:
                    response = await provider.call(api_key, request)
            except (RateLimitError, QuotaExceededError, ProviderUnavailableError):
                raise
            except AuthenticationError as e:
                # Some providers return auth errors when tool calling isn't supported
                # Try fallback mode first before failing
                logger.warning(f"Auth error during tool call (may be unsupported tools): {e}, trying fallback mode")
                return await self._call_fallback(
                    provider, api_key, system_prompt, user_prompt, model, temperature, max_tokens,
                    base_url=base_url, bridge_token=bridge_token,
                )
            except Exception as e:
                logger.warning(f"Tool calling failed: {e}, trying fallback mode")
                return await self._call_fallback(
                    provider, api_key, system_prompt, user_prompt, model, temperature, max_tokens,
                    base_url=base_url, bridge_token=bridge_token,
                )

            total_tokens += response.token_usage

            if response.tool_calls:
                # Add assistant message with tool calls
                messages.append({
                    "role": "assistant",
                    "content": response.raw_content,
                    "tool_calls": response.tool_calls,
                })

                # Execute each tool call
                for tool_call in response.tool_calls:
                    tool_name = tool_call["function"]["name"]
                    try:
                        tool_args = json.loads(tool_call["function"]["arguments"])
                    except json.JSONDecodeError:
                        tool_args = {}

                    logger.info(f"Executing tool: {tool_name}")

                    # Execute tool
                    tool_result = self.tool_handler.handle_tool_call(tool_name, tool_args)

                    # Add tool result to messages
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "name": tool_name,
                        "content": json.dumps(tool_result),
                    })

                    tool_calls_count += 1

                    if tool_calls_count >= self.MAX_TOOL_CALLS:
                        logger.warning(f"Reached max tool calls ({self.MAX_TOOL_CALLS})")
                        break
            else:
                # LLM finished - check if we got valid content
                if response.content is not None:
                    logger.info(f"Tool calling complete: {tool_calls_count} tool calls, {total_tokens} tokens")
                    return {
                        "content": response.content,
                        "token_usage": total_tokens,
                        "tool_calls_count": tool_calls_count,
                    }
                else:
                    # Model returned empty/non-JSON content, try fallback
                    logger.warning(f"Model returned no parseable JSON content, trying fallback mode")
                    return await self._call_fallback(
                        provider, api_key, system_prompt, user_prompt, model, temperature, max_tokens,
                        base_url=base_url, bridge_token=bridge_token,
                    )

        # If we exhausted tool calls without getting content, try fallback
        logger.warning(f"Exceeded max tool calls without valid content, trying fallback mode")
        return await self._call_fallback(
            provider, api_key, system_prompt, user_prompt, model, temperature, max_tokens,
            base_url=base_url, bridge_token=bridge_token,
        )

    async def _call_fallback(
        self,
        provider: LLMProviderStrategy,
        api_key: str,
        system_prompt: str,
        user_prompt: str,
        model: str,
        temperature: float,
        max_tokens: int,
        base_url: str | None = None,
        bridge_token: str | None = None,
    ) -> dict[str, Any]:
        """Fallback to non-tool mode with component info embedded in prompt."""
        # Get component info to embed in prompt
        components_info = self.tool_handler.handle_tool_call("get_available_components", {})

        # Build component reference for the prompt
        component_ref = "=== AVAILABLE COMPONENTS ===\n"
        for category, comps in components_info.get("categories", {}).items():
            component_ref += f"\n{category}:\n"
            for comp in comps:
                component_ref += f"  - {comp['type']}: {comp['description']}\n"

        # Modify system prompt to include component info
        enhanced_prompt = system_prompt.replace(
            "IMPORTANT WORKFLOW:",
            f"{component_ref}\n{COMPONENT_PIN_REFERENCE}\nIMPORTANT:"
        ).replace(
            "IMPORTANT: Before creating the course plan, you MUST call the get_available_components tool",
            f"{component_ref}\nIMPORTANT: Use only the components listed above"
        )

        logger.info("Using fallback mode with embedded component info")

        # Add explicit JSON formatting instruction
        json_instruction = """

CRITICAL: Your response MUST be a valid JSON object only. Do NOT include any text before or after the JSON.
Do NOT use markdown code blocks. Start your response with { and end with }.
"""
        enhanced_user_prompt = user_prompt + json_instruction

        request = LLMRequest(
            messages=[
                {"role": "system", "content": enhanced_prompt},
                {"role": "user", "content": enhanced_user_prompt},
            ],
            tools=[],
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        # For local provider, pass base_url and bridge_token
        is_local = provider.provider_id == "local"
        if is_local:
            response = await provider.call(api_key, request, base_url=base_url, bridge_token=bridge_token)
        else:
            response = await provider.call(api_key, request)
        
        # If content is still None, try to parse raw_content more aggressively
        if response.content is None and response.raw_content:
            logger.warning("Fallback: Attempting aggressive JSON extraction from raw content")
            raw = response.raw_content
            # Remove markdown code blocks if present
            raw = re.sub(r'```json\s*', '', raw)
            raw = re.sub(r'```\s*', '', raw)
            # Try to find JSON object
            try:
                # Find the first { and last }
                start = raw.find('{')
                end = raw.rfind('}')
                if start != -1 and end != -1 and end > start:
                    json_str = raw[start:end+1]
                    response = LLMResponse(
                        content=json.loads(json_str),
                        tool_calls=[],
                        token_usage=response.token_usage,
                        finish_reason=response.finish_reason,
                        raw_content=response.raw_content,
                    )
                    logger.info("Successfully extracted JSON from raw content")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse extracted JSON: {e}")

        result = {
            "content": response.content,
            "token_usage": response.token_usage,
        }

        # Post-generation validation and auto-fix for level content
        content = response.content or {}
        if "practical" in content and "circuitBlueprint" in content.get("practical", {}):
            blueprint = content["practical"]["circuitBlueprint"]
            validation = self.tool_handler.handle_tool_call("validate_blueprint", {"blueprint": blueprint})

            if not validation.get("success"):
                errors = validation.get("errors", [])
                logger.warning(f"Blueprint validation failed: {errors}")

                # Auto-fix common errors
                fixed_blueprint = self._auto_fix_blueprint(blueprint, errors)

                # Validate again
                revalidation = self.tool_handler.handle_tool_call("validate_blueprint", {"blueprint": fixed_blueprint})

                if revalidation.get("success"):
                    logger.info("Blueprint auto-fixed successfully")
                    content["practical"]["circuitBlueprint"] = fixed_blueprint
                    result["content"] = content
                else:
                    logger.error(f"Blueprint auto-fix failed: {revalidation.get('errors', [])}")
                    result["validation_errors"] = revalidation.get("errors", [])

        return result

    def _auto_fix_blueprint(self, blueprint: dict[str, Any], errors: list[str]) -> dict[str, Any]:
        """Attempt to automatically fix common blueprint errors."""
        fixed = {
            "components": list(blueprint.get("components", [])),
            "wires": list(blueprint.get("wires", []))
        }

        # Track wires to remove
        wires_to_remove = []

        for i, wire in enumerate(fixed["wires"]):
            from_str = wire.get("from", "")
            to_str = wire.get("to", "")

            for error in errors:
                if "Invalid pin" in error and (from_str in error or to_str in error):
                    logger.info(f"Removing wire with invalid pin: {from_str} -> {to_str}")
                    wires_to_remove.append(i)
                    break

                if "multiple drivers" in error and to_str in error:
                    logger.info(f"Removing wire causing multiple drivers: {from_str} -> {to_str}")
                    wires_to_remove.append(i)
                    break

        # Remove problematic wires (in reverse to maintain indices)
        for i in sorted(wires_to_remove, reverse=True):
            fixed["wires"].pop(i)

        # Fix floating inputs by adding CONST_LOW components
        floating_inputs = []
        for error in errors:
            if "Floating input:" in error:
                # Extract component label and pin from error message
                # Format: "Floating input: LABEL (TYPE) pin 'PIN' has no connection..."
                import re as regex
                match = regex.search(r"Floating input: (\w+) \([^)]+\) pin '(\w+)'", error)
                if match:
                    label, pin = match.groups()
                    floating_inputs.append((label, pin))
        
        # Add CONST_LOW for each floating input
        const_count = sum(1 for c in fixed["components"] if c.get("type") == "CONST_LOW")
        for i, (label, pin) in enumerate(floating_inputs):
            const_label = f"GND{const_count + i + 1}"
            # Find the component position to place CONST_LOW nearby
            comp = next((c for c in fixed["components"] if c.get("label") == label), None)
            if comp:
                pos = comp.get("position", {"x": 100, "y": 100})
                # Add CONST_LOW component
                fixed["components"].append({
                    "type": "CONST_LOW",
                    "label": const_label,
                    "position": {"x": pos["x"] - 80, "y": pos["y"]},
                    "properties": {}
                })
                # Add wire from CONST_LOW to floating input
                fixed["wires"].append({
                    "from": f"{const_label}:OUT",
                    "to": f"{label}:{pin}"
                })
                logger.info(f"Auto-fixed floating input {label}:{pin} with {const_label}")

        return fixed

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
        # Validate API key format (skip for local provider)
        if provider_id != "local":
            self._validate_api_key(provider_id, api_key)

        provider = self._get_provider(provider_id)
        system_prompt = COURSE_PLAN_SYSTEM_PROMPT
        user_prompt = f"Create a comprehensive course plan for: {topic}"

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

        return theory, practical, token_usage

    async def test_connection(
        self,
        provider_id: str,
        api_key: str,
        model: str,
    ) -> dict[str, Any]:
        """Test API key validity with a minimal request.

        Args:
            provider_id: LLM provider ID
            api_key: User's API key
            model: Model to test

        Returns:
            Dict with success status and any error message
        """
        # Validate API key format first
        self._validate_api_key(provider_id, api_key)

        provider = self._get_provider(provider_id)

        # Make a minimal request to test the connection
        request = LLMRequest(
            messages=[
                {"role": "user", "content": "Say 'OK' if you can read this."},
            ],
            tools=[],
            model=model,
            temperature=0,
            max_tokens=10,
        )

        try:
            response = await provider.call(api_key, request)
            return {
                "success": True,
                "message": "Connection successful",
                "token_usage": response.token_usage,
            }
        except AuthenticationError as e:
            return {"success": False, "error": "authentication", "message": e.message}
        except RateLimitError as e:
            return {"success": False, "error": "rate_limit", "message": e.message}
        except QuotaExceededError as e:
            return {"success": False, "error": "quota", "message": e.message}
        except ProviderUnavailableError as e:
            return {"success": False, "error": "unavailable", "message": e.message}
        except Exception as e:
            return {"success": False, "error": "unknown", "message": str(e)}


# Singleton instance
llm_service = LLMService()
