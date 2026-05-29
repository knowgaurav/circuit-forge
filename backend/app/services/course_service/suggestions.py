"""Predefined topic suggestions shown on the "start a course" screen.

Why this module exists separately
---------------------------------
This is pure data — the curated list of starter topics a user can pick from
before generating a course. Keeping it out of the service file means the
service stays focused on behavior, and adding/removing a suggestion is a
one-line edit here.

Each ``TopicSuggestion`` is a hint for the generator and a card in the UI:
topic, title, description, difficulty, rough level count, and a category for
grouping.
"""

from app.models.course import Difficulty, TopicSuggestion

# Predefined topic suggestions
TOPIC_SUGGESTIONS: list[TopicSuggestion] = [
    # Digital Logic Fundamentals
    TopicSuggestion(
        topic="4-bit Calculator",
        title="Build a 4-bit Calculator",
        description="Learn binary arithmetic by building a calculator that can add and subtract 4-bit numbers",
        difficulty=Difficulty.INTERMEDIATE,
        estimatedLevels=12,
        category="Digital Logic",
    ),
    TopicSuggestion(
        topic="Binary Counter",
        title="Build a Binary Counter",
        description="Create a counter that counts from 0 to 15 in binary using flip-flops",
        difficulty=Difficulty.BEGINNER,
        estimatedLevels=8,
        category="Digital Logic",
    ),
    TopicSuggestion(
        topic="Digital Clock",
        title="Build a Digital Clock",
        description="Design a clock display using counters and 7-segment displays",
        difficulty=Difficulty.INTERMEDIATE,
        estimatedLevels=15,
        category="Digital Logic",
    ),
    # Computing
    TopicSuggestion(
        topic="Simple ALU",
        title="Build a Simple ALU",
        description="Create an Arithmetic Logic Unit that performs basic operations",
        difficulty=Difficulty.ADVANCED,
        estimatedLevels=14,
        category="Computing",
    ),
    # Robotics
    TopicSuggestion(
        topic="Line Following Robot",
        title="Build Line Following Robot Logic",
        description="Design the control logic for a robot that follows a line",
        difficulty=Difficulty.INTERMEDIATE,
        estimatedLevels=10,
        category="Robotics",
    ),
    TopicSuggestion(
        topic="Motor Speed Controller",
        title="Build a Motor Speed Controller",
        description="Create a PWM-based motor speed controller",
        difficulty=Difficulty.BEGINNER,
        estimatedLevels=8,
        category="Robotics",
    ),
    # Automation
    TopicSuggestion(
        topic="Traffic Light Controller",
        title="Build a Traffic Light Controller",
        description="Design a state machine that controls traffic lights at an intersection",
        difficulty=Difficulty.BEGINNER,
        estimatedLevels=10,
        category="Automation",
    ),
    TopicSuggestion(
        topic="Elevator Controller",
        title="Build an Elevator Controller",
        description="Create the logic for a 3-floor elevator system",
        difficulty=Difficulty.INTERMEDIATE,
        estimatedLevels=12,
        category="Automation",
    ),
]
