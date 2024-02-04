window.queueMicrotask(async function () {
    // Create a download widgets button and add it to the mashup toolbar
    let mashupToolbar = document.getElementById('mashup-toolbar');

    // The mashup UI will wait for certain scripts to be downloaded before being added to the document
    // so loop waiting for it to become available if it isn't immediately
    while (!mashupToolbar) {
        await new Promise((r) => setTimeout(r, 100));
        mashupToolbar = document.getElementById('mashup-toolbar');
    }

    // Once the mashup toolbar becomes available, create and add a button to it that can be used to download
    // information about the currently installed widgets
    const button = document.createElement('button');
    button.className = 'btn btn-mini au-target';
    button.addEventListener('click', downloadWidgets);
    button.innerText = '⤋ Export Widgets';

    mashupToolbar.appendChild(button);

    function downloadWidgets() {// These widgets are already built-in and should not be downloaded
        const builtInWidgets = ["ptcsbreadcrumb","ptcschartbar","ptcsbutton","ptcschartline","ptcschartpareto","ptcschartschedule","ptcschartwaterfall","ptcscheckbox","ptcschipdatafilter","ptcsconfirmation","ptcsdatepicker","ptcsdivider","ptcsdropdown","ptcsdynamicpanel","ptcsfileupload","ptcsgrid","ptcsicon","ptcsimage","ptcslabel","ptcslink","ptcslist","ptcslistshuttle","ptcsmenubar","ptcspagination","ptcspropertydisplay","ptcsradio","ptcsslider","ptcstabset","ptcstextarea","ptcstextfield","ptcstogglebutton","ptcstoolbar","ptcsvaluedisplay","autorefresh","autorefreshfunction","blog","bubblechart","button","checkbox","collection","container","dashboard","dataexport","datafilter","datetimepicker","dhxgrid","dhxlist","divider","entitypicker","eventchart","eventsrouter","expression","expression2","fieldset","fileupload","flexcontainer","foldingpanel","gauge","geotag","gridadvanced","treegridadvanced","htmltextarea","image","label","labelchart","layout","leddisplay","link","logoutbutton","logoutfunction","mashup","mashupcontainer","maskedtextbox","menu","navigation","navigationfunction","numericentry","pagemashupcontainer","panel","piechart","propertydisplay","preferences","proportionalchart","radiobuttonlist","rangechart","remoteaccess","repeater","shape","slider","statusmessage","tabs","tabsv2","tagcloud","tagpicker","targetmashup","textarea","textbox","thingshapemashup","thingtemplatemashup","timeselector","tree","timeserieschart","validator","validator2","valuedisplay","verticalslider","webframe","wiki","xychart","BMCollectionView","CollectionViewMenuController","CollectionViewSelectionController","CollectionViewEditingController","BMCodeHost","BMCSSHost","BMTypescriptHost","BMTypescriptClassHost","BMControllerSection","BMMenuWidget","BMControllerBase","BMPopoverController","BMWindowController","BMAlertController","BMConfirmationController","BMViewWidget","BMScrollViewWidget","BMLayoutGuideWidget","BMAttributedLabelViewWidget","BMTextFieldWidget","BMKeyboardShortcutController"];
    
        // Contains a mapping between widget names and their default properties values
        /** @type {Record<string, Record<string, unknown>>} */
        const widgetDefaults = {};
    
        // Contains a mapping between widget names and their property definitions
        /** @type {Record<string, unknown>} */
        const widgetTypings = {};
    
        // Enumerate all widgets and read their properties
        for (const Type in TW.IDE.Widgets) {
            try {
                const widget = TW.IDE.Widget.factory({Type});
                if (widget) {
                    // Exclude built-in widgets
                    if (builtInWidgets.includes(Type)) {
                        continue;
                    }
    
                    widgetTypings[Type] = widget.allWidgetProperties();
                    widgetDefaults[Type] = widget.properties;
                }
            } catch (e) {
                // Ignore widgets that can't be created; they won't be available as typings and
                // defaults
            }
        }
    
        const content = JSON.stringify({widgetDefaults, widgetTypings});
    
        // Create and click a link to download the definitions that can be imported into the project
        const downloader = document.createElement('a');
        downloader.href = 'data:attachment/text,' + encodeURI(content);
        downloader.target = '_blank';
        downloader.download = 'widgets.json';
        downloader.click();
    }
});