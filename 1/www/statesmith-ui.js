const SS_COMPOSITE_STATE_GROUP_STYLE_ID = "SS_COMPOSITE_STATE_GROUP_STYLE_ID";
const SS_SIMPLE_STATE_STYLE_ID = "SS_SIMPLE_STATE_STYLE_ID";
const SS_EVENT_HANDLERS_TEXT_STYLE_ID = "SS_EVENT_HANDLERS_TEXT_STYLE_ID";


class StateSmithUI {

    constructor(){
        this.groupBorderSize = 20;

        this.originalUpdateActionStatesFunc = EditorUi.prototype.updateActionStates;    //TODOLOW rework to same format as other extensions
        EditorUi.prototype.updateActionStates = this.updateActionStates;

        //completely override `Sidebar.prototype.init`
        {
            Sidebar.prototype.init = function() {
                ssui.addStateShapesPaletteToSidebar(this);
            }
        }

        //extend Toolbar to add our buttons
        {
            let toolbarInit = Toolbar.prototype.init;
            Toolbar.prototype.init = function() {
                toolbarInit.apply(this, arguments);
                ssui.addExitGroupToToolbar(this);
            }
        }

        //override Graph.prototype.dblClick to support entering group on body double click issue #4
        {
            let dblClick = Graph.prototype.dblClick;
            Graph.prototype.dblClick = function(event, cell) {
                //remember `this` is of type `Graph`
                let done = false;
                let pt = mxUtils.convertPoint(this.container, mxEvent.getClientX(event), mxEvent.getClientY(event));

                cell = cell || this.getCellAt(pt.x, pt.y)

                if (ssui.isCompositeState(this, cell)) {
                    //TODOLOW look at supporting event listeners and pre-consuming events
					let state = this.view.getState(cell);

                    //TODO consider why `Graph.prototype.dblClick` had below
                    // let src = mxEvent.getSource(event);
                    // if (this.firstClickState == state && this.firstClickSource == src)
					// {
						if (state == null || state.text == null || state.text.node == null ||
							!mxUtils.contains(state.text.boundingBox, pt.x, pt.y))
						{
                            this.enterGroup(cell);
                            done = true;
                        }
                    // }
                } 
                
                if (!done) {
                    dblClick.call(this, event, cell);
                }
            };
        }


        //override mxGraph.prototype.getCellContainmentArea
        {
            let getCellContainmentArea = mxGraph.prototype.getCellContainmentArea;
            mxGraph.prototype.getCellContainmentArea = function(cell) {
                //remember that `this` is object of `mxGraph`
                let rectangle = getCellContainmentArea.call(this, cell);

                let parent = this.model.getParent(cell);

                if (rectangle != null && ssui.isCompositeState(this, parent)) {
                    rectangle.x += ssui.groupBorderSize;
                    rectangle.y += ssui.groupBorderSize;
                    rectangle.width  -= 2 * ssui.groupBorderSize;
                    rectangle.height -= 2 * ssui.groupBorderSize;
                }

                return rectangle;
            }
        }

        //override exitGroup
        {
            let exitGroup = mxGraph.prototype.exitGroup;
            mxGraph.prototype.exitGroup = function() {
                let group = this.getCurrentRoot();
                if (this.isValidRoot(group))
                {
                    //remember `this` will be of type `mxGraph`
                    exitGroup.apply(this, arguments);
                    ssui.fitExpandedGroupToChildren(this, group);
                }
            }
        }
    }

    /**
     *
     * @param {mxCell} cell
     * @param {string} targetStyleName
     * @returns {boolean}
     * @memberof StateSmithUI
     */
    hasStyle(cell, targetStyleName) {
        /** @type {string} */    
        let style = cell.getStyle();

        let index = style.indexOf(targetStyleName);

        if (index < 0){
            return false;
        }

        //it has the passed style if next char after is ';' or end of string
        if (style.length == targetStyleName.length || style.charAt(targetStyleName.length) == ';') {
            return true;
        }

        return false;
    }

    /**
     * 
     * @param {mxCell} cell 
     */
    isEventHandlerText(graph, cell) {
        if (!graph || !graph.model) {
            return false;
        }
        return ssui.hasStyle(cell, SS_EVENT_HANDLERS_TEXT_STYLE_ID);
    }

    /**
     * 
     * @param {mxCell} cell 
     */
    isCompositeState(graph, cell) {
        if (!graph || !graph.model) {
            return false;
        }
        return ssui.hasStyle(cell, SS_COMPOSITE_STATE_GROUP_STYLE_ID);
    }

    /**
     * Will ignore collapsed groups
     * @param {mxGraph} graph 
     * @param {mxCell} group 
     */
    fitExpandedGroupToChildren(graph, group) {
        if (group) {

            //don't adjust size for collapsed groups
            if (group.isCollapsed()) {
                return;
            }

            if (graph.getModel().getChildCount(group) > 0)
            {
                let geo = graph.getCellGeometry(group);

                if (geo != null)
                {
                    let children = graph.getChildCells(group, true, true);
                    let includeEdges = false;
                    let paddedKidsBox = graph.getBoundingBoxFromGeometry(children, includeEdges); //TODOLOW include edges that are fully contained within group
                    paddedKidsBox.width += 2 * ssui.groupBorderSize;
                    paddedKidsBox.height += 2 * ssui.groupBorderSize;
                    paddedKidsBox.height += graph.getStartSize(group).height; //get group's label height

                    let unPaddedFullBox = graph.getBoundingBoxFromGeometry([group].concat(children), true);

                    geo = geo.clone(); //needed for undo support
                    geo.width = Math.max(paddedKidsBox.width, unPaddedFullBox.width);
                    geo.height = Math.max(paddedKidsBox.height, unPaddedFullBox.height);

                    graph.getModel().setGeometry(group, geo);
                }
            }
        }
    }

    /**
     * 
     * @param {Toolbar} toolbar 
     */
    addExitGroupToToolbar(toolbar) {
        toolbar.addSeparator();
        let elts = toolbar.addItems(['exitGroup']);
        elts[0].setAttribute('title', mxResources.get('exitGroup') + ' (' + toolbar.editorUi.actions.get('exitGroup').shortcut + ')');
    }

    /**
     * Overrides EditorUi.prototype.updateActionStates.
     * Remember that `this` is actually an object of `EditorUi`, not `StateSmithUI`
     */
    updateActionStates() {
        ssui.originalUpdateActionStatesFunc.call(this);
    	let graph = this.editor.graph;
        this.actions.get('group').setEnabled(graph.getSelectionCount() >= 1);
    }

    /**
     *
     * @param {mxGraph} graph. Actually of type {Graph}, but vscode doesn't detect that type. {Graph} extends {mxGraph}.
     * @param {EditorUi} editor
     * @memberof StateSmithUI
     */
    customizeStuff(graph, editor) {
        graph.allowDanglingEdges = false;
        graph.constrainChildren = true;     //prevent children from being outside of parent group
        graph.extendParentsOnAdd = false;   //see issue #1

        graph.keepEdgesInForeground = true; //prevent edges from being behind vertices. see issue #5

        window._graph = graph;
        window._editor = editor;
    }

    /**
     * for issue #11
     * @memberof StateSmithUI
     */
    setStyleVertexRounding(style) {
        style[mxConstants.STYLE_ROUNDED] = true;
        style[mxConstants.STYLE_ARCSIZE] = 10;        
        style[mxConstants.STYLE_ABSOLUTE_ARCSIZE] = 1; //`1` means enabled.
    }

    /**
     * @param {mxGraph} graph
     * @memberof StateSmithUI
     */
    setDefaultGroupStyle(graph) {
        let style = new Object();
        style[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_SWIMLANE;
        style[mxConstants.STYLE_PERIMETER] = mxPerimeter.RectanglePerimeter;
        style[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_CENTER;
        style[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_TOP;
        style[mxConstants.STYLE_FILLCOLOR] = '#FCFCFC';
        style[mxConstants.STYLE_STROKECOLOR] = '#000000';
        style[mxConstants.STYLE_FONTCOLOR] = '#000000';
        style[mxConstants.STYLE_STARTSIZE] = '30';
        style[mxConstants.STYLE_FONTSIZE] = '16';
        style[mxConstants.STYLE_FONTSTYLE] = mxConstants.FONT_BOLD;
        this.setStyleVertexRounding(style);
        graph.getStylesheet().putCellStyle(SS_COMPOSITE_STATE_GROUP_STYLE_ID, style);
    }

    /**
     * @param {mxGraph} graph
     * @memberof StateSmithUI
     */
    setSimpleStateStyle(graph) {
        let style = mxUtils.clone(graph.getStylesheet().getDefaultVertexStyle());
        this.setStyleVertexRounding(style);
        graph.getStylesheet().putCellStyle(SS_SIMPLE_STATE_STYLE_ID, style);
    }

    /**
     * @param {mxStylesheet} styleSheet
     * @memberof StateSmithUI
     */
    setEventHandlerTextStyle(styleSheet) {
        //don't try `styleSheet.getCellStyle("text;strokeColor=none;fillColor=none;rounded=0;");` as it will delete strokeColor, fillColor instead of setting to NONE.
        let style = { };
        style[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_LEFT;
        style[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_TOP;
        style[mxConstants.STYLE_FILLCOLOR] = mxConstants.NONE;
        style[mxConstants.STYLE_GRADIENTCOLOR] = mxConstants.NONE;
        style[mxConstants.STYLE_STROKECOLOR] = mxConstants.NONE;
        style[mxConstants.STYLE_ROUNDED] = 0;
        styleSheet.putCellStyle(SS_EVENT_HANDLERS_TEXT_STYLE_ID, style);
    }

    /**
     * 
     * @param {Sidebar} sidebar 
     */
    addStateShapesPaletteToSidebar(sidebar) {
        sidebar.addSearchPalette(true);

        ssui.setSimpleStateStyle(sidebar.graph);
        ssui.setDefaultGroupStyle(sidebar.graph);
        ssui.setEventHandlerTextStyle(sidebar.graph.getStylesheet());

        const enterDoExitCode = "enter / {  }\ndo / {  }\nexit / {  }";

        let fns = [
            //TODO make style for intial state. Issue #16.
            sidebar.createVertexTemplateEntry('ellipse;aspect=fixed;fillColor=#000000;editable=0;resizable=0;', 25, 25, '', 'Initial State', null, null, 'initial pseudo state'),
            sidebar.createVertexTemplateEntry(SS_SIMPLE_STATE_STYLE_ID, 120, 50, "STATE", 'Empty Simple State', null, null, 'simple state'),
            sidebar.createVertexTemplateEntry(SS_SIMPLE_STATE_STYLE_ID, 160, 70, "STATE\n" + enterDoExitCode, 'Simple State (enter,do,exit)', null, null, 'simple state enter,do,exit'),
            sidebar.createVertexTemplateEntry(SS_COMPOSITE_STATE_GROUP_STYLE_ID, 250, 150, "STATE", 'Composite State', null, null, 'composite nested nesting complex state'),
            
            //TODO make a style for identification. Issue #16.
            sidebar.createVertexTemplateEntry(SS_EVENT_HANDLERS_TEXT_STYLE_ID, 190, 60,   
                enterDoExitCode, 'Event Handlers en,do,exit', null, null, 'event action handler'),


            //TODO allow event handler text to omit parent border padding

            sidebar.addEntry('composite state enter,do,exit', function()
            {
                let cell = new mxCell('STATE', new mxGeometry(0, 0, 250, 150));
                cell.setVertex(true);
                cell.setConnectable(true);
                cell.setStyle(SS_COMPOSITE_STATE_GROUP_STYLE_ID);

                let innerHandlers = new mxCell(enterDoExitCode, new mxGeometry(5, 30, 190, 60));
                innerHandlers.setVertex(true);
                innerHandlers.setConnectable(false);
                innerHandlers.setStyle(SS_EVENT_HANDLERS_TEXT_STYLE_ID); //TODOLOW code re-use for above
                
                cell.insert(innerHandlers);

                return sidebar.createVertexTemplateFromCells([cell], cell.geometry.width, cell.geometry.height, 'Composite State (enter,do,exit)');
            }),                
        ];
        
        {
            let expanded = true;
            let id = "State Objects";
            let title = id;
            sidebar.addPaletteFunctions(id, title, expanded, fns);
        }
    }

    /**
     * @param {mxGraph} graph
     * @memberof StateSmithUI
     */
    groupCells(graph) 
    {
	    graph.groupCells(ssui.createGroup(), this.groupBorderSize);
    }

    createGroup() {
        var group = new mxCell('Group', new mxGeometry());
        group.setVertex(true);
        group.setConnectable(true);
        group.setStyle(SS_COMPOSITE_STATE_GROUP_STYLE_ID);
        return group;
    }
}


const ssui = new StateSmithUI();
