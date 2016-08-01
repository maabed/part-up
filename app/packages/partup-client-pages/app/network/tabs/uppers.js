var PAGING_INCREMENT = 32;

var getAmountOfColumns = function(screenwidth) {
    return screenwidth > Partup.client.grid.getWidth(11) + 80 ? 4 : 3;
};

Template.app_network_uppers.onCreated(function() {
    var template = this;


    // Partup result count
    template.count = new ReactiveVar();

    // States such as loading states
    template.states = {
        loading_infinite_scroll: false,
        paging_end_reached: new ReactiveVar(false),
        count_loading: new ReactiveVar(false)
    };

    // Column layout
    template.columnTilesLayout = new Partup.client.constructors.ColumnTilesLayout({

        // This function will be called for each tile
        calculateApproximateTileHeight: function(tileData, columnWidth) {

            // The goal of this formula is to approach
            // the expected height of a tile as best
            // as possible, synchronously,
            // using the given upper object
            return 500;
        },
        columns: getAmountOfColumns(Partup.client.screen.size.get('width'))
    });

    template.initialize = function(filter, searchQuery) {

        var query = {};
        query.userId = Meteor.userId();
        query.token = Accounts._storedLoginToken();
        query.textSearch = template.searchQuery.get();

        // Get count
        template.states.count_loading.set(true);
        HTTP.get('/networks/' + template.data.networkSlug + '/uppers/count' + mout.queryString.encode(query), function(error, response) {
            template.states.count_loading.set(false);
            if (error || !response || !mout.lang.isString(response.content)) { return; }

            var content = JSON.parse(response.content);
            template.count.set(content.count);
        });

        template.page.set(0);
    };

    // When the page changes due to infinite scroll
    template.page = new ReactiveVar(false, function(previousPage, page) {

        // Add some parameters to the query
        var query = {};
        query.limit = PAGING_INCREMENT;
        query.skip = page * PAGING_INCREMENT;
        query.userId = Meteor.userId();
        query.textSearch = template.searchQuery.get();

        // Update state(s)
        template.states.loading_infinite_scroll = true;

        // Call the API for data
        HTTP.get('/networks/' + template.data.networkSlug + '/uppers' + mout.queryString.encode(query), {
            headers: {
                Authorization: 'Bearer ' + Accounts._storedLoginToken()
            }
        }, function(error, response) {
            if (error || !response.data.users || response.data.users.length === 0) {
                template.states.loading_infinite_scroll = false;
                template.states.paging_end_reached.set(true);
                return;
            }

            var result = response.data;
            template.states.paging_end_reached.set(result.users.length < PAGING_INCREMENT);

            var tiles = result.users.map(function(user) {
                Partup.client.embed.user(user, result['cfs.images.filerecord']);

                return {
                    user: user
                };
            });

            // Add tiles to the column layout
            template.columnTilesLayout.addTiles(tiles, function callback() {
                template.states.loading_infinite_scroll = false;
            });
        });
    });

    // When the screen size alters
    template.autorun(function() {
        var screenWidth = Partup.client.screen.size.get('width');
        var columns = getAmountOfColumns(screenWidth);

        if (columns !== template.columnTilesLayout.columns.curValue.length) {
            template.columnTilesLayout.setColumns(columns);
        }
    });

    var switchFilter = function() {
        template.columnTilesLayout.clear(function() {
            template.initialize();
        });
    };

    template.searchQuery = new ReactiveVar('', function(a, b) {
        if (a !== b) switchFilter(b);
    });

    var setSearchQuery = function(query) {
        template.searchQuery.set(query);
    };

    template.throttledSetSearchQuery = _.throttle(setSearchQuery, 500, {trailing: true});

    template.initialize();
});

Template.app_network_uppers.onRendered(function() {
    var template = this;
    // Infinite scroll
    Partup.client.scroll.infinite({
        template: template,
        element: template.find('[data-infinitescroll-container]'),
        offset: 1500
    }, function() {
        if (template.states.loading_infinite_scroll || template.states.paging_end_reached.curValue) { return; }

        var nextPage = template.page.get() + 1;
        template.page.set(nextPage);
    });
});

Template.app_network_uppers.events({
    'submit [data-nosubmit]': function(event, template) {
        event.preventDefault();
    },
    'click [data-flexible-center]': function(event, template) {
        event.preventDefault();
        $(event.currentTarget).parent().addClass('start');
        $('[data-search]').focus();
        _.defer(function() {
            $(event.currentTarget).parent().addClass('active');
        });
    },
    'click [data-clear]': function(event, template) {
        event.preventDefault();
        event.stopPropagation();
        $('[data-search]').val('');
        _.defer(function() {
            template.throttledSetSearchQuery('');
            $('[data-search]').blur();
        });
    },
    'input [data-search]': function(event, template) {
        template.throttledSetSearchQuery(event.currentTarget.value);
    },
    'focus [data-search]': function(event, template) {
        $(event.currentTarget).parent().addClass('start');
        _.defer(function() {
            template.focussed = true;
            $(event.currentTarget).parent().addClass('active');
        });
    },
    'blur [data-search]': function(event, template) {
        if (!$(event.target).val()) {
            template.focussed = false;
            $('[data-flexible-center]').parent().removeClass('active');
        }
    },
    'transitionend [data-flexible-center]': function(event, template) {
        $(event.currentTarget).parent().removeClass('start');
    }
});

Template.app_network_uppers.helpers({
    networkInviteTileSettings: function() {
        var template = Template.instance();
        return {
            template: 'NetworkInviteTile',
            data: {
                networkSlug: template.data.networkSlug
            }
        };
    },
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
    },
});
