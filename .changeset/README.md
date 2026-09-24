# Changesets

Every PR that changes a published package or the extension adds a changeset:

```sh
pnpm changeset
```

All `@rustrak/openshowcase-*` packages and the extension are a `fixed` group, so they always share one version. Merging to `main` opens a "chore: version packages" PR; merging that PR publishes the packages to npm and creates the `vX.Y.Z` GitHub release with the extension zip attached.
