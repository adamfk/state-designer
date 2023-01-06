Draw.loadPlugin(function(ui) {
	let graph = ui.editor.graph;
    // graph.allowDanglingEdges = true;
    graph.constrainChildren = true;     //prevent children from being outside of parent group
    graph.extendParentsOnAdd = false;   //see issue #1
    graph.keepEdgesInForeground = true; //prevent edges from being behind vertices. see issue #5

    let toolbar = ui.toolbar;
    toolbar.addSeparator();
    let elts = toolbar.addItems(['enterGroup', 'exitGroup']);
    elts[0].setAttribute('title', mxResources.get('enterGroup') + ' (' + toolbar.editorUi.actions.get('enterGroup').shortcut + ')');
    elts[1].setAttribute('title', mxResources.get('exitGroup') + ' (' + toolbar.editorUi.actions.get('exitGroup').shortcut + ')');

    addCustomExitGroupHandler();
    enableCustomDoubleClickHandler(graph);
});


function addCustomExitGroupHandler()
{
    let originalExitGroup = mxGraph.prototype.exitGroup;
    mxGraph.prototype.exitGroup = function() {
        let group = this.getCurrentRoot();
        if (this.isValidRoot(group))
        {
            //remember `this` will be of type `mxGraph`
            originalExitGroup.apply(this, arguments);
            fitExpandedGroupToChildren(this, group);
        }
    };
}


/**
 * Will ignore collapsed groups.
 * @param {mxGraph} graph 
 * @param {mxCell} group 
 */
function fitExpandedGroupToChildren(graph, group)
{
    if (!group)
        return;

    //don't adjust size for collapsed groups
    if (group.isCollapsed())
        return;

    if (graph.getModel().getChildCount(group) <= 0)
        return;

    let geo = graph.getCellGeometry(group);

    if (geo == null)
        return;

    let children = graph.getChildCells(group, true, true);
    let includeEdges = false;
    let kidsBoundingBox = graph.getBoundingBoxFromGeometry(children, includeEdges); // todo low - include edges that are fully contained within group

    const groupBorderSize = 20;
    let requiredWidth = kidsBoundingBox.x + kidsBoundingBox.width + groupBorderSize;
    let requiredHeight = kidsBoundingBox.y + kidsBoundingBox.height + groupBorderSize;

    geo = geo.clone(); // needed for undo support
    let parentBoundingBox = graph.getBoundingBoxFromGeometry([group].concat(children), true);
    geo.width = Math.max(parentBoundingBox.width, requiredWidth);
    geo.height = Math.max(parentBoundingBox.height, requiredHeight);

    graph.getModel().setGeometry(group, geo);
}

/**
 * override Graph.dblClick to support entering group on body double click issue #4
 * @param {mxGraph} graph 
 */
function enableCustomDoubleClickHandler(graph)
{
    let dblClick = graph.dblClick;
    graph.dblClick = function(event, cell) {
        //remember `this` is of type `Graph`
        let done = false;
        let pt = mxUtils.convertPoint(this.container, mxEvent.getClientX(event), mxEvent.getClientY(event));

        cell = cell || this.getCellAt(pt.x, pt.y)

        try {
            const isGroup = graph.getModel().getChildCount(cell) > 0;
            if (isGroup) {
                let state = this.view.getState(cell);

                if (state == null || state.text == null || state.text.node == null ||
                    !mxUtils.contains(state.text.boundingBox, pt.x, pt.y))
                {
                    this.enterGroup(cell);
                    done = true;
                }
            }
        } catch (error) {
            
        }
        
        if (!done) {
            dblClick.call(this, event, cell);
        }
    };
}