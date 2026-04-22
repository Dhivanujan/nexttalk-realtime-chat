# NextTalk Design System

## Design Principles
- Clean, glassy surfaces with soft gradients and clear hierarchy.
- High-contrast text over muted backgrounds.
- Motion should be calm and purposeful, never distracting.

## Typography
- Display: Unbounded (headers, brand)
- Body: Space Grotesk (UI, messages)
- Scale:
  - Display: 20-28px
  - Heading: 16-20px
  - Body: 14-16px
  - Meta: 11-12px

## Color Tokens
- Primary: #25D366
- Primary Hover: #1EA957
- Surface Light: #FFFFFF (with 70-85% opacity for glass)
- Surface Dark: #101420 (with 70-85% opacity)
- Ink 900: #0F172A
- Ink 600: #64748B
- Border: rgba(148, 163, 184, 0.32)
- Success: #22C55E
- Danger: #EF4444

## Layout
- Desktop: 30% sidebar, 70% chat panel.
- Mobile: stacked layout; sidebar slides out on chat open.
- Spacing: 12px (xs), 16px (sm), 24px (md), 32px (lg).
- Radius: 8/12/18/26px.

## Components
- Chat Shell: glass card with backdrop blur and gradient background.
- Message Bubble: rounded 18px, own messages with green gradient.
- Avatar: circular, 40px default, 30px compact.
- Inputs: pill shapes with subtle focus ring.

## Motion
- List rise-in: 260ms ease-out.
- Message pop-in: 220ms ease-out.
- Sidebar/Chat slide: 260ms ease-out.

## Tailwind Mapping
- brand-500: #25D366
- ink-900: #0F172A
- Use shadows: shadow-glass for cards, shadow-glow for CTA.
