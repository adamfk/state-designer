const SS_STATE_GROUP_STYLE_ID = "SS_STATE_GROUP_STYLE_ID";

class StateSmithUI {

    constructor(){
        this.groupBorderSize = 20;

        this.originalUpdateActionStatesFunc = EditorUi.prototype.updateActionStates;
        EditorUi.prototype.updateActionStates = this.updateActionStates;

        this.groupsEntered = [];
        var groupsEntered = this.groupsEntered;

        //override enterGroup
        {
            let enterGroup = mxGraph.prototype.enterGroup;
            mxGraph.prototype.enterGroup = function(cell) {
                cell = cell || this.getSelectionCell();         //this code from mxGraph.prototype.enterGroup
                if (this.isValidRoot(cell))                     //this code from mxGraph.prototype.enterGroup
                {
                    //remember `this` will be of type `mxGraph`
                    enterGroup.apply(this, arguments);
                    console.log(cell);
                    groupsEntered.push(cell);
                }
            }
        }

        //override exitGroup
        {
            let exitGroup = mxGraph.prototype.exitGroup;
            mxGraph.prototype.exitGroup = function() {
                //remember `this` will be of type `mxGraph`
                exitGroup.apply(this, arguments);
                let group = groupsEntered.pop();

                ssui.fitGroupToChildren(graph, group);
            }
        }
    }

    /**
     * 
     * @param mxGraph graph 
     * @param mxCell group 
     */
    fitGroupToChildren(graph, group) {
        if (group) {

            //don't adjust size for collapsed groups
            if (group.isCollapsed()) {
                return;
            }

            console.log("exiting and resizing",  group);
            if (graph.getModel().getChildCount(group) > 0)
            {
                var geo = graph.getCellGeometry(group);

                if (geo != null)
                {
                    var children = graph.getChildCells(group, true, true);
                    let toCheck = [group].concat(children)
                    var bounds = graph.getBoundingBoxFromGeometry(toCheck, true);

                    geo = geo.clone(); //needed for undo support
                    geo.width = Math.max(geo.width, bounds.width);
                    geo.height = Math.max(geo.height, bounds.height);

                    graph.getModel().setGeometry(group, geo);
                }
            }
        }
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

    customizeStuff(graph, editor) {
        ssui.setDefaultGroupStyle(graph);
        graph.allowDanglingEdges = false;
        graph.constrainChildren = true;     //prevent children from being outside of parent group
        graph.extendParentsOnAdd = false;   //see issue #1

        window._graph = graph;
        window._editor = editor;
    }

    setDefaultGroupStyle(graph) {
        let style = new Object();
        style[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_SWIMLANE;
        style[mxConstants.STYLE_PERIMETER] = mxPerimeter.RectanglePerimeter;
        style[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_CENTER;
        style[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_TOP;
        style[mxConstants.STYLE_FILLCOLOR] = '#FF9103';
        style[mxConstants.STYLE_GRADIENTCOLOR] = '#F8C48B';
        style[mxConstants.STYLE_STROKECOLOR] = '#E86A00';
        style[mxConstants.STYLE_FONTCOLOR] = '#000000';
        style[mxConstants.STYLE_ROUNDED] = true;
        style[mxConstants.STYLE_OPACITY] = '80';
        style[mxConstants.STYLE_STARTSIZE] = '30';
        style[mxConstants.STYLE_FONTSIZE] = '16';
        style[mxConstants.STYLE_FONTSTYLE] = 1;
        graph.getStylesheet().putCellStyle(SS_STATE_GROUP_STYLE_ID, style);
    }

    groupCells(graph) 
    {
	    graph.groupCells(ssui.createGroup(), this.groupBorderSize);
    }

    createGroup() {
        var group = new mxCell('Group', new mxGeometry());
        group.setVertex(true);
        group.setConnectable(true);
        group.setStyle(SS_STATE_GROUP_STYLE_ID);
        return group;
    }
}


const ssui = new StateSmithUI();
