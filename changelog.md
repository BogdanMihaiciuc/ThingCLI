# 1.7.3

Removes the `projectType` aspect from project entities, which prevented the projects from being imported on Thingworx 8.5 or earlier. ([CozminM](https://github.com/CozminM))

Updates to transformer 1.7.3 with a similar change for compatibility with previous thingworx versions.

# 1.7.2

Updates to transformer 1.7.2. For more information, see [1.7.2](https://github.com/BogdanMihaiciuc/ThingTransformer/releases/tag/1.7.2)

# 1.7.1

Updates to transformer 1.7.1, which disables downleveling arrow functions to bound functions.

# 1.7

When printing out diagnostic messages, if the message indicates a relevant line it will be printed out before the message.

Creating a project via the `init` command no longer adds `@types/node` to the project dependencies.

Adds support in multi-project repositories for projects that contain only XML entities. This makes it possible to have a repository that has a ThingWorx project written in typescript (like the backend) and another that has only XML entities (like the mashups). ([stefan-lacatus](https://github.com/stefan-lacatus)) 

Adds a new `push` command that packages and uploads the xml projects using SourceControlImport, while uploading typescript projects as extensions. ([stefan-lacatus](https://github.com/stefan-lacatus)) 

Adds a new `pull` command that pulls all xml project entities and updates the local XML files. ([stefan-lacatus](https://github.com/stefan-lacatus)) 

Adds a new `--projects` argument that can be specified for the `build`, `upload`, `deploy`, `pull` and `push` commands to limit the projects that are included when processing those commands.

# 1.6.1

Updates to transformer version 1.6.1, which includes the type definitions for `SQLThing`.

# 1.6

Adds support for specifying which .env file to use. ([stefan-lacatus](https://github.com/stefan-lacatus)) 

Resolves an issue with the `install` command that caused an error to be thrown when attempting to import `Resource` entities.

# 1.5.1

The `upload` command can now take an additional argument `--extensions` that, when specified, causes the command to also upload any extensions in the `extensions` directory in the root of the project to the thingworx server before uploading the project extension.

When specifying the `@deploy` decorator on thing templates or thing shapes, the deploy command will now invoke the relevant services on things that derive from them.

When `@deploy` services return a single value, these values will now be printed out.

Resolve an issue that caused the build process to fail in CICD pipelines where the stdout output was redirected. ([stefan-lacatus](https://github.com/stefan-lacatus)) 

# 1.5

The `--uml` argument is now deprecated for the `install` command and will print out a warning when used.

Added support for the `--trace` argument for the `build` command and related commands to create a profiling build.

While building files, a progress bar is now displayed to track the progress. Additionally, the elapsed time will now be displayed at the end of the transform process.

Adds support for a new option `copyEntities` that can be defined in `twconfig.json` that, when enabled, adds an additional step of copying any XML files in the `src` folder(s) to the build output folder. Note that files will be copied with no additional modifications. They won't be assigned to the configured project and any other metadata, such as the change history will be retained.

Resolves an issue with the `init` command where the version of the node type declarations was incompatible with the Thingworx type definitions. An older version is now used for new projects.

# 1.4.10

Updates to thing transformer 1.4.8. For more information, see [Thing Transformer 1.4.8](https://github.com/BogdanMihaiciuc/ThingTransformer/releases/tag/1.4.8)

# 1.4.9

Updates to thing transformer 1.4.7. For more information, see [Thing Transformer 1.4.7](https://github.com/BogdanMihaiciuc/ThingTransformer/releases/tag/1.4.7)

# 1.4.8

Resolves an issue when using `install` with the `--uml` argument that caused a JSON error to be thrown.

# 1.4.7

When running the `install` command, the generated files will now also have tsdoc comments on the entity classes themselves, in addition to just the collection declarations.

When running the `install` command, the argument documentation is now in a format that is compatible with `typedoc`.

Adds support for a new argument `--uml` that can be specified for the `install` command. When specified, the generated declarations will only use direct type references for thing names and infotables, making it possible to generate UML diagrams with the proper connections. Additionally the arguments object used by services will be converted into a regular argument list. Note that declarations created using this argument cannot be used for development because they no longer use the proper types.

Adds support for the `excludedEntities` property in `twconfig.json`, which is used to prevent certain dependencies of entities from being included when using the `install` command.

# 1.4.6

Updates to thing transformer 1.4.6. For more information, see [Thing Transformer 1.4.6](https://github.com/BogdanMihaiciuc/ThingTransformer/releases/tag/1.4.6)

# 1.4.5

Updates to thing transformer 1.4.5. For more information, see [Thing Transformer 1.4.5](https://github.com/BogdanMihaiciuc/ThingTransformer/releases/tag/1.4.5)

# 1.4.0

Resolves an issue that broke the `generate-api` command.

Resolves an issue that caused https requests to thingworx servers to fail. ([stefan-lacatus](https://github.com/stefan-lacatus)) 

# 1.3.1

Updates to thing transformer 1.3.1 which resolves an issue where inline SQL statements would compile into code with syntax errors.

# 1.3

Adds a schema to newly created `twconfig.json` files.

Newly created projects now have the `noImplicitOverride` set to `true` in `tsconfig.json`.

Improved the speed of generating declarations and API exports by removing the standard typescript transformations which are discarded for these processes anyway.

Adds support for generating static field definitions objects and a function to create an infotable given an array of row objects and a data shape name when generating an API declarations file, to be used when invoking thingworx endpoints. ([stefan-lacatus](https://github.com/stefan-lacatus))

Adds support for running an additional set of validations when building projects. Classes will now be checked for incorrectly overriding members of their bases classes when possible.

Adds support for displaying warning messages reported by the transformer when building projects.

# 1.2.1

Updates thing transformer to v0.22.1 which resolves an issue that caused global functions to not be inlined when compiling on windows systems.

# 1.2

Adds support for thing transformer v0.22.

Adds a `generate-api` command that generates an API declarations file that can be consumed by a separate frontend or node project. ([stefan-lacatus](https://github.com/stefan-lacatus))

# 1.1.1

Resolves an issue where, with certain configurations, the declarations generated via the watch command would trigger a new declaration generation leading to a loop.

# 1.1

Adds support for generating method helpers, that are useful variables that can be used for logging. The following variables can be enabled: `METHOD_NAME`, `CLASS_NAME`, `FILE_PATH` and `LOG_PREFIX`. ([stefan-lacatus](https://github.com/stefan-lacatus))

Resolves an issue where, on windows systems, the declarations generated via the watch command would trigger a new declaration generation leading to a loop.

# 1.0.4

Added a `retainVersion` argument for the `upload` and `deploy` command to prevent automatic version increase.

# 1.0.3

Resolves an issue with an improperly declared import that prevented building this project without a local copy of thing transformer.

Resolves an issue that caused multiproject builds to fail on windows systems.

# 1.0.2

Resolves an issue where using the `init` command with an app key would cause an incorrect `.env` file to be generated and no debug launch configuraition to be created.

Resolves an issue where using the `add-project` command would cause an incorrect `tsconfig.json` file to be generated for the new project. The configuration had the incorrect path to the collection declaration files, preventing the subprojects from accessing their own entities via collections.