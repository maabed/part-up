Template.ColumnTilesLayout.onCreated(function() {
    var template = this;
    template.firstBlockSettings = new ReactiveVar(template.data.firstBlockSettings);
    template.rendered = new ReactiveVar(false);
});
Template.ColumnTilesLayout.onRendered(function() {
    var template = this;
    this.data.instance._template = this;
    template.rendered.set(true);
});

Template.ColumnTilesLayout.helpers({
    firstBlockSettings: function() {
        var template = Template.instance();
        return template.firstBlockSettings.get();
    },
    columns: function() {
        var columnsArray = this.instance.columns.get();
        var columns = [];
        _.each(columnsArray, function(item, index) {
            return columns[index] = {
                items: item,
                index: index
            };
        });
        return columns;
    },
    rendered: function() {
        return Template.instance().rendered.get();
    },
    columnWidth: function() {
        return (100 / Template.instance().data.instance.columns.get().length).toFixed(1);
    }
});
