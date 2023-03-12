import type { TWPackageJSON, TWPackageJSONConnectionDetails } from '../Packages/TWPackageJSON';


/**
 * The options that may be passed to a thingworx request.
 */
interface TWClientRequestOptions {

    /**
     * The endpoint to invoke/
     */
    url: string;

    /**
     * An optional set of HTTP headers to include in addition to the
     * default thingworx headers.
     */
    headers?: Record<string, string>;

    /**
     * An optional text or JSON body to send.
     */
    body?: string | Record<string, any>;

    /**
     * An optional multipart body to send.
     */
    formData?: Record<string, fs.ReadStream>;
}

/**
 * The interface for an object that contains the response returned from
 * a TWClient request.
 */
interface TWClientResponse {

    /**
     * The response's body.
     */
    body: string;

    /**
     * The response headers.
     */
    headers: http.IncomingHttpHeaders;

    /**
     * The status code.
     */
    statusCode?: number;

    /**
     * The status message.
     */
    statusMessage?: string;
}

/**
 * A class that is responsible for performing requests to a thingworx server.
 */
export class TWClient {

    /**
     * The cached package.json contents.
     */
    private static _cachedPackageJSON?: any;

    /**
     * The contents of the project's package.json file.
     */
    private static get _packageJSON() {
        if (this._cachedPackageJSON) return this._cachedPackageJSON;
        this._cachedPackageJSON = require(`${process.cwd()}/package.json`) as TWPackageJSON;
        return this._cachedPackageJSON;
    }

    /**
     * The cached connection details.
     */
    private static _cachedConnectionDetails?: TWPackageJSONConnectionDetails;

    /**
     * The connection details to be used.
     */
    private static get _connectionDetails(): TWPackageJSONConnectionDetails {
        // Return the cached connection details if they exist.
        if (this._cachedConnectionDetails) {
            return this._cachedConnectionDetails;
        }

        // Otherwise try to get them from the environment variables, falling back to loading
        // them from package.json if they are not defined in the environment.
        if (!process.env.THINGWORX_SERVER) {
            console.error('The thingworx server is not defined in your environment, defaulting to loading from package.json');
            this._cachedConnectionDetails = {
                thingworxServer: this._packageJSON.thingworxServer,
                thingworxUser: this._packageJSON.thingworxUser,
                thingworxPassword: this._packageJSON.thingworxPassword,
                thingworxAppKey: this._packageJSON.thingworxAppKey
            };
        }
        else {
            this._cachedConnectionDetails = {
                thingworxServer: process.env.THINGWORX_SERVER,
                thingworxUser: process.env.THINGWORX_USER,
                thingworxPassword: process.env.THINGWORX_PASSWORD,
                thingworxAppKey: process.env.THINGWORX_APPKEY
            };
        }

        return this._cachedConnectionDetails;
    };

    /**
     * Returns the thingworx server.
     */
    static get server(): string | undefined {
        return this._connectionDetails.thingworxServer;
    };

    /**
     * Performs a request, returning a promise that resolves with its response.
     * @param options       The requests's options.
     * @returns             A promise that resolves with the response when
     *                      the request finishes.
     */
    private static async _performRequest(options: TWClientRequestOptions, method: 'get' | 'post' = 'post'): Promise<TWClientResponse> {
      const { thingworxServer: host } = this._connectionDetails;

      // Automatically prepend the base thingworx url
      options.url = `${host}/Thingworx/${options.url}`;

      // Automatically add the thingworx specific headers to options
      const headers = Object.assign({}, options.headers || {}, {
        'X-XSRF-TOKEN': 'TWX-XSRF-TOKEN-VALUE',
        'X-THINGWORX-SESSION': 'true',
        Accept: 'application/json',
      });

      const fetchOptions: RequestInit = { method, headers };

      // Try to authorize using an app key if provided, which is the preferred method
      if (this._connectionDetails.thingworxAppKey) {
        headers.appKey = this._connectionDetails.thingworxAppKey;
      }
      // Otherwise use the username and password combo
      else if (
        this._connectionDetails.thingworxUser &&
        this._connectionDetails.thingworxPassword
      ) {
       headers.Authorization = 'Basic ' + Buffer.from(this._connectionDetails.thingworxUser + ':' + this._connectionDetails.thingworxPassword).toString('base64');
      } else {
        throw new Error(
          'Unable to authorize a request to thingworx because an app key or username/password combo was not provided.'
        );
      }

      if (options.body) {
        // If the body is specified as an object, stringify it
        if (typeof options.body == 'object') {
          fetchOptions.body = JSON.stringify(options.body);
        } else {
          fetchOptions.body = options.body;
        }
      } else if (options.formData) {
        fetchOptions.body = options.formData;
      }

      const response = await fetch(options.url, fetchOptions);

      return {
        body: await response.text(),
        headers: response.headers,
        statusCode: response.status,
        statusMessage: response.statusText,
      };
    }

    /**
     * Deletes the given extension from the thingworx server.
     * @param name      The name of the extension to remove.
     * @returns         A promise that resolves with the server response when the
     *                  operation finishes.
     */
    static async removeExtension(name: string): Promise<TWClientResponse> {
        return await this._performRequest({
            url: `Subsystems/PlatformSubsystem/Services/DeleteExtensionPackage`,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {packageName: name}
        });
    }

    /**
     * Imports the given extension package to the thingworx server.
     * @param data      A form data object containing the extension to import.
     * @returns         A promise that resolves with the server response when
     *                  the operation finishes.
     */
    static async importExtension(formData: FormData): Promise<TWClientResponse> {
        return await this._performRequest({
            url: `ExtensionPackageUploader?purpose=import`,
            formData: formData,
        });
    }

    /**
     * Sends a POST request to the given endpoint, with an empty body.
     * @param endpoint      The endpoint.
     * @returns             A promise that resolves with the server response when
     *                      the operation finishes.
     */
    static async invokeEndpoint(endpoint: string): Promise<TWClientResponse> {
        return await this._performRequest({
            url: endpoint,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Retrieves the metadata of the given entity.
     * @param name          The name of the entity.
     * @param kind          The kind of entity.
     * @returns             A promise that resolves with the server response when
     *                      the operation finishes.
     */
    static async getEntity(name: string, kind: string): Promise<TWClientResponse> {
        const url = `${kind}/${name}${kind == 'Resources' ? '/Metadata' : ''}`;
        return await this._performRequest({url}, 'get');
    }

    /**
     * Retrieves a list containing the entities that the given entity depends on.
     * @param name          The name of the entity.
     * @param kind          The kind of entity.
     * @returns             A promise that resolves with the server response when
     *                      the operation finishes.
     */
    static async getEntityDependencies(name: string, kind: string): Promise<TWClientResponse> {
        const url = `${kind}/${name}/Services/GetOutgoingDependencies`;
        return await this._performRequest({
            url,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Retrieves a list containing the entities that are part of the given project.
     * @param name          The name of the project.
     * @returns             A promise that resolves with the server response when
     *                      the operation finishes.
     */
    static async getProjectEntities(name: string): Promise<TWClientResponse> {
        const url = `Resources/SearchFunctions/Services/SpotlightSearch`;
        return await this._performRequest({
            url,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                searchExpression: '**',
                withPermissions: false,
                sortBy: 'name',
                isAscending: true,
                searchDescriptions: true,
                aspects: {
                    isSystemObject: false
                },
                projectName: name,
                searchText: ''
            })
        });
    }

    /**
     * Retrieves the typings file for the given extension package.
     * @param name          The name of the extension package.
     * @returns             A promise that resolves with the server response when
     *                      the operation finishes.
     */
    static async getExtensionTypes(name: string): Promise<TWClientResponse> {
        const url = `Common/extensions/${name}/ui/@types/index.d.ts`;
        return await this._performRequest({url}, 'get');
    }

    /**
     * Retrieves the package details of the given extension package.
     * @param name          The name of the extension package.
     * @returns             A promise that resolves with the server response when
     *                      the operation finishes.
     */
    static async getExtensionPackageDetails(name: string): Promise<TWClientResponse> {
        return await this._performRequest({
            url: 'Subsystems/PlatformSubsystem/Services/GetExtensionPackageDetails',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({packageName: name})
        });
    }

}
