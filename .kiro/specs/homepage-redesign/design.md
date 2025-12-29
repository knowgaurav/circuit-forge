# Design Document: CircuitForge Homepage Redesign

## Overview

This design document outlines the technical approach for redesigning the CircuitForge homepage following the modern dark-themed landing page pattern inspired by jsinterview.online. The redesign transforms the current light-themed homepage into a premium dark experience with purple/blue gradient accents, glassmorphism effects, animated statistics, and engaging visual hierarchy.

## Architecture

The homepage will be implemented as a single Next.js page component (`page.tsx`) with modular section components for maintainability. The design follows a component-based architecture leveraging existing UI primitives while introducing new animation and styling utilities.

```
src/app/page.tsx (HomePage)
├── Navigation (sticky, glassmorphism)
├── HeroSection
│   ├── GradientHeadline
│   ├── Subheadline
│   ├── CTAButtons
│   └── HeroIllustration
├── StatsBar
│   └── AnimatedCounter (x4)
├── FeaturesSection
│   ├── FeaturesList
│   └── EditorPreview
├── InteractivePracticeSection
│   ├── BenefitsList
│   └── PlaygroundCTA
├── TopicsSection
│   └── CategoryCard (x8)
├── TemplatesSection
│   ├── FilterTabs
│   └── TemplateCard (x6)
├── FinalCTASection
└── Footer
```

## Components and Interfaces

### New Components

#### 1. AnimatedCounter
```typescript
interface AnimatedCounterProps {
  end: number;
  suffix?: string;
  duration?: number;
  label: string;
  icon?: React.ReactNode;
}
```
Animates from 0 to target number on viewport entry.

#### 2. CategoryCard
```typescript
interface CategoryCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  href: string;
}
```
Displays a circuit category with hover effects.

#### 3. TemplateCard
```typescript
interface TemplateCardProps {
  id: string;
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  description: string;
  href: string;
}
```
Displays a featured template with glassmorphism styling.

#### 4. GradientText
```typescript
interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
}
```
Applies purple-to-blue gradient to text.

### Animation Utilities

```typescript
// Intersection Observer hook for viewport animations
function useInView(options?: IntersectionObserverInit): [RefObject, boolean];

// CSS classes for animations
const animations = {
  fadeInUp: 'animate-fade-in-up',
  fadeIn: 'animate-fade-in',
  countUp: 'animate-count-up',
  glow: 'animate-glow',
};
```

## Data Models

### Categories Data
```typescript
const categories = [
  { id: 'logic-gates', name: 'Logic Gates', icon: <Gate />, count: 12, description: 'AND, OR, NOT, XOR and more' },
  { id: 'flip-flops', name: 'Flip-Flops', icon: <FlipFlop />, count: 8, description: 'SR, JK, D, T flip-flops' },
  { id: 'sensors', name: 'Sensors', icon: <Sensor />, count: 10, description: 'Light, temperature, motion' },
  { id: 'motors', name: 'Motors & Actuators', icon: <Motor />, count: 6, description: 'DC, servo, stepper motors' },
  { id: 'displays', name: 'Displays', icon: <Display />, count: 5, description: '7-segment, LCD, LED matrix' },
  { id: 'power', name: 'Power Sources', icon: <Battery />, count: 4, description: 'Batteries, supplies, regulators' },
  { id: 'arithmetic', name: 'Arithmetic', icon: <Calculator />, count: 8, description: 'Adders, multipliers, ALUs' },
  { id: 'memory', name: 'Memory', icon: <Memory />, count: 6, description: 'Registers, RAM, ROM' },
];
```

### Stats Data
```typescript
const stats = [
  { value: 60, suffix: '+', label: 'Components', icon: <Cpu /> },
  { value: 30, suffix: '+', label: 'Templates', icon: <BookOpen /> },
  { value: 11, suffix: '', label: 'Categories', icon: <Grid /> },
  { value: 100, suffix: '%', label: 'Free', icon: <Sparkles /> },
];
```

## Image Requirements

### Hero Illustration
**Prompt for image generation:**
```
A 3D rendered illustration of a friendly robot or character building electronic circuits on a glowing workbench. The scene has a dark purple/blue gradient background with floating circuit components, logic gates, and glowing connection lines. The style is modern, clean, and educational - similar to tech startup illustrations. Soft lighting with purple and blue accent glows. The character should look approachable and engaged in learning. High quality, 4K resolution, suitable for a dark-themed website hero section.
```
**Dimensions:** 600x600px or 800x600px
**Format:** PNG with transparency or WebP

### Editor Preview Mockup
**Prompt for image generation:**
```
A screenshot-style mockup of a circuit design editor interface on a dark theme. Shows a canvas with connected logic gates (AND, OR, NOT gates) with glowing blue/purple connection wires. The interface has a component palette on the left side and properties panel on the right. The design is clean and modern with glassmorphism elements. Dark background (#1a1a2e) with subtle grid lines. The circuit should look like a simple half-adder or basic logic demonstration. Professional UI design style.
```
**Dimensions:** 800x500px
**Format:** PNG or WebP

### Category Icons
Use Lucide React icons for categories - no custom images needed.

## Styling Approach

### Color Palette (Dark Theme)
```css
:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #111827;
  --bg-card: rgba(17, 24, 39, 0.8);
  --text-primary: #f3f4f6;
  --text-secondary: #9ca3af;
  --accent-purple: #8b5cf6;
  --accent-blue: #3b82f6;
  --gradient-primary: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
  --glassmorphism-bg: rgba(255, 255, 255, 0.05);
  --glassmorphism-border: rgba(255, 255, 255, 0.1);
}
```

### Glassmorphism Utility
```css
.glass {
  background: var(--glassmorphism-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glassmorphism-border);
  border-radius: 16px;
}
```

### Animation Keyframes
```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes count-up {
  from { --num: 0; }
  to { --num: var(--target); }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
  50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.6); }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following testable properties have been identified:

### Property 1: Feature list contains expected count
*For any* render of the features section, the feature list SHALL contain between 4 and 6 feature items, each with an icon element.
**Validates: Requirements 3.2**

### Property 2: Category cards contain required elements
*For any* category card rendered in the topics section, the card SHALL contain an icon, a name text element, and either a description or count indicator.
**Validates: Requirements 5.3**

### Property 3: Topics section displays correct card count
*For any* render of the topics section, the section SHALL display between 6 and 8 category cards.
**Validates: Requirements 5.2**

### Property 4: Category card navigation
*For any* category card, when clicked, the navigation SHALL route to `/templates?category={categoryId}` where categoryId matches the card's category.
**Validates: Requirements 5.5**

### Property 5: Template cards contain required elements
*For any* template card rendered in the templates section, the card SHALL display a name, difficulty level badge, and category tag.
**Validates: Requirements 6.3**

### Property 6: Templates section displays correct card count
*For any* render of the templates section, the section SHALL display between 4 and 6 template cards.
**Validates: Requirements 6.2**

### Property 7: Template card navigation
*For any* template card, when clicked, the navigation SHALL route to `/templates/{templateId}` or `/playground?template={templateId}`.
**Validates: Requirements 6.5**

## Error Handling

- **Image Loading Failures**: Display placeholder gradient backgrounds if hero illustration fails to load
- **Animation Failures**: Gracefully degrade to static content if animations fail or are disabled
- **Navigation Errors**: Show error toast if session creation fails, maintain current page state
- **Responsive Breakpoints**: Ensure all content remains accessible even if CSS fails to load

## Testing Strategy

### Unit Testing
- Test AnimatedCounter component renders correct final value
- Test CategoryCard and TemplateCard render all required elements
- Test GradientText applies correct CSS classes
- Test navigation links have correct href values

### Property-Based Testing
Using `fast-check` library for property-based tests:

- **Property 1-2**: Generate random feature/category data and verify rendered output contains required elements
- **Property 3-6**: Verify count constraints are maintained across different data sets
- **Property 4, 7**: Generate random category/template IDs and verify navigation URLs are correctly formed

Each property-based test will run a minimum of 100 iterations and be tagged with:
`**Feature: homepage-redesign, Property {number}: {property_text}**`

### Visual Testing
- Manual verification of glassmorphism effects
- Cross-browser testing for animation compatibility
- Responsive design testing at 320px, 768px, 1024px, 1440px breakpoints

### Accessibility Testing
- Verify reduced-motion preference is respected
- Test keyboard navigation through all interactive elements
- Verify color contrast meets WCAG AA standards
