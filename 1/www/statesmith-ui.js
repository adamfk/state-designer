const SS_STATE_GROUP_STYLE_ID = "SS_STATE_GROUP_STYLE_ID";

class StateSmithUI {

    constructor(){
        this.groupBorderSize = 20;

        this.originalUpdateActionStatesFunc = EditorUi.prototype.updateActionStates;
        EditorUi.prototype.updateActionStates = this.updateActionStates;

        //override mxGraph.prototype.getCellContainmentArea
        {
            let getCellContainmentArea = mxGraph.prototype.getCellContainmentArea;
            mxGraph.prototype.getCellContainmentArea = function(cell) {
                //remember that `this` is object of `mxGraph`
                let rectangle = getCellContainmentArea.call(this, cell);

                let parent = this.model.getParent(cell);

                if (rectangle != null && this.model.getStyle(parent) === SS_STATE_GROUP_STYLE_ID) {    //TODOLOW refactor to function to check for ss state group
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
     * Will ignore collapsed groups
     * @param mxGraph graph 
     * @param mxCell group 
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
