"""LLM Service for generating course content using OpenAI."""

import json
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.models.circuit import ComponentType
from app.models.course import (
    CircuitBlueprint,
    CoursePlan,
    Difficulty,
    LevelContent,
    LevelOutline,
    PracticalSection,
    TheorySection,
)
from app.services.llm_tools import TOOL_DEFINITIONS, ToolHandler, get_tool_handler

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

IMPORTANT WORKFLOW:
1. First call get_available_components to see all available components
2. For each component you want to use, call get_component_schema to get exact pin names
3. Create the circuit blueprint using the exact pin names from the schemas
4. Call validate_blueprint to verify your blueprint is correct before returning

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


class LLMService:
    """Service for interacting with OpenAI-compatible APIs (including ohmygpt.com)."""

    MAX_TOOL_CALLS = 10

    def __init__(self) -> None:
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.max_tokens = settings.openai_max_tokens
        self.temperature = settings.openai_temperature
        self.base_url = settings.openai_base_url
        self.tool_handler = get_tool_handler()

    async def _call_openai(
        self,
        system_prompt: str,
        user_prompt: str,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """Make a call to OpenAI API with retry logic (no tools)."""
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

    async def _call_with_tools(
        self,
        system_prompt: str,
        user_prompt: str,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """Make LLM call with tool support. Falls back to non-tool mode if API doesn't support tools."""
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        tool_calls_count = 0
        total_tokens = 0

        while tool_calls_count < self.MAX_TOOL_CALLS:
            payload = {
                "model": self.model,
                "messages": messages,
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
                "tools": TOOL_DEFINITIONS,
                "tool_choice": "auto",
            }

            last_error: Optional[Exception] = None
            result = None

            for attempt in range(max_retries):
                try:
                    async with httpx.AsyncClient(timeout=120.0) as client:
                        response = await client.post(
                            self.base_url,
                            headers=headers,
                            json=payload,
                        )
                        response.raise_for_status()
                        result = response.json()
                        break
                except httpx.HTTPStatusError as e:
                    last_error = e
                    logger.warning(f"OpenAI API error (attempt {attempt + 1}): {e}")
                    
                    # Check if it's a tool-related error (API doesn't support tools)
                    if e.response.status_code == 400:
                        error_body = e.response.text
                        if "tool" in error_body.lower() or "function" in error_body.lower():
                            logger.warning("API doesn't support tool calling, falling back to non-tool mode")
                            # Fall back to non-tool mode
                            return await self._call_openai_fallback(system_prompt, user_prompt)
                    
                    if e.response.status_code == 429:
                        import asyncio
                        await asyncio.sleep(2 ** attempt)
                    elif e.response.status_code >= 500:
                        import asyncio
                        await asyncio.sleep(1)
                    else:
                        # For other 4xx errors, try fallback
                        logger.warning(f"API error {e.response.status_code}, trying fallback mode")
                        return await self._call_openai_fallback(system_prompt, user_prompt)
                except Exception as e:
                    last_error = e
                    logger.warning(f"Unexpected error (attempt {attempt + 1}): {e}")
            
            if result is None:
                # All retries failed, try fallback
                logger.warning("Tool calling failed, falling back to non-tool mode")
                return await self._call_openai_fallback(system_prompt, user_prompt)

            # Track token usage
            usage = result.get("usage", {})
            total_tokens += usage.get("total_tokens", 0)

            message = result["choices"][0]["message"]
            
            # Check if LLM wants to call tools
            tool_calls = message.get("tool_calls", [])
            
            if tool_calls:
                # Add assistant message with tool calls
                messages.append({
                    "role": "assistant",
                    "content": message.get("content"),
                    "tool_calls": tool_calls,
                })
                
                # Execute each tool call
                for tool_call in tool_calls:
                    tool_name = tool_call["function"]["name"]
                    try:
                        tool_args = json.loads(tool_call["function"]["arguments"])
                    except json.JSONDecodeError:
                        tool_args = {}
                    
                    logger.info(f"Executing tool: {tool_name} with args: {tool_args}")
                    
                    # Execute tool
                    tool_result = self.tool_handler.handle_tool_call(tool_name, tool_args)
                    
                    # Add tool result to messages
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": json.dumps(tool_result),
                    })
                    
                    tool_calls_count += 1
                    
                    if tool_calls_count >= self.MAX_TOOL_CALLS:
                        logger.warning(f"Reached max tool calls ({self.MAX_TOOL_CALLS})")
                        break
            else:
                # LLM finished, parse final response
                content = message.get("content", "")
                
                # Try to parse as JSON
                try:
                    parsed = json.loads(content)
                except json.JSONDecodeError:
                    # Try to extract JSON from the response
                    import re
                    json_match = re.search(r'\{[\s\S]*\}', content)
                    if json_match:
                        parsed = json.loads(json_match.group())
                    else:
                        raise ValueError(f"Could not parse JSON from response: {content[:200]}")
                
                logger.info(f"Tool calling complete: {tool_calls_count} tool calls, {total_tokens} tokens")
                
                return {
                    "content": parsed,
                    "token_usage": total_tokens,
                    "tool_calls_count": tool_calls_count,
                }

        # Exceeded max tool calls
        raise RuntimeError(f"Exceeded maximum tool calls ({self.MAX_TOOL_CALLS})")

    async def _call_openai_fallback(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> Dict[str, Any]:
        """Fallback to non-tool mode with component info embedded in prompt."""
        # Get component info to embed in prompt
        components_info = self.tool_handler.handle_tool_call("get_available_components", {})
        
        # Build component reference for the prompt
        component_ref = "=== AVAILABLE COMPONENTS ===\n"
        for category, comps in components_info.get("categories", {}).items():
            component_ref += f"\n{category}:\n"
            for comp in comps:
                component_ref += f"  - {comp['type']}: {comp['description']}\n"
        
        # Add comprehensive pin reference
        pin_ref = """
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

=== EXAMPLE VALID CIRCUITS ===
Simple LED circuit:
  components: [{type: "SWITCH_TOGGLE", label: "SW1"}, {type: "LED_RED", label: "LED1"}]
  wires: [{from: "SW1:OUT", to: "LED1:IN"}]

AND gate circuit:
  components: [{type: "SWITCH_TOGGLE", label: "SW1"}, {type: "SWITCH_TOGGLE", label: "SW2"}, {type: "AND_2", label: "AND1"}, {type: "LED_RED", label: "LED1"}]
  wires: [{from: "SW1:OUT", to: "AND1:A"}, {from: "SW2:OUT", to: "AND1:B"}, {from: "AND1:Y", to: "LED1:IN"}]
"""
        
        # Modify system prompt to include component info
        enhanced_prompt = system_prompt.replace(
            "IMPORTANT WORKFLOW:",
            f"{component_ref}\n{pin_ref}\nIMPORTANT:"
        ).replace(
            "IMPORTANT: Before creating the course plan, you MUST call the get_available_components tool",
            f"{component_ref}\nIMPORTANT: Use only the components listed above"
        )
        
        logger.info("Using fallback mode with embedded component info")
        result = await self._call_openai(enhanced_prompt, user_prompt)
        
        # Post-generation validation for level content
        content = result.get("content", {})
        if "practical" in content and "circuitBlueprint" in content.get("practical", {}):
            blueprint = content["practical"]["circuitBlueprint"]
            validation = self.tool_handler.handle_tool_call("validate_blueprint", {"blueprint": blueprint})
            
            if not validation.get("success"):
                logger.warning(f"Blueprint validation failed: {validation.get('errors', [])}")
                # Add validation errors to result for debugging
                result["validation_errors"] = validation.get("errors", [])
                result["validation_warnings"] = validation.get("warnings", [])
        
        return result

    async def generate_course_plan(self, topic: str, use_tools: bool = True) -> tuple[CoursePlan, int]:
        """Generate a course plan for the given topic.
        
        Args:
            topic: The course topic
            use_tools: Whether to use tool calling (default True)
        
        Returns:
            Tuple of (CoursePlan, token_usage)
        """
        system_prompt = COURSE_PLAN_SYSTEM_PROMPT
        user_prompt = f"Create a comprehensive course plan for: {topic}"

        if use_tools:
            result = await self._call_with_tools(system_prompt, user_prompt)
        else:
            # Fallback to non-tool version with component list in prompt
            fallback_prompt = system_prompt.replace(
                "IMPORTANT: Before creating the course plan, you MUST call the get_available_components tool to see what components are available in CircuitForge.",
                f"Available components in CircuitForge: {', '.join(AVAILABLE_COMPONENTS)}"
            )
            result = await self._call_openai(fallback_prompt, user_prompt)
        
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
        use_tools: bool = True,
    ) -> tuple[TheorySection, PracticalSection, int]:
        """Generate content for a specific level.
        
        Args:
            course_plan: The course plan
            level_number: The level number to generate
            use_tools: Whether to use tool calling (default True)
        
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
            topic=course_plan.topic,
            course_title=course_plan.title,
            level_number=level_number,
            total_levels=len(course_plan.levels),
            level_title=level_outline.title,
            level_description=level_outline.description,
            previous_levels="; ".join(previous_levels) if previous_levels else "None",
        )
        user_prompt = f"Generate detailed content for Level {level_number}: {level_outline.title}"

        if use_tools:
            result = await self._call_with_tools(system_prompt, user_prompt)
        else:
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


# Singleton instance
llm_service = LLMService()
