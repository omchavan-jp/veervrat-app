## ADDED Requirements

### Requirement: Environment-varying configuration resolved at runtime

Configuration whose value differs between deployed environments MUST be resolved when the
application runs, never frozen into the built artifact.

The deployment model promotes a single built image from UAT to production without rebuilding.
Any value resolved at build time is therefore identical in every environment that image reaches.
For a value that must differ per environment, this is not a configuration choice but a defect:
the environment's own setting is silently ignored.

The discriminator MUST be applied to every such value: **does this value describe the image, or
the environment the image runs in?** Values describing the image (for example the source commit)
MAY be baked. Values describing the environment (hostnames, origins, feature availability) MUST
NOT be.

Specifically, environment-varying values MUST NOT be supplied through `NEXT_PUBLIC_*`
variables, which the bundler inlines into client JavaScript, nor through evaluation of
`next.config.ts` (including `rewrites`, `redirects`, and `headers`), which Next.js freezes into
the build output.

#### Scenario: The same image serves different environments correctly

- **GIVEN** one built web image promoted unchanged to both UAT and production
- **WHEN** it runs in each environment with that environment's configuration present
- **THEN** each running instance resolves the api base URL, site URL, and feature toggles of
  the environment it is running in

#### Scenario: A tier never addresses another environment's services

- **GIVEN** the production web tier
- **WHEN** it issues a request to the api
- **THEN** the request addresses the production api, and never the UAT api

#### Scenario: Image-describing values remain baked

- **GIVEN** a value that identifies the built artifact, such as the source commit SHA
- **WHEN** that image runs in any environment
- **THEN** the value is identical in every environment, having been fixed at build time

### Requirement: Deploys verify cross-tier wiring

The deployment pipeline MUST verify, after deploying an environment, that its web tier resolves
to that same environment's api.

Per-service health checks cannot detect misdirected wiring: each service reports healthy while
the tiers address the wrong peers. Configuration inspection is likewise insufficient, because
the stored configuration may be correct while the running artifact ignores it.

#### Scenario: Misdirected wiring fails the deploy

- **GIVEN** a deployed environment whose web tier resolves to a different environment's api
- **WHEN** the post-deploy verification runs
- **THEN** the deploy fails and names the mismatch

#### Scenario: Correct wiring passes

- **GIVEN** a deployed environment whose web tier resolves to its own api
- **WHEN** the post-deploy verification runs
- **THEN** the deploy succeeds
