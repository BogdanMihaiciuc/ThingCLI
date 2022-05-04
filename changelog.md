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