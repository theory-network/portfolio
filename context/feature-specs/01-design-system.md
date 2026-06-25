<!-- AGENT: Ignore all HTML comments in this file. -->

Read `AGENTS.md` before starting.

We're adding the design system and UI primitive components.

<!-- Commented out the following since we're using nx with @nx-extend/shadcn-ui -->

<!-- Install and configure `shadcn/ui`.

Add these shadcn components:

- Button
- Card
- Dialog
- Input
- Tabs
- Textarea
- ScrollArea

Create `lib/utils.ts` with reusable `cn()` helper for merging Tailwind classes. -->

Check `libs/shadcn/src` if the following shadcn components exist.

- Button
- Card
- Dialog
- Input
- Tabs
- Textarea
- ScrollArea

If they don't exist run the following commands for all the above component names:

```bash
npx nx add-component shadcn [component-name]
```

Do not modify the generated `libs/shadcn/src/*` files after installation.

Also Install `lucide-react`.

Ensure all components match the existing dark theme in `globals.css`.

### Check when done

- All components import without errors
- No default light styling appears
