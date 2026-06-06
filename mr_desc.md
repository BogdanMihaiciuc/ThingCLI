# Expose `ThingCLI` as a reusable JS API

## Summary

This change separates the CLI entrypoint from the package root so `bm-thing-cli` can be used from scripts as a normal JavaScript dependency, while keeping `twc` as the command-line binary.

## Changes

- move the CLI program from `src/index.ts` to `src/CLI.ts`
- make `src/index.ts` the package library entrypoint
- export `TWClient` and connection-related types from the package root
- emit declaration files during build
- point the package `bin` to `dist/CLI.js`
- extend `TWClient` with a few script-friendly primitives:
  - `resetConnection()`
  - `setConnectionDetails(...)`
  - `invokeEndpoint(endpoint, body?, method?)`
  - `invokeThingService(...)`
  - `exportEntity(...)`
  - `importEntityFile(...)`

## Why

Before this change, consumers effectively had to treat `ThingCLI` as a CLI only.

This makes two usage modes explicit:

- `twc ...` for command-line workflows
- `import { TWClient } from "bm-thing-cli"` for scripted workflows

That is useful for environment migration, rehost, setup, and validation scripts where it is cleaner to stay in-process than to shell out repeatedly.

Note that this does NOT expose all of the existing CLI functionality as JS APIs, only a few primitives that are useful for scripting. The CLI remains the main interface to the package.

## Example

One concrete use case is rehosting to a new environment:

1. connect to a source environment
2. export a user/group or configuration entity
3. export runtime data
4. switch to a target environment
5. import the entity and data
6. call a setup service

Minimal example:

```ts
import { TWClient } from "bm-thing-cli";

async function main() {
  TWClient.setConnectionDetails({
    thingworxServer: "http://source.example.com",
    thingworxUser: "Administrator",
    thingworxPassword: "secret",
  });

  await TWClient.exportEntity("Things", "Example.Configuration_TH", "./tmp/Example.Configuration_TH.xml");
  await TWClient.dataExport("DataTables", "Example.Settings.DT", "./tmp/Example.Settings.DT.twx");

  TWClient.setConnectionDetails({
    thingworxServer: "http://target.example.com",
    thingworxUser: "Administrator",
    thingworxPassword: "secret",
  });

  await TWClient.importEntityFile("./tmp/Example.Configuration_TH.xml");
  await TWClient.dataImport("./tmp", "Example.Settings.DT.twx");
  await TWClient.invokeThingService("Example.Configuration_TH", "PrepareEnvironment", {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

