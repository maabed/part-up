var PAGING_INCREMENT = 32;

var getAmountOfColumns = function(screenwidth) {
    return screenwidth > Partup.client.grid.getWidth(11) + 80 ? 4 : 3;
};

Template.app_profile_supporter_partups.onCreated(function() {
    var template = this;
    template.getArchivedPartups = false;
    // Partup result count
    template.partupCount = new ReactiveVar();

    // States such as loading states
    template.states = {
        loadingInfiniteScroll: false,
        pagingEndReached: new ReactiveVar(false),
        partupCountLoading: new ReactiveVar(true)
    };

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

    template.initialize = function(filter) {
        template.getArchivedPartups = filter === 'archived' ? true : false;

        var query = {};
        query.userId =  Meteor.userId();
        query.token =  Accounts._storedLoginToken();
        query.archived = template.getArchivedPartups;
        // Get count
        template.states.partupCountLoading.set(true);
        HTTP.get('/users/' + template.data.profileId + '/supporterpartups/count' + mout.queryString.encode(query), function(error, response) {
            if (query.archived !== template.getArchivedPartups) return;

            template.states.partupCountLoading.set(false);
            if (error || !response || !mout.lang.isString(response.content)) { return; }
            var content = JSON.parse(response.content);
            template.partupCount.set(content.count);
        });

        // When the page changes due to infinite scroll
        template.page.set(0);
    };

    // When the page changes due to infinite scroll
    template.page = new ReactiveVar(false, function(previousPage, page) {

        // Add some parameters to the query
        var query = {};
        query.userId =  Meteor.userId();
        query.token =  Accounts._storedLoginToken();
        query.limit = PAGING_INCREMENT;
        query.skip = page * PAGING_INCREMENT;
        query.archived = template.getArchivedPartups;

        // Update state(s)
        template.states.loadingInfiniteScroll = true;

        // Call the API for data
        HTTP.get('/users/' + template.data.profileId + '/supporterpartups' + mout.queryString.encode(query), {
            headers: {
                Authorization: 'Bearer ' + Accounts._storedLoginToken()
            }
        }, function(error, response) {
            if (query.archived !== template.getArchivedPartups) return;

            if (error || !response.data.partups || response.data.partups.length === 0) {
                template.states.loadingInfiniteScroll = false;
                template.states.pagingEndReached.set(true);
                return;
            }

            var result = response.data;
            template.states.pagingEndReached.set(result.partups.length < PAGING_INCREMENT);

            var tiles = result.partups.map(function(partup) {
                Partup.client.embed.partup(partup, result['cfs.images.filerecord'], result.networks, result.users);

                return {
                    partup: partup
                };
            });

            // Add tiles to the column layout
            template.columnTilesLayout.addTiles(tiles, function callback() {
                template.states.loadingInfiniteScroll = false;
            });
        });
    });

    var switchFilter = function(filter) {
        template.columnTilesLayout.clear(function() {
            template.initialize(filter);
        });
    };

    template.filter = new ReactiveVar('active', function(a, b) {
        if (a !== b) switchFilter(b);
    });
    template.initialize('active');
});

Template.app_profile_supporter_partups.onRendered(function() {
    var template = this;

    // When the screen size alters
    template.autorun(function() {
        var screenWidth = Partup.client.screen.size.get('width');
        var columns = getAmountOfColumns(screenWidth);

        if (columns !== template.columnTilesLayout.columns.curValue.length) {
            template.columnTilesLayout.setColumns(columns);
        }
    });

    // Infinite scroll
    Partup.client.scroll.infinite({
        template: template,
        element: template.find('[data-infinitescroll-container]'),
        offset: 1500
    }, function() {
        if (template.states.loadingInfiniteScroll || template.states.pagingEndReached.curValue) { return; }

        var nextPage = template.page.get() + 1;
        template.page.set(nextPage);
    });
});

Template.app_profile_supporter_partups.helpers({
    data: function() {
        var template = Template.instance();
        var self = this;
        return {
            columnTilesLayout: function() {
                return template.columnTilesLayout;
            },
            partupCount: function() {
                return template.partupCount.get();
            },
            firstname: function() {
                var user = Meteor.users.findOne(self.profileId);
                return User(user).getFirstname();
            },
            filterReactiveVar: function() {
                return template.filter;
            }
        };
    },
    state: function() {
        var template = Template.instance();
        var states = template.states;
        return {
            endReached: function() {
                return states.pagingEndReached.get();
            },
            countLoading: function() {
                return states.partupCountLoading.get();
            },
            selectedFilter: function() {
                return template.filter.get();
            }
        };
    },
    translations: function() {
        var template = Template.instance();
        return {
            partupsLoading: function(selection) {
                return TAPi18n.__('pages-app-profile-supporter-partups-' + selection + '-loading');
            },
            partupsPrefix: function(selection, name) {
                return TAPi18n.__('pages-app-profile-supporter-partups-' + selection + '-prefix', {
                    name: name
                });
            },
            partupsCount: function(selection, count) {
                return TAPi18n.__('pages-app-profile-supporter-partups-' + selection + '-count', {
                    count: count
                });
            },
            partupsNone: function(selection, name) {
                return TAPi18n.__('pages-app-profile-supporter-partups-' + selection + '-none', {
                    name: name
                });
            }
        };
    }
});
