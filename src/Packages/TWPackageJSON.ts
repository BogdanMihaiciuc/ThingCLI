/**
 * A subset of the package.json file for a thingworx vscode project that contains
 * the thingworx connection details.
 */
export interface TWPackageJSONConnectionDetails {

    /**
     * The URL to the thingworx server.
     */
    thingworxServer?: string;

    /**
     * The username to use when connecting to the thingworx server.
     */
    thingworxUser?: string;

    /**
     * The password to use when connecting to the thingworx server.
     */
    thingworxPassword?: string;

    /**
     * When specified, has priority over `thingworxUser` and `thingworxPassword`.
     * The app key to use when connecting to the thingworx server.
     */
    thingworxAppKey?: string;
}

/**
 * The interface for a package.json file with the thingworx vscode project specific
 * entries.
 */
export interface TWPackageJSON extends TWPackageJSONConnectionDetails {
}