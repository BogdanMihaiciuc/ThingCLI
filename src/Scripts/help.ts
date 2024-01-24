import { Commands } from "../Commands/Commands";

const [path, bin, helpCommand, command, ...args] = process.argv;

/**
 * Describes the `merged` argument, which is used by multiple commands.
 */
const SharedArgumentMerged = 
/*
 • merged           When
*/
` • \x1b[1mmerged\x1b[0m           When used with a multi-project repository, this causes
                    the build output to be a single extension that contains all
                    sub-projects. In a single-project repository, this argument
                    has no effect.`;

/**
 * Describes the `separate` argument, which is used by multiple commands.
 */
const SharedArgumentSeparate = 
` • \x1b[1mseparate\x1b[0m         When used with a multi-project repository, this causes
                    the build output to be multiple single extensions, one for
                    each sub-project. The zip folder will contain a single zip
                    archive, that can be imported into Thingworx and will 
                    contain multiple extensions. The archive can be decompressed
                    to obtain the individual extensions for each project.
                    In a single-project repository, this argument has no effect.
                    This is the default behaviour if no other rguments are
                    specified.`;

/**
 * Describes the `debug` argument, which is used by multiple commands.
 */
const SharedArgumentDebug = 
` • \x1b[1mdebug\x1b[0m            Emits a \x1b[1mdebug\x1b[0m build which can be used together
                    with the debug extensions to debug the project services.
                    🔶 \x1b[1mDebug builds require a properly configured server to run.\x1b[0m
                    It is possible to combine this argument with \x1b[1m--trace\x1b[0m
                    to create a build that supports both tracing and debugging.
                    For more details, see:
                    https://github.com/BogdanMihaiciuc/ThingworxVSCodeDebugger/wiki/Usage-Guide

                    The required extensions are:
                     ◦ \x1b[1mBMDebugServer\x1b[0m - configure on the Thingworx server
                    https://github.com/BogdanMihaiciuc/BMDebugServer
                     ◦ \x1b[1mThingworxVSCodeDebugger\x1b[0m - install in VSCode
                    https://github.com/BogdanMihaiciuc/ThingworxVSCodeDebugger`;

/**
 * Describes the `trace` argument, which is used by multiple commands.
 */
const SharedArgumentTrace = 
` • \x1b[1mtrace\x1b[0m            Emits a \x1b[1mtrace\x1b[0m build which can be used together
                    with the trace extensions to debug service performance.
                    It is possible to combine this argument with \x1b[1m--debug\x1b[0m
                    to create a build that supports both tracing and debugging.
                    🔶 \x1b[1mTrace builds require a properly configured server to run.\x1b[0m
                    The required extensions are:
                     ◦ \x1b[1mBMProfiler\x1b[0m - configure on the Thingworx server
                       https://github.com/BogdanMihaiciuc/BMProfiler`;

/**
 * Describes the `projects` argument, which is used by multiple commands.
 */
const SharedArgumentProjects = 
` • \x1b[1mprojects\x1b[0m         Usage: --projects=<project1>,<project2>,...
                    When used in a multi-project repository, this limits the
                    command to only include the projects specified by this
                    argument. Other projects will be excluded from the result.`;

/**
 * Describes the `extensions` argument, which is used by multiple commands.
 */
const SharedArgumentExtensions = 
` • \x1b[1mextensions\x1b[0m       When specified, this will also upload the extension archives
                    placed in the \x1b[1mextensions\x1b[0m  folder at the root of the project
                    folder. These extensions are installed as a single multi
                    extension package, before any other project extension(s).`;

/**
 * Describes the `remove` argument, which is used by multiple commands.
 */
const SharedArgumentRemove = 
` • \x1b[1mremove\x1b[0m           When specified, this will remove the currently installed
                    version of the project extension(s) prior to uploading the
                    newly build version. If there are multiple sub-projects in
                    the repository this will attempt to remove them in
                    dependency order.`;

/**
 * Describes the `retain-version` argument, which is used by multiple commands.
 */
const SharedArgumentRetainVersion = 
` • \x1b[1mretain-version\x1b[0m   When specified, the package version will not be
                    automatically inceremented for this project.`;

/**
 * An interface that describes the parameters that users must provide in order to
 * create a new project.
 */
export async function help() {

    // Always print out information about syntax
    console.log(`For information about the project types and features see the handbook at:
TBD`);

    switch (command as Commands) {
        case Commands.declarations:
            console.log(`
\x1b[1mdeclarations\x1b[0m - Builds the collection declarations.

Usage:
twc declarations

Builds the collections declaration for the current project and all sub-projects.
Collection declarations create the types that make it possible to access
entities via their collections (e.g. "ThingTemplates.GenericThing").

Declarations are also automatically created when running the \x1b[1mbuild\x1b[0m command.
`);
            break;
        case Commands.watch:
            console.log(`
\x1b[1mwatch\x1b[0m - Watches the source files and runs declarations on any change.

Usage:
twc watch

Watches the project folder and whenever any file is changed, builds the
collections declarationfor the current project and all sub-projects. Collection
declarations create the types that make it possible to access entities via their
collections (e.g. "ThingTemplates.GenericThing").

After this command is run, it will keep running to watch for changes until
stopped.

Declarations are also automatically created when running the \x1b[1mbuild\x1b[0m command.
`);
            break;
        case Commands.build:
            console.log(`
\x1b[1mbuild\x1b[0m - Builds the thingworx extension.

Usage:
twc build [--merged] [--separate] [--debug] [--trace] [--projects]

Compiles the project into a thingworx extension, creating two output folders:
 • \x1b[1mbuild\x1b[0m - contains the XML files which can be imported as regular entities
 • \x1b[1mzip\x1b[0m - contains a zip archive that can be imported as an extension

The following arguments can be specified for this command:
${SharedArgumentMerged}

${SharedArgumentSeparate}

${SharedArgumentDebug}

${SharedArgumentTrace}

${SharedArgumentProjects}
`);
            break;
        case Commands.upload:
            console.log(`
\x1b[1mupload\x1b[0m - Builds the thingworx extension, then uploads it to the server.

Usage:
twc upload [--merged] [--separate] [--debug] [--trace] [--extensions]
           [--remove] [--retain-version] [--projects]

Increases the patch version of the project by 1 and compiles the project files
into a thingworx extension, creating two output folders:
 • \x1b[1mbuild\x1b[0m - contains the XML files which can be imported as regular entities
 • \x1b[1mzip\x1b[0m - contains a zip archive that can be imported as an extension

This command will then upload the archive in the zip folder to the Thingworx
server configured in either the .env file or the twconfig.json file (with .env
having priority).

The following arguments can be specified for this command:
${SharedArgumentMerged}

${SharedArgumentSeparate}

${SharedArgumentDebug}

${SharedArgumentTrace}

${SharedArgumentProjects}

${SharedArgumentExtensions}

${SharedArgumentRemove}

${SharedArgumentRetainVersion}
`);
            break;
        case Commands.deploy:
            console.log(`
\x1b[1mdeploy\x1b[0m - Builds the thingworx extension, then uploads it to the server
and runs all services with the \x1b[1m@deploy\x1b[0m decorator.

Usage:
twc deploy [--merged] [--separate] [--debug] [--trace] [--extensions]
           [--remove] [--retain-version] [--projects]

Increases the patch version of the project by 1 and compiles the project files
into a thingworx extension, creating two output folders:
 • \x1b[1mbuild\x1b[0m - contains the XML files which can be imported as regular entities
 • \x1b[1mzip\x1b[0m - contains a zip archive that can be imported as an extension

This command will then upload the archive in the zip folder to the Thingworx
server configured in either the .env file or the twconfig.json file (with .env
having priority).

After the extension is installed, all services decorated with \x1b[1m@deploy\x1b[0m will be
invoked one by one. There is no guaranteed order in which these services are run
so they should not depend on eachother.

The following arguments can be specified for this command:
${SharedArgumentMerged}

${SharedArgumentSeparate}

${SharedArgumentDebug}

${SharedArgumentTrace}

${SharedArgumentProjects}

${SharedArgumentExtensions}

${SharedArgumentRemove}

${SharedArgumentRetainVersion}
`);
            break;
        case Commands.push:
            console.log(`
\x1b[1mpush\x1b[0m - Builds the thingworx extension, then uploads it to the server,
and uploads any XML projects as regular editable entities.

Usage:
twc push [--merged] [--separate] [--debug] [--trace] [--extensions] [--remove]
         [--retain-version] [--projects]

Increases the patch version of the project by 1 and compiles the project files
into a thingworx extension, creating two output folders:
 • \x1b[1mbuild\x1b[0m - contains the XML files which can be imported as regular entities
 • \x1b[1mzip\x1b[0m - contains a zip archive that can be imported as an extension

This command will then upload the archive in the zip folder to the Thingworx
server configured in either the .env file or the twconfig.json file (with .env
having priority).

If there are any XML projects in the repository, all XML files in those projects
will be imported as regular editable entities that can be edited in composer.

This is meant to combine with the \x1b[1mpull\x1b[0m command to make it possible to
include unsupported entity kinds by editing them using composer.

The following arguments can be specified for this command:
${SharedArgumentMerged}

${SharedArgumentSeparate}

${SharedArgumentDebug}

${SharedArgumentTrace}

${SharedArgumentProjects}

${SharedArgumentExtensions}

${SharedArgumentRemove}

${SharedArgumentRetainVersion}
`);
            break;
        case Commands.remove:
            console.log(`
\x1b[1mremove\x1b[0m - Removes the project extension from the Thingworx server, if
it was installed. This has no effect on XML projects uploaded using the \x1b[1mpush\x1b[0m
command.

Usage:
twc remove [--merged] [--separate]

Removes the project extension, if it was installed. In multi-project mode, if
the projects have dependencies, they will be removed in dependency order. XML
projects uploaded using the \x1b[1mpush\x1b[0m command are not affected because the
entities are not associated to any extension.

The following arguments can be specified for this command:
 • \x1b[1mmerged\x1b[0m           Must be used in a multi-project repository if the
                    extension was built using this argument.

 • \x1b[1mseparate\x1b[0m         Must be used in a multi-project repository if the
                    extension was built using this argument. This is the default
                    behaviour if no argument is used.

                   `);
            break;
        case Commands.install:
            console.log(`
\x1b[1minstall\x1b[0m - Pulls the declarations of the entities specified in twconfig.json
so that they can be referenced.

Usage:
twc install

Pulls all the entitity references declared as dependencies in the twconfig.json
file at the root of the repository folder. This will pull the declarations for
all entity, project and extension dependencies declared in that file.

Note that the declarations only allow you to reference these entities and their
properties, services and events but not to modify them.

These declarations are saved in a \x1b[1mstatic\x1b[0m folder at the root of the
repository folder.`);
            break;
        case Commands.installWidgets:
            console.log(`
\x1b[1minstall-widgets\x1b[0m - Creates the type declarations and defaults for the widgets
in the specified definitions file.

Usage:
twc install-widgets <file>

Creates a type declarations file and a defaults file for the widgets in the
specified file. The file must contain the output of the widget export extension
ran in a Thingworx environment that contains the widgets for which the
declarations should be generated.

Note that the declarations only allow you to reference these widgets in mashup
files, but the environments on which the project is installed must still have
the widget extensions installed for the mashups referencing them to function.

These declarations are saved in a \x1b[1mui-static\x1b[0m folder at the root of the
repository folder.`);
            break;
        case Commands.addProject:
            console.log(`
\x1b[1madd-prooject\x1b[0m - adds a new project to the repository, converting it into a
multi-project repository if it wasn't already.

Usage:
twc add-project [--ui]

Adds a new project to the repository. If the repository is not in multi-project
mode, you will first have to confirm you want to convert it to multi-project.
Confirming will reorganize the \x1b[1msrc\x1b[0m folder.

The following arguments can be specified for this command:
 • \x1b[1mui\x1b[0m               If specified, causes the newly created project to be
                    a UI only project. These projects compile to the current ES
                    version rather than ES5 so backend services might not work
                    if you include them in these kinds of projects.

`);
            break;
        case Commands.pull:
            console.log(`
\x1b[1mpullt\x1b[0m - pulls XML entities from the server for XML projects.

Usage:
twc pull --xml [--projects]

Pulls all entities in all XML-only projects from the server specified in either
the .env file or twconfig.json. These are the entities in the projects having
the same name as the local XML-only project names. Typescript projects are
ignored by this command.

This does not keep track or attempt to sync the local projects to the one on
the server - any local entities that have been deleted on the server will not
be removed.

The following arguments can be specified for this command:
 • \x1b[1mxml\x1b[0m              At least one format argument must be specified.
                    Specifies that the entities should be pulled in XML format.
                    No other formats are currently supported, so this argument
                    is required.

${SharedArgumentProjects}
`);
            break;
        case Commands.init:
            console.log(`
\x1b[1minit\x1b[0m - Should be run in an empty folder to initialize a new project.

Usage:
twc init

Initializes a new empty project in the folder where this command is run. This
takes no arguments, but instead asks for the project details afterwards.

After filling out the details requested the folder will contain an empty project
with all configuration files and dependencies, but no source files.
`);
            break;
        case Commands.upgrade:
            console.log(`
\x1b[1mupgrade\x1b[0m - Upgrades a project from the old gulp-based build system to \x1b[1mtwc\x1b[0m.

Usage:
twc upgrade

Upgrades a project from the old gulp-based build system to twc. This doesn't
upgrade between different twc versions as these are meant to be backwards
compatible.

This has no effect when run anywhere other than an old gulp-based project.
`);
            break;
        case Commands.generateAPI:
            console.log(`
\x1b[1mgenerate-api\x1b[0m - 🔶 \x1b[1mEXPERIMENTAL:\x1b[0m creates declaration files that can
be used to reference the project's entities outside of Thingworx.

Usage:
twc generate-api

Creates the following two files:
 • \x1b[1mapi/Generated.d.ts\x1b[0m - contains the declarations of the entites
 • \x1b[1mapi/Runtime.d.ts\x1b[0m - contains the declaration of data shape types

Only entities marked with the \x1b[1m@exported\x1b[0m decorator are included in these
declarations.

🔶 \x1b[1mEXPERIMENTAL: The format of the declarations file is not finalized and
might change in a future version.\x1b[0m
`);
            break;
    }
}