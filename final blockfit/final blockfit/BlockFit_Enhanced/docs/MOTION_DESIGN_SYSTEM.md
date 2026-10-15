# BlockFit Motion Design System

## Product direction
BlockFit is a premium AI-powered movement and rehabilitation companion. The motion language should feel calm, confident, and useful: it helps the user understand what is happening, what to do next, and whether their action was successful.

## Core motion rules
- Micro interactions: 120–200ms with ease-out on entry and ease-in on exit
- Button press: scale to 0.98 with a subtle shadow adjustment
- Card/list item entrance: fade + slight upward drift, staggered by 40–60ms
- Page transitions: 250–350ms slide/fade based on hierarchy
- Loading state: skeleton with soft shimmer at ~1.2s
- Success: quick checkmark + subtle scale and fade
- Error: controlled shake up to 6–8px plus a gentle color shift
- Reduced motion: all animations are disabled or softened for accessibility

## Premium visual language
- Calming neutral base: charcoal, stone, warm ivory, and softly reflective surfaces
- Accent color: warm gold for critical actions and positive states
- High contrast text with generous spacing to keep readability premium and uncluttered
- Soft shadows and layered panels rather than heavy gradients or noisy decorative elements

## Screen framework

### 1) Onboarding / landing
Purpose: explain the app clearly before asking for sign-up.

Layout:
- Large editorial headline with strong value proposition
- Secondary support line beneath
- Primary CTA for sign-up, secondary CTA for login
- 3 summary cards: What / Who / Why
- A calm live movement card on the side to show the product in context

Motion:
- Hero content fades up and settles into place on first render
- CTA hover lifts by 1px and adds soft shadow
- Stat cards stagger in by 40–60ms
- Floating movement card has a subtle slow drift only on large screens; disabled under reduced motion

### 2) Login / register
Purpose: make trust and safety visible without making the form feel heavy.

Layout:
- Intro panel explaining product value and privacy boundaries
- Authentication form in a focused panel with minimal fields
- Clear errors and validation states

Motion:
- Form panel slides in and fades softly
- Field focus rings expand gently without distraction
- Error feedback uses a tiny shake and warm tint change
- Button success state animates with a checkmark pulse after mock submission

### 3) Dashboard
Purpose: create focus to the next best action.

Layout:
- Top summary header with user greeting and primary action
- 4 stat cards with minimal labels and trends
- List of exercises with clear status chips
- Side panel for system health and current actions

Motion:
- Summary cards animate in a staggered sequence
- Exercise list items enter individually with a subtle upward shift
- Status pills briefly pulse when data loads successfully
- Empty states use a calm fade-in with soft skeleton placeholders

### 4) Key feature screen
Purpose: make the movement session feel premium and focused.

Layout:
- Full-width camera stage with HUD overlay
- Immediate metrics: reps, phase, form
- Secondary coach panel with clear advice and saved session summary

Motion:
- Camera surface itself is static but overlays animate gently in and out
- HUD values update with subtle opacity and scale to reinforce activity
- Feedback banner transitions at 160–200ms with a soft fade
- Coach summary updates with a short appearance pulse rather than a jarring flash

### 5) Settings
Purpose: reduce anxiety and make controls feel stable and safe.

Layout:
- Sectioned preferences cards (profile, privacy, notifications, data controls)
- Clear action buttons with minimal destructive styling
- Save confirmation or error state shown inline

Motion:
- Section cards fade in and slide upward when the screen loads
- Toggle switches spring gently with a minimal 120ms transition
- Save confirmations appear with a checkmark and fade-out after success

### 6) Empty / error states
Purpose: reassure the user and keep momentum without alarm.

Layout:
- Calm icon or illustration, short heading, supporting copy, and one clear CTA
- Error states show a stronger visual cue but not a harsh red alarm

Motion:
- Empty states fade in softly
- Error states shake gently and change tone at 200ms
- CTA focus remains high so the user knows exactly what to do next

## Component library

| Component | Purpose | Motion pattern | Trigger |
| --- | --- | --- | --- |
| Primary button | High-priority action | 150ms ease-out hover, 120ms press scale to 0.98 | hover, focus, press |
| Secondary button | Lower-priority action | 150ms fade + minor lift | hover, focus |
| Stat card | Summary metrics | 220ms fade + upward slide, stagger 40–60ms | page load |
| Exercise row | Movement selection | 180ms fade + slide, stagger 50ms | list render |
| Form field | Input focus | 120ms border glow and shadow change | focus |
| Success pill | Save/complete confirmation | checkmark + scale + fade | success |
| Error banner | Validation or sync warning | 200ms shake + warm color shift | error |
| Skeleton | Loading placeholder | 1.2s shimmer | data fetch |
| Panel transition | Route or section exchange | 250–350ms slide/fade | route change |

## Mobile frame notes
- Use compact hero content, one primary CTA, and a secondary action anchored clear of the keyboard
- All cards should maintain enough padding for thumb reach and readability
- Motion on mobile is even calmer: smaller scale changes and shorter durations when possible
- Preserve hierarchy by keeping the highest-priority action above the fold

## How motion guides attention
Motion is not decorative here; it clarifies where the user is, what changed, and what to do next. Smooth entrances help the system feel intentional rather than busy. Success states confirm completion without adding noise. Error states pull attention gently to the issue without creating panic. In a movement and rehab product, calm motion builds trust and helps the interface feel reliable, focused, and premium.
