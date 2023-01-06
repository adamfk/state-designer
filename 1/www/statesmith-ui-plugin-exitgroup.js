Draw.loadPlugin(function(ui) {
	let graph = ui.editor.graph;
    // graph.allowDanglingEdges = true;
    graph.constrainChildren = true;     //prevent children from being outside of parent group
    graph.extendParentsOnAdd = true;   //see issue #1
    graph.keepEdgesInForeground = true; //prevent edges from being behind vertices. see issue #5

    let toolbar = ui.toolbar;
    toolbar.addSeparator();
    let elts = toolbar.addItems(['enterGroup', 'exitGroup']);
    elts[0].setAttribute('title', mxResources.get('enterGroup') + ' (' + toolbar.editorUi.actions.get('enterGroup').shortcut + ')');
    elts[1].setAttribute('title', mxResources.get('exitGroup') + ' (' + toolbar.editorUi.actions.get('exitGroup').shortcut + ')');

    enableCustomDoubleClickHandler(graph);
});

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