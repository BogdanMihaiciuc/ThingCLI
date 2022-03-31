# 1.0.4

Added a `retainVersion` argument for the `upload` and `deploy` command to prevent automatic version increase.

# 1.0.3

Resolves an issue with an improperly declared import that prevented building this project without a local copy of thing transformer.

Resolves an issue that caused multiproject builds to fail on windows systems.

# 1.0.2

Resolves an issue where using the `init` command with an app key would cause an incorrect `.env` file to be generated and no debug launch configuraition to be created.

Resolves an issue where using the `add-project` command would cause an incorrect `tsconfig.json` file to be generated for the new project. The configuration had the incorrect path to the collection declaration files, preventing the subprojects from accessing their own entities via collections.