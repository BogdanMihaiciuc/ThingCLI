import type { TWEntityDefinition, TWPropertyDefinition, TWServiceDefinition, TWServiceParameter, TWSubscriptionDefinition } from 'bm-thing-transformer';

/**
 * A union between the different ways in which service definitions are represented in an entity metadata json.
 */
declare type TWMetadataServiceDefinition = TWServiceDefinition & {Inputs: {fieldDefinitions: TWServiceParameter}; resultType: TWPropertyDefinition};

/**
 * An array that contains the thing package names which require a generic argument.
 */
export const GenericThingPackages = ['StreamThing', 'DataTableThing', 'RemoteStream', 'RemoteDataTable'];

/**
 * A regex that is used to test if a string has any non-alphanumeric character.
 */
export const NonAlphanumericRegex = /[^a-zA-Z\d_]/;

/**
 * A regex that is used to replace non alphanumeric characters in strings.
 */
export const NonAlphanumericRegexGlobal = /[^a-zA-Z\d_]/g;

/**
 * A class that contains various static methods for parsing entity metadata
 * objects into typescript class declarations.
 */
export class TWMetadataParser {

    /**
     * Returns a string that represents the typescript type that should be used to represent
     * the given property definition's base type.
     * @param definition        The property definition.
     * @returns                 A typescript type string.
     */
    static baseTypeOfPropertyDefinition(definition: TWServiceParameter): string {
        let baseType = definition.baseType;

        if (baseType == 'JSON') return 'TWJSON';

        if (baseType == 'INFOTABLE' && definition.aspects.dataShape) {
            if (NonAlphanumericRegex.test(definition.aspects.dataShape)) {
                return `InfoTableReference<${JSON.stringify(definition.aspects.dataShape)}>`;
            }
            else {
                return `INFOTABLE<${definition.aspects.dataShape}>`;
            }
        }

        if (baseType == 'THINGNAME') {
            if (definition.aspects.thingShape && definition.aspects.thingTemplate) {
                return `THINGNAME<'${definition.aspects.thingTemplate}','${definition.aspects.thingShape}'>`;
            }
            else if (definition.aspects.thingTemplate) {
                return `THINGNAME<'${definition.aspects.thingTemplate}'>`;
            }
            else if (definition.aspects.thingShape) {
                return `THINGNAME<undefined,'${definition.aspects.thingShape}'>`;
            }
        }

        return baseType;
    }

    /**
     * Returns a string that represents the literal type of the given service's argument object.
     * @param service       The service definition.
     * @returns             A typescript type string.
     */
    static argumentTypesOfService(service: TWMetadataServiceDefinition): string {
        let args: string[] = [];

        for (const argument of Object.values(service.parameterDefinitions || service.Inputs.fieldDefinitions)) {
            args.push(`${argument.name}${argument.aspects.isRequired || argument.aspects.defaultValue ? '' : '?'}: ${this.baseTypeOfPropertyDefinition(argument)}`);
        }

        return `{${args.join(',')}}`;
    }

    /**
     * Returns a string that represents the portion of JSDoc that documents the arguments of the given service definition.
     * @param service       The service definition.
     * @returns             A string representing a portion of a JSDoc comment.
     */
    static argumentDocumentationsOfService(service: TWMetadataServiceDefinition): string {
        let docs: string[] = [];

        for (const argument of Object.values(service.parameterDefinitions || service.Inputs.fieldDefinitions)) {
            docs.push(`@param ${argument.name} ${argument.description}`);
        }

        return docs.join('\n\t * ');
    }

    /**
     * Returns a string that represents a typescript declaration of a given property definition.
     * @param property          The property definition.
     * @returns                 A string representing a property declaration.
     */
    static declarationOfProperty(property: TWPropertyDefinition): string {
        // Use string literal for names with special characters
        let name = property.name;
        if (NonAlphanumericRegex.test(name)) {
            name = JSON.stringify(name);
        }

        return `
    /**
     * ${property.description}
     */
    ${name}: ${this.baseTypeOfPropertyDefinition(property)};
`;
    }

    /**
     * Returns a string that represents a typescript declaration of a given subscription definition.
     * @param subscription          The subscription definition.
     * @returns                     A string representing a subscription declaration.
     */
    static declarationOfSubscription(subscription: TWSubscriptionDefinition): string {
        // Use string literal for names with special characters
        let name = subscription.name;
        if (NonAlphanumericRegex.test(name)) {
            name = JSON.stringify(name);
        }

        return `
    /**
     * ${subscription.description}
     */
    private ${name}();
`;
    }


    /**
     * Returns a string that represents a typescript declaration of a given event definition.
     * @param event             The event definition.
     * @returns                 A string representing an event declaration.
     */
    static declarationOfEvent(event: TWEntityDefinition & {dataShape: string}): string {
        // Use string literals for names with special characters
        let name = event.name;
        if (NonAlphanumericRegex.test(name)) {
            name = JSON.stringify(name);
        }

        // Use an indirect data shape reference if it contains special characters
        let dataShape = event.dataShape;
        if (NonAlphanumericRegex.test(dataShape)) {
            dataShape = `DataShapes[${JSON.stringify(dataShape)}]["__dataShapeType"]`;
        }

        return `
    /**
     * ${event.description}
     */
    ${name}: EVENT<${dataShape}>;
`;
    }


    /**
     * Returns a string that represents a typescript declaration of a given service definition.
     * @param service           The service definition.
     * @returns                 A string representing a service declaration.
     */
    static declarationOfService(service: TWMetadataServiceDefinition): string {
        // Use string literals for names with special characters
        let name = service.name;
        if (NonAlphanumericRegex.test(name)) {
            name = JSON.stringify(name);
        }

        return `
    /**
     * ${service.description}
     * ${this.argumentDocumentationsOfService(service)}
     * @return ${service.resultType.description}
     */
    ${name}(args: ${this.argumentTypesOfService(service)}): ${service.aspects.isAsync ? 'NOTHING' : this.baseTypeOfPropertyDefinition(service.resultType)};
`;
    }

    /**
     * Returns a string that represents the typescript name of the entity's superclass.
     * @param entity                The entity whose superclass should be retrieved.
     * @param genericArgument       If specified, a generic argument that should be applied to the superclass type.
     * @returns                     A string that represents a superclass expression.
     */
    static superclassOfEntity(entity: any, genericArgument: string = '{}'): string {
        const shapes = Object.keys(entity.implementedShapes);
        const shapeReferences = shapes.map(shape => JSON.stringify(shape));
        const superclassName = entity.thingTemplate || entity.baseThingTemplate;

        if (!shapes.length) {
            if (superclassName.indexOf('.') != -1) {
                return `ThingTemplateReference(${JSON.stringify(superclassName)})`;
            }
            else {
                return superclassName + genericArgument;
            }
        }

        const isReferenceType = NonAlphanumericRegex.test(superclassName) || shapes.some(shape => NonAlphanumericRegex.test(shape));
        if (isReferenceType) {
            return `ThingTemplateWithShapesReference(${JSON.stringify(superclassName)}, ${shapeReferences.join(', ')})`;
        }
        else {
            return `ThingTemplateWithShapes(${superclassName}${genericArgument}, ${shapes.join(', ')})`;
        }

    }

    /**
     * Checks if the given member is declared on the given template or its associated thing package,
     * or if it is inherited from one of its shapes or the base template.
     * @param member            The member to verify.
     * @param definition        The template metadata.
     * @returns                 `true` if the member was directly defined on the template, `false` otherwise.
     */
    static memberIsPartOfThingTemplateDefinition(member: any, definition: any): boolean {
        if (member.sourceType == 'ThingTemplate' && member.sourceName == definition.name) return true;
        if (member.sourceType == 'Unknown') return true;
        if (member.sourceType == 'ThingPackage' && member.sourceName == definition.thingPackage) return true;

        return false;
    }

    /**
     * Parses the given thing metadata and returns a string that containing a matching
     * typescript class declaration.
     * @param body          An entity metadata json that represents a thing.
     * @param sanitizedName A unique sanitized name that the entity should use for the class declaration.
     *                      If omitted, a possibly non-unique name will be generated based on the entity's thingworx name.
     * @returns             A typescript class declaration.
     */
    static declarationOfThing(body: any, sanitizedName?: string): string {
        sanitizedName = sanitizedName ?? body.name.replace(/\./g, '_');

        // Things that inherit from generic thing packages must specify an instance of the generic argument
        const hasGenericArgument = GenericThingPackages.includes(body.effectiveThingPackage);
        const dataShapeReference = body.configurationTables.Settings?.rows?.[0]?.dataShape;
        const genericArgument = hasGenericArgument ? `<${dataShapeReference ? `DataShapes[${JSON.stringify(dataShapeReference)}]["__dataShapeType"]` : 'DataShapeBase'}>` : '';
        
        let declaration = `declare class ${sanitizedName} extends ${this.superclassOfEntity(body, genericArgument)} {\n\n`;

        for (const property of Object.values(body.thingShape.propertyDefinitions) as any[]) {
            // Don't include inherited properties
            if (property.sourceType != 'Unknown' && property.sourceType != 'Thing') continue;

            declaration += this.declarationOfProperty(property);
        }

        for (const subscription of Object.values(body.thingShape.subscriptions) as any[]) {
            // Don't include inherited subscriptions
            if (subscription.sourceType != 'Thing' || subscription.source != '') continue;

            declaration += this.declarationOfSubscription(subscription);
        }

        for (const event of Object.values(body.thingShape.eventDefinitions) as any[]) {
            // Don't include inherited events
            if (event.sourceType != 'Unknown' && event.sourceType != 'Thing') continue;

            declaration += this.declarationOfEvent(event);
        }

        for (const service of Object.values(body.thingShape.serviceDefinitions) as any[]) {
            // Don't include inherited services
            if (service.sourceType != 'Unknown' && service.sourceType != 'Thing') continue;

            declaration += this.declarationOfService(service);
        }

        declaration += '\n}\n';

        return declaration;
    }

    /**
     * Parses the given thing template metadata and returns a string that containing a matching
     * typescript class declaration.
     * @param body          An entity metadata json that represents a thing template.
     * @param sanitizedName A unique sanitized name that the entity should use for the class declaration.
     *                      If omitted, a possibly non-unique name will be generated based on the entity's thingworx name.
     * @returns             A typescript class declaration.
     */
    static declarationOfThingTemplate(body: any, sanitizedName?: string): string {
        sanitizedName = sanitizedName ?? body.name.replace(/\./g, '_');

        // Templates that inherit from generic thing packages must be defined with a generic argument
        const hasGenericArgument = GenericThingPackages.includes(body.effectiveThingPackage);
        const genericArgument = hasGenericArgument ? '<T extends DataShapeBase>' : '';
        const superclassGenericArgument = hasGenericArgument ? '<T>' : '';

        let declaration = `declare class ${sanitizedName}${genericArgument} extends ${this.superclassOfEntity(body, superclassGenericArgument)} {\n\n`;

        // For templates, the effective shape will be used to also include memebers
        // originating from the thing package
        for (const property of Object.values(body.effectiveShape.propertyDefinitions) as any[]) {
            // Don't include inherited properties
            if (!(this.memberIsPartOfThingTemplateDefinition(property, body))) continue;

            declaration += this.declarationOfProperty(property);
        }

        for (let subscription of Object.values(body.effectiveShape.subscriptions) as any[]) {
            // Don't include inherited subscriptions
            if (!body.thingShape.subscriptions[subscription.name]) continue;

            subscription = body.thingShape.subscriptions[subscription.name];
            if (subscription.sourceType != 'Thing' || subscription.source != '') continue;

            declaration += this.declarationOfSubscription(subscription);
        }

        for (const event of Object.values(body.effectiveShape.eventDefinitions) as any[]) {
            // Don't include inherited events
            if (!(this.memberIsPartOfThingTemplateDefinition(event, body))) continue;

            declaration += this.declarationOfEvent(event);
        }

        for (const service of Object.values(body.effectiveShape.serviceDefinitions) as any[]) {
            // Don't include inherited services
            if (!(this.memberIsPartOfThingTemplateDefinition(service, body))) continue;

            declaration += this.declarationOfService(service);
        }

        declaration += '\n}\n';

        return declaration;
    }

    /**
     * Parses the given thing shape metadata and returns a string that containing a matching
     * typescript class declaration.
     * @param body          An entity metadata json that represents a thing shape.
     * @param sanitizedName A unique sanitized name that the entity should use for the class declaration.
     *                      If omitted, a possibly non-unique name will be generated based on the entity's thingworx name.
     * @returns             A typescript class declaration.
     */
    static declarationOfThingShape(body: any, sanitizedName?: string): string {
        sanitizedName = sanitizedName ?? body.name.replace(/\./g, '_');
        let declaration = `declare class ${sanitizedName} extends ThingShapeBase {\n\n`;
        
        for (const property of Object.values(body.propertyDefinitions) as any[]) {
            declaration += this.declarationOfProperty(property);
        }

        for (const subscription of Object.values(body.subscriptions) as any[]) {
            declaration += this.declarationOfSubscription(subscription);
        }

        for (const event of Object.values(body.eventDefinitions) as any[]) {
            declaration += this.declarationOfEvent(event);
        }

        for (const service of Object.values(body.serviceDefinitions) as any[]) {
            declaration += this.declarationOfService(service);
        }

        declaration += '\n}\n';

        return declaration;
    }

    /**
     * Parses the given data shape metadata and returns a string that containing a matching
     * typescript class declaration.
     * @param body          An entity metadata json that represents a data shape.
     * @param sanitizedName A unique sanitized name that the entity should use for the class declaration.
     *                      If omitted, a possibly non-unique name will be generated based on the entity's thingworx name.
     * @returns             A typescript class declaration.
     */
    static declarationOfDataShape(body: any, sanitizedName?: string): string {
        sanitizedName = sanitizedName ?? body.name.replace(/\./g, '_');

        let declaration = `declare class ${sanitizedName} extends DataShapeBase {\n\n`;
        
        for (const property of Object.values(body.fieldDefinitions) as any[]) {
            declaration += this.declarationOfProperty(property);
        }
        declaration += '\n}\n';

        return declaration;
    }

    /**
     * Parses the given resource metadata and returns a string that containing a matching
     * typescript class declaration.
     * @param body          An entity metadata json that represents a resource.
     * @param sanitizedName A unique sanitized name that the entity should use for the class declaration.
     *                      If omitted, a possibly non-unique name will be generated based on the entity's thingworx name.
     * @returns             A typescript class declaration.
     */
    static declarationOfResource(body: any, sanitizedName?: string): string {
        sanitizedName = sanitizedName ?? body.name.replace(/\./g, '_');
        let declaration = `declare class ${sanitizedName} extends ResourceEntity {\n\n`;

        for (const service of Object.values(body.effectiveShape.serviceDefinitions) as any[]) {
            declaration += `
    /**
     * ${service.description}
     * ${this.argumentDocumentationsOfService(service)}
     * @return 
     */
    ${service.name}(args: ${this.argumentTypesOfService(service)}): ${service.aspects.isAsync ? 'NOTHING' : this.baseTypeOfPropertyDefinition(service.Outputs)};
`;
        }

        declaration += '\n}\n';

        return declaration;
    }

}