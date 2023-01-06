Draw.loadPlugin(function(ui) {
    let toolbar = ui.toolbar;
    toolbar.addSeparator();
    let elts = toolbar.addItems(['enterGroup', 'exitGroup']);
    elts[0].setAttribute('title', mxResources.get('enterGroup') + ' (' + toolbar.editorUi.actions.get('enterGroup').shortcut + ')');
    elts[1].setAttribute('title', mxResources.get('exitGroup') + ' (' + toolbar.editorUi.actions.get('exitGroup').shortcut + ')');
});
