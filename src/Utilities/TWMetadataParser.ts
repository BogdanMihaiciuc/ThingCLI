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
     * Controls whether the declarations should be generated in "UML mode", where all indirect
     * references are converted into direct references, to be used for generating UML diagrams with
     * the proper connections (e.g. `THINGNAME<"MyApp.Device">` is converted into `MyApp_Device`).
     */
    public UMLMode = false;

    /**
     * An object that contains the sanitized names generated for each entity.
     * Its keys are the collection names and its values are maps whose keys
     * are the unsanitized entity names and the values the sanitized names.
     */
    private sanitizedNames: Record<string, Record<string, string>> = {};

    /**
     * A set that contains all generated sanitized names.
     */
    private allSanitizedNames = new Set<string>();
    
    /**
     * Returns a name for the entity, based on its Thingworx entity name, that is a valid
     * javascript identifier and unique across the imported entities.
     * @param collection        The collection the entity is part of.
     * @param name              The entity's name.
     * @returns                 A unique santized name.
     */
    sanitizedEntityName(collection: string, name: string = ''): string {
        // If the name is blank, return it directly
        if (!name) {
            return name;
        }

        // If the name was already sanitized, return it
        if (this.sanitizedNames[collection]?.[name]) {
            return this.sanitizedNames[collection][name];
        }

        // Replace non-alphanumeric characters with underscores
        let sanitizedName = name.replace(NonAlphanumericRegexGlobal, '_');

        // For duplicate names, add underscores at the end of the name
        while (this.allSanitizedNames.has(sanitizedName)) {
            sanitizedName += '_';
        }

        // Add the new name to the set of unique names
        this.allSanitizedNames.add(sanitizedName);

        // And to the appropriate collection
        this.sanitizedNames[collection] ??= {};
        this.sanitizedNames[collection][name] = sanitizedName;

        return sanitizedName;
    }

    /**
     * Returns a string that represents the typescript type that should be used to represent
     * the given property definition's base type.
     * @param definition        The property definition.
     * @param body              If specified, the metadata of the entity from which the property was obtained.
     *                          Used in UML mode to further resolve dependencies.
     * @returns                 A typescript type string.
     */
    baseTypeOfPropertyDefinition(definition: TWServiceParameter, body?: any): string {
        let baseType = definition.baseType;

        if (baseType == 'JSON') return 'TWJSON';

        if (baseType == 'INFOTABLE' && definition.aspects.dataShape) {
            // In UML mode, use a direct reference to the data shape class instead
            if (this.UMLMode) {
                return `${this.sanitizedEntityName('DataShapes', definition.aspects.dataShape)}`;
            }

            if (NonAlphanumericRegex.test(definition.aspects.dataShape)) {
                return `InfoTableReference<${JSON.stringify(definition.aspects.dataShape)}>`;
            }
            else {
                return `INFOTABLE<${definition.aspects.dataShape}>`;
            }
        }

        if (baseType == 'MASHUPNAME' && this.UMLMode) {
            // In UML mode, set mashup name values as actual references
            if (body?.thingProperties?.[definition.name]) {
                return this.sanitizedEntityName('Mashups', body.thingProperties?.[definition.name].value);
            }
        }

        if (baseType == 'STRING' && definition.name.endsWith('DataShape') && this.UMLMode) {
            // In UML mode, set data shape name values as actual references
            if (body?.thingProperties?.[definition.name]) {
                return this.sanitizedEntityName('DataShapes', body.thingProperties?.[definition.name].value);
            }
        }

        if (baseType == 'THINGNAME') {
            if (definition.aspects.thingShape && definition.aspects.thingTemplate) {
                // In UML mode, use a direct reference to the classes
                if (this.UMLMode) {
                    return `${this.sanitizedEntityName('ThingTemplates', definition.aspects.thingTemplate)} & ${this.sanitizedEntityName('ThingShapes', definition.aspects.thingShape)}`;
                }
                // Otherwise return a thingname type that is usable for development
                return `THINGNAME<'${definition.aspects.thingTemplate}','${definition.aspects.thingShape}'>`;
            }
            else if (definition.aspects.thingTemplate) {
                // In UML mode, use a direct reference to the classes
                if (this.UMLMode) {
                    return `${this.sanitizedEntityName('ThingTemplates', definition.aspects.thingTemplate)}`;
                }
                // Otherwise return a thingname type that is usable for development
                return `THINGNAME<'${definition.aspects.thingTemplate}'>`;
            }
            else if (definition.aspects.thingShape) {
                // In UML mode, use a direct reference to the classes
                if (this.UMLMode) {
                    return `${this.sanitizedEntityName('ThingShapes', definition.aspects.thingShape)}`;
                }
                // Otherwise return a thingname type that is usable for development
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
    argumentTypesOfService(service: TWMetadataServiceDefinition): string {
        let args: string[] = [];

        for (const argument of Object.values(service.parameterDefinitions || service.Inputs.fieldDefinitions)) {
            args.push(`${argument.name}${argument.aspects.isRequired || argument.aspects.defaultValue ? '' : '?'}: ${this.baseTypeOfPropertyDefinition(argument)}`);
        }

        return `${args.join(',')}`;
    }

    /**
     * Returns a string that represents the portion of JSDoc that documents the arguments of the given service definition.
     * @param service       The service definition.
     * @returns             A string representing a portion of a JSDoc comment.
     */
    argumentDocumentationsOfService(service: TWMetadataServiceDefinition): string {
        let docs: string[] = [];

        const args = Object.values(service.parameterDefinitions || service.Inputs.fieldDefinitions);

        if (args.length) {
            docs.push(`@param args service arguments`);
        }

        for (const argument of args) {
            docs.push(`@param args.${argument.name} ${argument.description}`);
        }

        return docs.join('\n\t * ');
    }

    /**
     * Returns a string that represents a typescript declaration of a given property definition.
     * @param property          The property definition.
     * @param body              If specified, the metadata of the entity from which the property was obtained.
     *                          Used in UML mode to further resolve dependencies.
     * @returns                 A string representing a property declaration.
     */
    declarationOfProperty(property: TWPropertyDefinition, body?: any): string {
        // Use string literal for names with special characters
        let name = property.name;
        if (NonAlphanumericRegex.test(name)) {
            name = JSON.stringify(name);
        }

        return `
    /**
     * ${property.description}
     */
    ${name}: ${this.baseTypeOfPropertyDefinition(property, body)};
`;
    }

    /**
     * Returns a string that represents a typescript declaration of a given subscription definition.
     * @param subscription          The subscription definition.
     * @returns                     A string representing a subscription declaration.
     */
    declarationOfSubscription(subscription: TWSubscriptionDefinition): string {
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
    declarationOfEvent(event: TWEntityDefinition & {dataShape: string}): string {
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
    declarationOfService(service: TWMetadataServiceDefinition): string {
        // Use string literals for names with special characters
        let name = service.name;
        if (NonAlphanumericRegex.test(name)) {
            name = JSON.stringify(name);
        }

        let args: string;
        if (this.UMLMode) {
            // In UML mode, create the arguments as standard arguments
            args = this.argumentTypesOfService(service);
        }
        else {
            // Otherwise use the Thingworx destrcturing pattern
            args = `args: {${this.argumentTypesOfService(service)}}`;
        }

        return `
    /**
     * ${service.description}
     * ${this.argumentDocumentationsOfService(service)}
     * @return ${service.resultType.description}
     */
    ${name}(${args}): ${service.aspects.isAsync ? 'NOTHING' : this.baseTypeOfPropertyDefinition(service.resultType)};
`;
    }

    /**
     * Returns a string that represents the typescript name of the entity's superclass.
     * @param entity                The entity whose superclass should be retrieved.
     * @param genericArgument       If specified, a generic argument that should be applied to the superclass type.
     * @returns                     A string that represents a superclass expression.
     */
    superclassOfEntity(entity: any, genericArgument: string = '{}'): string {
        const shapes = Object.keys(entity.implementedShapes);
        const shapeReferences = shapes.map(shape => JSON.stringify(shape));
        let superclassName = entity.thingTemplate || entity.baseThingTemplate;
        // In UML mode, always use the sanitized name
        if (this.UMLMode) {
            superclassName = this.sanitizedEntityName('ThingTemplates', superclassName);
        }

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
            // In UML mode, always use the sanitized names
            if (this.UMLMode) {
                // If the superclass is generic thing and there is only a single shape, extend from it directly
                if (superclassName == 'GenericThing' && shapes.length == 1) {
                    return this.sanitizedEntityName('ThingShapes', shapes[0]);
                }
                return `ThingTemplateWithShapes(${superclassName}${genericArgument}, ${shapes.map(s => this.sanitizedEntityName('ThingShapes', s)).join(', ')})`
            }
            return `ThingTemplateWithShapesReference(${JSON.stringify(superclassName)}, ${shapeReferences.join(', ')})`;
        }
        else {
            // In UML mode, if the superclass is generic thing and there is only a single shape, extend from it directly
            if (this.UMLMode && superclassName == 'GenericThing' && shapes.length == 1) {
                return this.sanitizedEntityName('ThingShapes', shapes[0]);
            }
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
    isMemberPartOfThingTemplateDefinition(member: any, definition: any): boolean {
        if (member.sourceType == 'ThingTemplate' && member.sourceName == definition.name) return true;
        if (member.sourceType == 'Unknown') return true;
        if (member.sourceType == 'ThingPackage' && member.sourceName == definition.thingPackage) return true;

        return false;
    }

    /**
     * Parses the given thing metadata and returns a string that containing a matching
     * typescript class declaration.
     * @param body          An entity metadata json that represents a thing.
     * @returns             A typescript class declaration.
     */
    declarationOfThing(body: any): string {
        const sanitizedName = this.sanitizedEntityName('Things', body.name);

        // Things that inherit from generic thing packages must specify an instance of the generic argument
        const hasGenericArgument = GenericThingPackages.includes(body.effectiveThingPackage);
        const dataShapeReference = body.configurationTables.Settings?.rows?.[0]?.dataShape;
        const genericArgument = hasGenericArgument ? `<${dataShapeReference ? `DataShapes[${JSON.stringify(dataShapeReference)}]["__dataShapeType"]` : 'DataShapeBase'}>` : '';
        
        let declaration = `declare class ${sanitizedName} extends ${this.superclassOfEntity(body, genericArgument)} {\n\n`;

        // A set that contains the declared properties
        const declaredProperties: Record<string, boolean> = {};

        for (const property of Object.values(body.thingShape.propertyDefinitions) as any[]) {
            // Don't include inherited properties, except for MASHUPNAME and DataShape properties in UML
            if (!this.UMLMode && property.baseType != 'MASHUPNAME' && !property.name.endsWith('DataShape')) {
                if (property.sourceType != 'Unknown' && property.sourceType != 'Thing') continue;
            }

            declaredProperties[property.name];
            declaration += this.declarationOfProperty(property, body);
        }

        // In UML mode, also declare inherited mashup and data shape properties
        if (this.UMLMode) {
            for (const property of Object.values(body.effectiveShape.propertyDefinitions) as any[]) {
                // Exclude already declared properties
                if (declaredProperties[property.name]) continue;

                if (property.baseType == 'MASHUPNAME' || property.name.endsWith('DataShape')) {
                    declaration += this.declarationOfProperty(property, body);
                }
            }
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
     * @returns             A typescript class declaration.
     */
    declarationOfThingTemplate(body: any): string {
        const sanitizedName = this.sanitizedEntityName('ThingTemplates', body.name);

        // Templates that inherit from generic thing packages must be defined with a generic argument
        const hasGenericArgument = GenericThingPackages.includes(body.effectiveThingPackage);
        const genericArgument = hasGenericArgument ? '<T extends DataShapeBase>' : '';
        const superclassGenericArgument = hasGenericArgument ? '<T>' : '';

        let declaration = `declare class ${sanitizedName}${genericArgument} extends ${this.superclassOfEntity(body, superclassGenericArgument)} {\n\n`;

        // For templates, the effective shape will be used to also include memebers
        // originating from the thing package
        for (const property of Object.values(body.effectiveShape.propertyDefinitions) as any[]) {
            // Don't include inherited properties
            if (!(this.isMemberPartOfThingTemplateDefinition(property, body))) continue;

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
            if (!(this.isMemberPartOfThingTemplateDefinition(event, body))) continue;

            declaration += this.declarationOfEvent(event);
        }

        for (const service of Object.values(body.effectiveShape.serviceDefinitions) as any[]) {
            // Don't include inherited services
            if (!(this.isMemberPartOfThingTemplateDefinition(service, body))) continue;

            declaration += this.declarationOfService(service);
        }

        declaration += '\n}\n';

        return declaration;
    }

    /**
     * Parses the given thing shape metadata and returns a string that containing a matching
     * typescript class declaration.
     * @param body          An entity metadata json that represents a thing shape.
     * @returns             A typescript class declaration.
     */
    declarationOfThingShape(body: any): string {
        const sanitizedName = this.sanitizedEntityName('ThingShapes', body.name);
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
     * @returns             A typescript class declaration.
     */
    declarationOfDataShape(body: any): string {
        const sanitizedName = this.sanitizedEntityName('DataShapes', body.name);

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
     * @returns             A typescript class declaration.
     */
    declarationOfResource(body: any): string {
        const sanitizedName = this.sanitizedEntityName('Resources', body.name);
        let declaration = `declare class ${sanitizedName} extends ResourceEntity {\n\n`;

        for (const service of Object.values(body.effectiveShape.serviceDefinitions) as any[]) {
            declaration += `
    /**
     * ${service.description}
     * ${this.argumentDocumentationsOfService(service)}
     * @return 
     */
    ${service.name}(args: {${this.argumentTypesOfService(service)}}): ${service.aspects.isAsync ? 'NOTHING' : this.baseTypeOfPropertyDefinition(service.Outputs)};
`;
        }

        declaration += '\n}\n';

        return declaration;
    }

    /**
     * Parses the specified thing metadata and returns an array of entities that are referenced in the thing's property values.
     * This method only returns these dependencies in UML mode.
     * @param body          An entity metadata json that represents a thing.
     * @returns             An array of dependencies.
     */
    additionalDependenciesOfThing(body: any): {name: string, parentName: string}[] {
        let result: {name: string, parentName: string}[] = [];

        // Outside of UML mode, this will always return an empty array.
        if (!this.UMLMode) return result;

        for (const property of Object.values(body.effectiveShape.propertyDefinitions) as any[]) {
            if (property.baseType == 'MASHUPNAME' && body?.thingProperties[property.name].value) {
                result.push({name: body.thingProperties[property.name].value, parentName: 'Mashups'});
            }

            if (property.name.endsWith('DataShape') && body?.thingProperties[property.name].value) {
                result.push({name: body.thingProperties[property.name].value, parentName: 'DataShapes'});
            }
        }

        return result;
    }

    /**
     * Parses the specified mashup metadata and returns a string that contains a matching
     * typescript class if UML mode is enabled. If UML mode is disabled, an empty string is returned.
     * @param body          An entity metadata json that represents a mashup.
     * @returns             A typescript class declaration in UML mode, or an empty string otherwise.
     */
    declarationOfMashup(body: any): string {
        if (!this.UMLMode) return '';

        const sanitizedName = this.sanitizedEntityName('Mashups', body.name);
        const content = JSON.parse(body.mashupContent);

        let declaration = `declare class ${sanitizedName} extends MashupEntity {\n\n`;

        // Get the service references and add them as properties to the mashup
        for (const dataSource of Object.keys(content.Data)) {
            // Exclude UserExtensions and Session
            if (dataSource == 'UserExtensions' || dataSource == 'Session') {
                continue;
            }

            // If the collection name is dynamic, remove the prefix
            let collection = content.Data[dataSource].EntityType;
            if (collection.startsWith('Dynamic')) {
                collection = collection.substring('Dynamic'.length);
            }

            // Add each data source as a property
            declaration += `    ${JSON.stringify(dataSource)}: ${this.sanitizedEntityName(collection, content.Data[dataSource].EntityName)};\n\n`;
        }

        // For each widget, add dependent entities based on the widget types
        const widgets = [content.UI];
        while (widgets.length) {
            const widget = widgets.pop();

            // Get the dependencies based on the widget type
            switch (widget.Properties.Type) {
                case 'BMCollectionView':
                    declaration += widget.Properties.CellMashupName ? `    "Cell_${widget.Properties.Id}": ${this.sanitizedEntityName('Mashups', widget.Properties.CellMashupName)};\n\n` : '';
                    declaration += widget.Properties.HeaderMashupName ? `    "Header_${widget.Properties.Id}": ${this.sanitizedEntityName('Mashups', widget.Properties.HeaderMashupName)};\n\n` : '';
                    declaration += widget.Properties.FooterMashupName ? `    "Footer_${widget.Properties.Id}": ${this.sanitizedEntityName('Mashups', widget.Properties.FooterMashupName)};\n\n` : '';
                    declaration += widget.Properties.EmptyMashupName ? `    "Empty_${widget.Properties.Id}": ${this.sanitizedEntityName('Mashups', widget.Properties.EmptyMashupName)};\n\n` : '';
                    break;
                case 'BMPopoverController':
                case 'BMWindowController':
                    if (!widget.Properties.mashupName) break;
                    declaration += `    "${widget.__TypeDisplayName}_${widget.Properties.DisplayName}": ${this.sanitizedEntityName('Mashups', widget.Properties.mashupName)};\n\n`;
                    break;
                case 'navigationfunction':
                    if (!widget.Properties.TargetMashup) break;
                    declaration += `    "Navigation_${widget.Properties.DisplayName}": ${this.sanitizedEntityName('Mashups', widget.Properties.TargetMashup)};\n\n`;
                    break;
                case 'navigation':
                    if (!widget.Properties.Mashup) break;
                    declaration += `    "Navigation_${widget.Properties.DisplayName}": ${this.sanitizedEntityName('Mashups', widget.Properties.Mashup)};\n\n`;
                    break;
                case 'mashupcontainer':
                    if (!widget.Properties.Mashup) break;
                    declaration += `    "Contained_${widget.Properties.DisplayName}": ${this.sanitizedEntityName('Mashups', widget.Properties.Mashup)};\n\n`;
                    break;
            }

            widgets.push(...widget.Widgets);
        }

        declaration += '\n}\n';

        return declaration;
    }

    /**
     * Parses the specified mashup metadata and returns an array of entities that are referenced in the mashup content.
     * @param body          An entity metadata json that represents a mashup.
     * @returns             An array of dependencies.
     */
    dependenciesOfMashup(body: any): {name: string, parentName: string}[] {
        const content = JSON.parse(body.mashupContent);
        let result: {name: string, parentName: string}[] = [];

        // Get the service references and add them as properties to the mashup
        for (const dataSource of Object.keys(content.Data)) {
            // Exclude UserExtensions and Session
            if (dataSource == 'UserExtensions' || dataSource == 'Session') {
                continue;
            }

            // If the collection name is dynamic, remove the prefix
            let collection = content.Data[dataSource].EntityType;
            if (collection.startsWith('Dynamic')) {
                collection = collection.substring('Dynamic'.length);
            }

            // Add each data source as a property
            result.push({name: content.Data[dataSource].EntityName, parentName: collection});
        }

        // For each widget, add dependent entities based on the widget types
        const widgets = [content.UI];
        while (widgets.length) {
            const widget = widgets.pop();

            // Get the dependencies based on the widget type
            switch (widget.Properties.Type) {
                case 'BMCollectionView':
                    result.push({name: widget.Properties.CellMashupName, parentName: 'Mashups'});
                    widget.Properties.HeaderMashupName && result.push({name: widget.Properties.HeaderMashupName, parentName: 'Mashups'});
                    widget.Properties.FooterMashupName && result.push({name: widget.Properties.FooterMashupName, parentName: 'Mashups'});
                    widget.Properties.EmptyMashupName && result.push({name: widget.Properties.EmptyMashupName, parentName: 'Mashups'});
                    break;
                case 'BMPopoverController':
                case 'BMWindowController':
                    result.push({name: widget.Properties.mashupName, parentName: 'Mashups'});
                    break;
                case 'navigationfunction':
                    result.push({name: widget.Properties.TargetMashup, parentName: 'Mashups'});
                    break;
                case 'navigation':
                    result.push({name: widget.Properties.Mashup, parentName: 'Mashups'});
                    break;
                case 'mashupcontainer':
                    result.push({name: widget.Properties.Mashup, parentName: 'Mashups'});
                    break;
            }

            widgets.push(...widget.Widgets);
        }

        // Filter out any empty dependencies
        result = result.filter(entity => !!entity.name);

        return result;
    }

}