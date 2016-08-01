var PAGING_INCREMENT = 32;

var getAmountOfColumns = function(screenwidth) {
    return screenwidth > Partup.client.grid.getWidth(11) + 80 ? 4 : 3;
};

Template.app_discover_page.onCreated(function() {
    var template = this;

    // States such as loading states
    template.states = {
        loading_infinite_scroll: false,
        paging_end_reached: new ReactiveVar(false),
        count_loading: new ReactiveVar(false)
    };

    // Partup result count
    template.count = new ReactiveVar();

    // Column layout
    template.columnTilesLayout = new Partup.client.constructors.ColumnTilesLayout({

        // This function will be called for each tile
        calculateApproximateTileHeight: function(tileData, columnWidth) {

            // The goal of this formula is to approach
            // the expected height of a tile as best
            // as possible, synchronously,
            // using the given partup object
            var BASE_HEIGHT = 308;
            var MARGIN = 18;

            var _partup = tileData.partup;

            var NAME_PADDING = 40;
            var NAMe_LINEHEIGHT = 22;
            var nameCharsPerLine = 0.099 * (columnWidth - NAME_PADDING);
            var nameLines = Math.ceil(_partup.name.length / nameCharsPerLine);
            var name = nameLines * NAMe_LINEHEIGHT;

            var DESCRIPTION_PADDING = 40;
            var DESCRIPTION_LINEHEIGHT = 22;
            var descriptionCharsPerLine = 0.145 * (columnWidth - DESCRIPTION_PADDING);
            var descriptionLines = Math.ceil(_partup.description.length / descriptionCharsPerLine);
            var description = descriptionLines * DESCRIPTION_LINEHEIGHT;

            var tribe = _partup.network ? 47 : 0;

            return BASE_HEIGHT + MARGIN + name + description + tribe;
        },
        columns: getAmountOfColumns(Partup.client.screen.size.get('width'))

    });
});

Template.app_discover_page.onRendered(function() {
    var template = this;

    // When the screen size alters
    template.autorun(function() {
        var screenWidth = Partup.client.screen.size.get('width');
        var columns = getAmountOfColumns(screenWidth);

        if (columns !== template.columnTilesLayout.columns.curValue.length) {
            template.columnTilesLayout.setColumns(columns);
        }
    });

    // Current query placeholder
    template.query;

    // When the page changes due to infinite scroll
    template.partupsXMLHttpRequest = null;
    template.page = new ReactiveVar(false, function(previousPage, page) {

        // Cancel possibly ongoing request
        if (template.partupsXMLHttpRequest) {
            template.partupsXMLHttpRequest.abort();
            template.partupsXMLHttpRequest = null;
        }

        // Add some parameters to the query
        var query = mout.object.deepFillIn({}, template.query);
        query.limit = PAGING_INCREMENT;
        query.skip = page * PAGING_INCREMENT;
        query.userId = Meteor.userId();
        query.token = Accounts._storedLoginToken();

        // Update state(s)
        template.states.loading_infinite_scroll = true;

        // Call the API for data
        HTTP.get('/partups/discover' + mout.queryString.encode(query), {
            beforeSend: function(_request) {
                template.partupsXMLHttpRequest = _request;
            }
        }, function(error, response) {
            template.partupsXMLHttpRequest = null;

            if (error || !response.data.partups || response.data.partups.length === 0) {
                template.states.loading_infinite_scroll = false;
                template.states.paging_end_reached.set(true);
                return;
            }

            var result = response.data;
            template.states.paging_end_reached.set(result.partups.length < PAGING_INCREMENT);

            var tiles = result.partups.map(function(partup) {
                Partup.client.embed.partup(partup, result['cfs.images.filerecord'], result.networks, result.users);

                return {
                    partup: partup
                };
            });

            // Add tiles to the column layout
            template.columnTilesLayout.addTiles(tiles, function callback() {
                template.states.loading_infinite_scroll = false;
            });
        });
    });

    // When the query changes
    template.countXMLHttpRequest = null;
    template.autorun(function() {
        if (template.countXMLHttpRequest) {
            template.countXMLHttpRequest.abort();
            template.countXMLHttpRequest = null;
        }

        template.query = Partup.client.discover.composeQueryObject();

        var query = mout.object.deepFillIn({}, template.query);
        query.userId = Meteor.userId();
        query.token = Accounts._storedLoginToken();

        template.states.paging_end_reached.set(false);
        template.page.set(0);
        template.columnTilesLayout.clear();

        template.states.count_loading.set(true);
        HTTP.get('/partups/discover/count' + mout.queryString.encode(query), {
            beforeSend: function(request) {
                template.countXMLHttpRequest = request;
            }
        }, function(error, response) {
            template.countXMLHttpRequest = null;
            template.states.count_loading.set(false);
            if (error || !response || !mout.lang.isString(response.content)) { return; }

            var content = JSON.parse(response.content);
            template.count.set(content.count);
        });
    });

    // Infinite scroll
    Partup.client.scroll.infinite({
        template: template,
        element: template.find('[data-infinitescroll-container]'),
        offset: 1800
    }, function() {
        if (template.states.loading_infinite_scroll || template.states.paging_end_reached.curValue) { return; }

        var nextPage = template.page.get() + 1;
        template.page.set(nextPage);
    });

});

Template.app_discover_page.helpers({
    columnTilesLayout: function() {
        return Template.instance().columnTilesLayout;
    },
    endReached: function() {
        return Template.instance().states.paging_end_reached.get();
    },
    count: function() {
        return Template.instance().count.get();
    },
    countLoading: function() {
        return Template.instance().states.count_loading.get();
    }
});

Template.app_discover_page.events({
});
