/**
 * The prototype of an object that defines a permitted value for a string property.
 */
declare interface TWPropertySelectOption {

    /**
     * The option's label as it appears in the composer.
     */
    text: string;

    /**
     * The option's value that is assigned to the property.
     */
    value: string;
}

/**
 * A union of string defining the available Thingworx base types.
 */
type TWBaseType = 'STRING' | 'LOCATION' | 'NUMBER' | 'INTEGER' | 'LONG' | 'BOOLEAN' |
    'DASHBOADNAME' | 'GROUPNAME' | 'GUID' | 'HTML' | 'HYPERLINK' | 'IMAGE' | 'IMAGELINK' |
    'MASHUPNAME' | 'MENUNAME' | 'PASSWORD' | 'TEXT' | 'THINGCODE' | 'THINGNAME' |
    'USERNAME' | 'DATETIME' | 'XML' | 'JSON' | 'QUERY' | 'TAGS' |
    'SCHEDULE' | 'ANYSCALAR' | 'BLOB' | 'THINGSHAPENAME' | 'THINGTEMPLATENAME' | 'DATASHAPENAME' |
    'PROJECTNAME' | 'BASETYPENAME' | 'STATEDEFINITION' | 'STYLEDEFINITION' | 'FIELDNAME' | 'INFOTABLE' | 'STATEFORMATTING' | 'RENDERERWITHSTATE';

/**
 * The prototype for an object representing a single widget property.
 */
declare interface TWWidgetProperty {
    /**
     * Defaults to an empty string.
     * The description that appears in the composer for this property.
     */
    description?: string;

    /**
     * A string that indicates what type of property this definition refers to.
     * This should not be included in the object returned by `widgetProperties`, but when using
     * the array returned by `allWidgetProperties`, this field should be set to the appropriate type of the given property.
     */
    type?: 'property' | 'event' | 'service';

    /**
     * This property's data type.
     */
    baseType: TWBaseType;

    /**
     * When the baseType is set to `'THINGNAME'`, this may be optionally specified
     * to constrain the list of choices selectable at design time to things that implement or
     * extend the given entities.
     */
    mustImplement?: {
        /**
         * The name of the entity that must be implemented by the thing.
         */
        EntityName: string;
        /**
         * The type of the entity that must be implemented by the thing.
         * This is the Thingworx collection name of the entity type (e.g. ThingTemplate).
         */
        EntityType: string;
    };

    /**
     * When the baseType is set to `'RENDERERWITHFORMAT'`, this attribute specifies what infotable
     * property this rendering is based upon. This must be the name of one of this widget's infotable properties.
     */
    baseTypeInfotableProperty?: string;

    /**
     * when the baseType is set to `'FIELDNAME'`, this attribute specifies what infotable the widget
     * should look into when displaying the available fields.
     */
    sourcePropertyName?: string;

    /**
     * When the baseType is set to `'FIELDNAME'`, this attribute restricts the available fields
     * to only the fields of this base type.
     */
    baseTypeRestriction?: TWBaseType;

    /**
     * Defaults to `'DataTags'`. When baseType is set to `'TAGS'` this represents the type of tags
     * that the user may select.
     */
    tagType?: 'DataTags' | 'ModelTags';

    /**
     * Defaults to undefined. Must be specified if baseType is set to `'BOOLEAN'`.
     * The default value for the property.
     * Note that if this is set in a newer version of the widget, older existing instances of
     * the widget will not gain this default value.
     */
    defaultValue?: any;

    /**
     * Defaults to false.
     * Controls whether this property is a binding source that may be bound to other targets.
     */
    isBindingSource?: boolean;

    /**
     * Defaults to false.
     * Controls whether this property is a binding target that other targets may bind to.
     */
    isBindingTarget?: boolean;

    /**
     * Defaults to true.
     * If set to false, the user will not be able to modify this property's value in the composer.
     */
    isEditable?: boolean;

    /**
     * Defaults to true.
     * If set to false, this property will not appear in the widget's properties panel.
     */
    isVisible?: boolean;

    /**
     * Defaults to false.
     * If the baseType is set to `'STRING'` and this is set to true, the property may be localized and the user
     * will be able to select localization tokens for it.
     */
    isLocalizable?: boolean;

    /**
     * If the baseType is set to `'STRING'`, this field may optionally specify a set of possible values for the property.
     * When this field is specified, the property will appear as a dropdown list in the composer, containing the values defined here.
     */
    selectOptions?: TWPropertySelectOption[];

    /**
     * Defaults to false.
     * If set to true and this property is a binding source, the composer will create a to-do item until this property is bound to a target.
     */
    warnIfNotBoundAsSource?: boolean;

    /**
     * Defaults to false.
     * If set to true and this property is a binding target, the composer will create a to-do item until a target is bound to this property.
     */
    warnIfNotBoundAsTarget?: boolean;
}

/**
 * The prototype for an object containing the properties object of a Thingworx widget.
 */
declare interface TWWidgetProperties {

    /**
     * The name of the widget as it appears in the Composer,
     * on the left-hand side widget selector.
     */
    name: string;

    /**
     * The widget's description, as it appears when hovering over the widget
     * on the left hand side widget selector.
     */
    description?: string;

    /**
     * @deprecated Superseded by the `widgetIconUrl` method.
     */
    icon?: string;

    /**
     * An array of category names to which the widget belongs.
     * This makes it possible to filter the widget using the Category selector in the composer.
     */
    category: string[];

    /**
     * Name of the property in the property list that should be displayed as the default one when binding
     */
    defaultBindingTargetProperty?: string;

    /**
     * Defaults to false. When set to true, the widget will be responsive and may be used in responsive layouts.
     */
    supportsAutoResize?: boolean;

    /**
     * Defaults to false. When set to true, this should be used together with `supportsAutoResize` and causes the widget
     * to only work within responsive layouts.
     */
    onlySupportedInResponsiveParents?: boolean;

    /**
     * Defaults to false.
     * When set to true, this widget is expected to have elements representing dedicated spots for sub-widgets in its runtime and design-time DOM structures.
     * Its subwidgets will be added in order to its declarative spots.
     * The declarative spots are HTML elements with the `sub-widget-container-id` attribute set to this widget's ID and the `sub-widget` attribute set to
     * the index of the sub-widget that will be rendered within that element.
     */
    isContainerWithDeclarativeSpotsForSubWidgets?: boolean;

    /**
     * Defaults to true. When set to false, the widget will not get the usual service loading indicator, regardless
     * of the user's selection in the properties panel.
     * If this is set to false, it is also required to set the similarly named runtime property to false in the runtime version of the widget.
     */
    needsDataLoadingAndError?: boolean;

    /**
     * Defaults to false. When set to true, the user is able to add other widgets into this widget.
     */
    isContainer?: boolean;

    /**
     * Defaults to true for non-container widgets. When set to false, the widget cannot be dragged.
     * If the widget is a container, 
     */
    isDraggable?: boolean;

    /**
     * Defaults to true.
     * If set to false, the widget cannot be moved through the composer.
     */
    allowPositioning?: boolean;

    /**
     * Defaults to true.
     * If set to false, other widgets cannot be dragged or pasted onto this widget.
     */
    allowPasteOrDrop?: boolean;

    /**
     * Defaults to true.
     * If set to false, this widget cannot be copied.
     */
    allowCopy?: boolean;

    /**
     * If the widget provides a border, this should be set to the width of the border. 
     * This helps ensure pixel-perfect WYSIWG between builder and runtime. 
     * If you set a border of 1px on the “widget-content” element at design time, you are effectively making that widget 2px taller and 2px wider (1px to each side). 
     * To account for this descrepancy, setting the borderWidth property will make the design-time widget the exact same number of pixels smaller. 
     * Effectively, this places the border “inside” the widget that you have created and making the width & height in the widget properties accurate.
     */
    borderWidth?: string;

    /**
     * Controls whether this widget supports a Thingworx generated label.
     * It is recommended to set this to `false` and control labels manually.
     */
    supportsLabel?: boolean;

    /**
     * To be clarified.
     */
    customEditor?: string;

    /**
     * To be clarified.
     */
    customEditorMenuText?: string;

    /**
     * An array of developer-defined custom properties for the widget.
     * The developer can also redefine certain generic properties such as `Width` or `Height` to customize their behavior
     * by including them in this array. For these properties, it is not required to specify all of their attributes, but rather only the ones
     * that should be different from the default.
     */
    properties: Record<string, TWWidgetProperty & { name?: string, type?: 'property' | 'service' | 'event' }>;

}

/**
 * Provides methods to convert from widget metadata downloaded from a Thingworx server
 * into Typescript definition files that can be used in a Thingworx Typescript project.
 */
export class TWWidgetParser {

    /**
     * Returns a string that represents a Typescript definition file for the specified widgets.
     * @param widgets       The widgets to convert and their properties.
     * @returns             A string that can be written to a `.d.ts` file.
     */
    definitionsWithWidgetProperties(widgets: Record<string, TWWidgetProperties>): string {
        let definition = '';

        for (let key in widgets) {
            const widget = widgets[key];

            // Many standard widget class names start with a lower case, but JSX requires all non-standard
            // components to start with a capital letter
            const name = key.charAt(0).toUpperCase() + key.substring(1);

            // For widgets that take infotable arguments and have fieldname properties that depend
            // on them, typing is enforced via generic arguments that express the infotable data shape
            // types that are bound
            const genericArgumentMap = this.genericArgumentMapForWidget(widget);
            const genericArgs = this.genericArgumentDefinitionWithMap(genericArgumentMap);

            const constuctorProperties = this.constructorPropertiesWithWidgetProperties(widget, genericArgumentMap, name);

            definition += `
declare interface UIInputInterface${name}${genericArgs} extends UIBaseInputInterface {
    ${constuctorProperties.propertyTypes.join(';\n\n')}
}

declare class UIOutputInterface${name}${genericArgs} {
    ${this.classPropertiesWithWidgetProperties(widget, genericArgumentMap)}
}

declare function ${name}${genericArgs}(props: UIInputInterface${name}${genericArgs}): UIOutputInterface${name}${genericArgs}

            `;
        }

        return definition;
    }

    /**
     * Returns an object that contains the property names and types that can be used in the constructor
     * for the specified widget.
     * @param widget                An object containing the widget properties.
     * @param genericArgumentMap    An object that contains the mapping between infotable property names and generic argument names.
     * @param className             The widget class name.
     * @returns                     An object containing the property names and types.
     */
    constructorPropertiesWithWidgetProperties(widget: TWWidgetProperties, genericArgumentMap: Record<string, string>, className: string): {propertyList: string[], propertyTypes: string[]} {
        let propertyList: string[] = [];
        let propertyTypes: string[] = [];

        for (let [name, property] of Object.entries(widget.properties)) {

            // Escape all property names, because they can contain non-identifier characters (e.g. Z-Index)
            name = JSON.stringify(name);

            // Services can't be specified as constructor properties; they are only specified as binding targets for other events
            if (property.type == 'service') continue;

            propertyList.push(name);

            if (property.type == 'event') {
                // Event properties are always arrays of binding targets if specified
                propertyTypes.push(`
    /** ${property.description || ''} */
    ${name}?: ServiceBindingTarget[]`)
            }
            else {
                // Properties depend on the base type
                switch (property.baseType) {
                    case 'INFOTABLE':
                        // If the infotable is not a binding target, it can't be specified in the constructor
                        if (!property.isBindingTarget) {
                            propertyList.pop();
                            continue;
                        }

                        // The infotable type depends on whether there is a generic argument associated with it
                        if (genericArgumentMap[name]) {
                            propertyTypes.push(`
    /** ${property.description || ''} */ 
    ${name}?: BindingTarget<INFOTABLE<${genericArgumentMap[name]}>>`);
                        }
                        else {
                            propertyTypes.push(`
    /** ${property.description || ''} */
    ${name}?: BindingTarget<INFOTABLE>`);
                        }
                        break;
                    case 'FIELDNAME': {
                        // For fieldnames, they are either strings or specific keys if there is a generic argument
                        // associated with them
                        let type;
                        if (genericArgumentMap[property.sourcePropertyName!]) {
                            type = `FIELDNAME<${genericArgumentMap[property.sourcePropertyName!]}>`;
                        }
                        else {
                            type = 'string';
                        }

                        // The final type depends on whether the property is a binding target and/or ediable
                        if (property.isBindingTarget) {
                            if (property.isEditable === false) {
                                type = `BindingTarget<${type}>`;
                            }
                            else {
                                type = type + ` | BindingTarget<${type}>`;
                            }
                        }

                        propertyTypes.push(`
    /** ${property.description} */
    ${name}?: ${type}`);
                        break;
                    }
                    case 'STRING': {
                        // For string types, a special type is needed if selectOptions is used
                        if (property.selectOptions) {
                            let typeOptions = property.selectOptions.map(o => JSON.stringify(o.value));
                            let type = `STRING<${typeOptions.join(' | ')}>`;

                            if (property.isBindingTarget) {
                                if (property.isEditable === false && className != 'Flexcontainer') {
                                    type = `BindingTarget<${type}>`;
                                }
                                else {
                                    type = type + ` | BindingTarget<${type}>`;
                                }
                            }
                            else if (property.isEditable === false && className != 'Flexcontainer') {
                                // If the property is neither editable nor a binding target, it can't be specified
                                // in the constructor; an exception is made for flex containers which define their
                                // properties as non-editable
                                propertyList.pop();
                                break;
                            }
    
                            propertyTypes.push(`
    /** ${property.description || ''} */
    ${name}?: ${type}`);
                            break;
                        }

                        // Otherwise fall through to the default branch
                    }
                    default: {
                        // For all other types, the base type can be used directly
                        let type: string = property.baseType;
                        if (property.isBindingTarget) {
                            if (property.isEditable === false) {
                                type = `BindingTarget<${type}>`;
                            }
                            else {
                                type = type + ` | BindingTarget<${type}>`;
                            }
                        }
                        else if (property.isEditable === false) {
                            // If the property is neither editable nor a binding target, it can't be specified
                            // in the constructor
                            propertyList.pop();
                            continue;
                        }

                        propertyTypes.push(`
    /** ${property.description || ''} */
    ${name}?: ${type}`);
                    }
                }
            }
        }

        propertyList.push('ref');
        propertyTypes.push(`
    ref?: UIOutputInterface${className}${this.genericArgumentDefinitionWithMap(genericArgumentMap)}`)

        return {propertyList, propertyTypes};
    }

    /**
     * Returns a string that represents the Typescript function argument for the constructor
     * for the specified widget.
     * @param widget                An object containing the widget properties.
     * @param genericArgumentMap    An object that contains the mapping between infotable property names and generic argument names.
     * @returns                     A string that represents the constructor properties for the specified widget.
     */
    classPropertiesWithWidgetProperties(widget: TWWidgetProperties, genericArgumentMap: Record<string, string>): string {
        let properties: string[] = [];

        for (const [name, property] of Object.entries(widget.properties)) {

            // Events can't be used with references, they can only be bound through the constructor arguments
            if (property.type == 'event') continue;

            if (property.type == 'service') {
                // Service properties are always service binding targets that can used for event bindings.
                properties.push(`
    /** ${property.description || ''} */
    ${name}: ServiceBindingTarget`);
            }
            else {
                // Non-binding source properties can't be used with reference types
                if (!property.isBindingSource) continue;

                // Properties depend on the base type
                switch (property.baseType) {
                    case 'INFOTABLE':
                        // The infotable type depends on whether there is a generic argument associated with it
                        if (genericArgumentMap[name]) {
                            properties.push(`
    /** ${property.description || ''} */
    ${name}: BindingTarget<INFOTABLE<${genericArgumentMap[name]}>>`);
                        }
                        else {
                            properties.push(`
    /** ${property.description || ''} */
    ${name}: BindingTarget<INFOTABLE>`);
                        }
                        break;
                    case 'FIELDNAME': {
                        // For fieldnames, they are either strings or specific keys if there is a generic argument
                        // associated with them
                        let type;
                        if (genericArgumentMap[property.sourcePropertyName!]) {
                            type = `FIELDNAME<${genericArgumentMap[property.sourcePropertyName!]}>`;
                        }
                        else {
                            type = 'string';
                        }
                        
                        type = `BindingTarget<${type}>`;

                        properties.push(`/** ${property.description} */ ${name}?: ${type}`);
                        break;
                    }
                    case 'STRING': {
                        // For strings, if selectOptions is used, restrict the result to the appropriate type
                        if (property.selectOptions) {
                            const type = `STRING<${property.selectOptions.map(o => JSON.stringify(o.value)).join(' | ')}>`;
                            properties.push(`
    /** ${property.description || ''} */
    ${name}: BindingTarget<${type}>`)
                        }
                    }
                    default: {
                        properties.push(`
    /** ${property.description || ''} */
    ${name}: BindingTarget<${property.baseType}>`);
                    }
                }
            }
        }

        return properties.join(';\n\n');
    }

    /**
     * Returns a dictionary whose keys represent infotable property names and their values are the
     * names of the associated generic argument for the specified widget.
     * @param widget        An object containing the widget properties.
     * @returns             An object containing the generic argument map.
     */
    genericArgumentMapForWidget(widget: TWWidgetProperties): Record<string, string> {
        let argumentMap: Record<string, string> = {};

        // Use single letters for the generic arguments, starting at A
        // This fails after letter Z, but it's very unlikely that a widget will have that many
        // bindable infotables with configurable fieldnames.
        let genericArgumentName = 'A'.charCodeAt(0);

        for (const property of Object.values(widget.properties)) {
            if (property.baseType == 'FIELDNAME') {
                // For each fieldname property, add an entry into the argument map for its associated
                // infotable property if one doesn't already exist.
                if (property.sourcePropertyName && !(property.sourcePropertyName in argumentMap)) {
                    argumentMap[property.sourcePropertyName] = String.fromCharCode(genericArgumentName);
                    genericArgumentName++;
                }
            }
        }

        return argumentMap;
    }

    /**
     * Returns a string that represents the generic argument definition for a widget based
     * on an argument map that was previously extracted from the widget's properties.
     * @param argumentMap       The argument map.
     * @returns                 A string that represents the generic argument definition.
     */
    genericArgumentDefinitionWithMap(argumentMap: Record<string, string>): string {
        const args = Object.values(argumentMap);

        if (!args.length) {
            return '';
        }

        return `<${args.join(',')}>`;
    }

}