# Working on Fog

Fog is a static browser experience with seeded town generation, a side-on Canvas 2D scene, and spatial Web Audio. Use the task and the relevant design documents to decide what the finished behavior should be. [Development plan](docs/development-plan.md) · [Technology](docs/technology.md)

## Carry the task through completion

- Inspect the existing checkout, applicable instructions, and Git status before making changes. Preserve the user's staged, unstaged, and untracked work. Prefer the task's checkout and isolate work when needed to protect existing changes.
- Identify the requested deliverable and how to verify it. For larger tasks, work through a short sequence of implementation and verification steps. Make reasonable, reversible decisions within scope and record choices that affect the result.
- Do the installation, implementation, checks, and authorized delivery steps the task needs. Wait for running jobs to finish and inspect their results. When a step fails, diagnose the cause, try a supported correction, and rerun the affected check.
- Ask for input when essential information or authorization is missing, or when a choice would materially change the requested outcome. Complete any independent work while that blocker is being resolved. Share meaningful progress on longer tasks.

## Engineering practices

- Follow the existing strict TypeScript and ES module conventions. Reuse the model in `src/model/` and the existing entry points. Keep changes focused, readable, and proportionate to the task.
- Keep the seeded generator independent of browser APIs. Use the resolved scene layout for rendering, hit testing, and sound placement. Validate replacement geometry before the fog-covered swap.
- For audio changes, preserve the continuous rain source and fade the town mix with the cover and reveal phases. Release scheduled work and nodes when emitters retire. [Sound engine development plan](docs/sound-engine-plan.md)
- Handle supported existing data and expect operations to be interrupted or retried. Preserve valid state when a load or regeneration fails. Reuse existing dependencies where possible and update the npm lockfile with any dependency changes.
- Use original or CC0 assets with source and license records. Resolve asset URLs so the static build works at a site root and under a subpath. Keep relevant usage and design notes current when behavior or interfaces change. [Data model](docs/data-model.md) · [Asset generation guide](docs/asset-generation-guide.md) · [Sound inventory](docs/sound-inventory.md)

## Verify the result

Choose checks that exercise the requested behavior through its normal entry point. Look at the scripts in `package.json` and any relevant CI workflow.

| Change | Checks |
| --- | --- |
| TypeScript or dependencies | Install from the lockfile with `npm ci` when needed. Run `npm run typecheck` and the relevant configured tests. |
| Generation or scene state | Check repeatability for the same seed, the site or street constraints affected by the change, and the selected regeneration scope. |
| Rendering, input, or sound | Run the app where its entry point is available. Exercise the affected pointer or touch flow and inspect console or asset errors. For audio, listen to the intended mix when playback is available and check the rain through a reveal. |
| Production build | Run `npm run build` when configured. Serve the built app to check changed browser behavior or asset paths that depend on the build. |
| Documentation | Check links, commands, examples, and references against the current repository. |

Add focused tests when the task requires them or existing coverage misses a specific regression. Confirm that the expected tests ran and finished. Fix failures caused by the change. For any remaining failure or unavailable check, report the command, the observed result, and its effect on confidence in the deliverable.

## Commit and publish

- Review `git status`, the diff, and `git diff --check` before delivery. Stage only the paths or hunks that belong to the task, and inspect the staged diff before committing. Keep credentials, local caches, and incidental generated files out of commits.
- By default, make a focused local commit for completed repository changes. Follow any request for a draft or an uncommitted patch. Use a short imperative subject that describes the change, such as `Add spatial café audio`.
- Push when the user requests it. Verify the remote and destination branch, fetch newer remote commits as needed, and integrate them while preserving shared history. Resolve ordinary conflicts within scope, rerun affected checks, and verify the remote contains the intended commit. Get explicit authorization for destructive Git operations or rewriting shared history.

## Report the outcome

Finish with what changed, the checks and outcomes, the commit ID when applicable, and any material assumptions or remaining gaps. If completion needs outside action, give the exact blocker and the action that would unblock it.
