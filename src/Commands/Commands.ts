/**
 * An enum that contains the commands that may be used with this
 * command line utility.
 */
export const enum Commands {

    /**
     * The declarations command that builds the thingworx collection declarations.
     */
    declarations = 'declarations',

    /**
     * The declarations command that builds the thingworx collection declarations.
     */
    generateAPI = 'generate-api',

    /**
     * The watch command that monitors files and triggers the declarations command whenever
     * anything changes.
     */
    watch = 'watch',

    /**
     * The build command that builds the thingworx entity xml files from the typescript sources.
     */
    build = 'build',

    /**
     * The upload command that builds the thingworx the project and uploads it to the thingworx server.
     */
    upload = 'upload',

    /**
     * The deploy command that builds the thingworx the project, uploads it to the thingworx server, 
     * then invokes all of the services marked with the `@deploy` decorator.
     */
    deploy = 'deploy',

    /**
     * The remove command that removes the current version of the extension from the thingworx server.
     */
    remove = 'remove',

    /**
     * The add-project command that adds a thingworx project to the repository.
     */
    addProject = 'add-project',

    /**
     * The install command that pulls the declaration of entity dependencies from the thingworx server.
     */
    install = 'install',

    /**
     * The init command that initializes a thingworx project in an empty directory.
     */
    init = 'init',

    /**
     * The upgrade command that upgrades from a gulpfile build system to a bm-thing-cli build system.
     */
    upgrade = 'upgrade',

    /**
     * The pull command pulls project entities from the specified projects from the server as XML files.
     * If no projects are specified, the command pulls entities from all local XML projects.
     */
    pull = 'pull',

    /**
     * The push command uploads project entities to the server based on the project kind:
     *  * Typescript projects are built and uploaded as extensions
     *  * XML projects are uploaded as regular, editable entities
     */
    push = 'push',

    /**
     * The install-widgets command that pulls the declaration of widget types from the thingworx server.
     */
    installWidgets = 'install-widgets',
}