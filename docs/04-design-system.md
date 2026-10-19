# 04 — Smart Design System

## Principles
1. **Glanceable in the gym:** big tap targets (≥ 48 px), high contrast, one primary action per screen.
2. **Log in ≤ 3 taps:** previous values prefilled, steppers for weight/reps.
3. **Data tells a story:** every chart answers one question (am I getting stronger?).
4. **Dark-first, light supported.** Gyms are dim; OLED saves battery.
5. **Same components, adaptive layouts** for phone / tablet / desktop.

## Tokens
```ts
export const colors = {
  bg:        { dark: "#0B0D12", light: "#F7F8FA" },
  surface:   { dark: "#151922", light: "#FFFFFF" },
  surface2:  { dark: "#1E2430", light: "#EEF0F4" },
  text:      { dark: "#F2F4F8", light: "#10131A" },
  textMuted: { dark: "#9AA4B5", light: "#5B6577" },
  primary:   "#4F8CFF",  // actions
  accent:    "#B6FF3B",  // PRs, streaks, success highlight
  protein:   "#FF6B6B",
  carbs:     "#FFC24B",
  fat:       "#5BD6A5",
  danger:    "#FF4D4F",
};
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 };
export const space  = [0, 4, 8, 12, 16, 24, 32, 48];
export const type = { // Inter or Geist
  display: 32, title: 22, body: 16, caption: 13, mono: "tabular-nums for numbers",
};
```
Macro colors stay **consistent everywhere** (protein = red, carbs = amber, fat = green). Verify contrast ≥ 4.5:1.

## Key components
- `SetRow` (weight stepper · reps stepper · RPE · done check, haptic on complete)
- `RestTimer` (floating bar, auto-start after set)
- `MacroRing` (kcal ring + 3 macro bars)
- `PRBadge` (accent color + subtle confetti once)
- `ChartCard` (title, delta vs last period, range switcher 1W/1M/3M/1Y)
- `MealScanSheet` (camera overlay with plate guide → result sheet with editable items)
- `PhotoCompare` (slider before/after)

## Navigation
- **Mobile:** bottom tabs — Today · Train · Progress · Nutrition · Profile.
- **Tablet/Desktop (≥ 900 px):** left sidebar + two-pane layout (list | detail), charts in a grid.
- Breakpoints: `sm 0`, `md 600`, `lg 900`, `xl 1280`.

## Motion
Reanimated, 150–250 ms ease-out; animate ring fills, number count-ups, set completion. Respect "reduce motion".

## Charts (use the `dataviz` skill)
- Line: body weight (with 7-day moving average line).
- Bar: weekly volume per muscle group.
- Dot timeline: PRs per lift.
- Heatmap: workout consistency calendar.
- Stacked bar/ring: macro split.

## Accessibility
Labels on all controls, dynamic type, color never the sole signal, haptics optional, screen-reader summaries for charts.

