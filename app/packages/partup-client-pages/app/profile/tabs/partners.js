var PAGING_INCREMENT = 32;

var getAmountOfColumns = function(screenwidth) {
    return screenwidth > Partup.client.grid.getWidth(11) + 80 ? 4 : 3;
};

Template.app_profile_partners.onCreated(function() {
    var template = this;
    // Partup result count
    template.partnerCount = new ReactiveVar();

    // States such as loading states
    template.states = {
        loadingInfiniteScroll: false,
        pagingEndReached: new ReactiveVar(false),
        partnerCountLoading: new ReactiveVar(true)
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
            var _partner = tileData.user;

            var NAME_PADDING = 40;
            var NAMe_LINEHEIGHT = 22;
            var nameCharsPerLine = 0.099 * (columnWidth - NAME_PADDING);
            var nameLines = Math.ceil(_partner.profile.name.length / nameCharsPerLine);
            var name = nameLines * NAMe_LINEHEIGHT;

            var DESCRIPTION_PADDING = 40;
            var DESCRIPTION_LINEHEIGHT = 22;
            var descriptionCharsPerLine = 0.145 * (columnWidth - DESCRIPTION_PADDING);
            var descriptionText = _partner.profile.description ? _partner.profile.description.length : '';
            var descriptionLength = descriptionText.length || 0;
            var descriptionLines = Math.ceil(descriptionLength / descriptionCharsPerLine);
            var description = descriptionLines * DESCRIPTION_LINEHEIGHT;
            return BASE_HEIGHT + MARGIN + name + description;
        },
        columns: getAmountOfColumns(Partup.client.screen.size.get('width'))

    });

    template.initialize = function(filter) {

        var query = {};
        query.userId =  Meteor.userId();
        query.token =  Accounts._storedLoginToken();
        // Get count
        template.states.partnerCountLoading.set(true);
        HTTP.get('/users/' + template.data.profileId + '/partners/count' + mout.queryString.encode(query), function(error, response) {
            template.states.partnerCountLoading.set(false);
            if (error || !response || !mout.lang.isString(response.content)) { return; }
            var content = JSON.parse(response.content);
            template.partnerCount.set(content.count);
        });

        // When the page changes due to infinite scroll
        template.page.set(0);
    };

    // When the page changes due to infinite scroll
    template.page = new ReactiveVar(false, function(previousPage, page) {

        // Add some parameters to the query
        var query = {};
        query.limit = PAGING_INCREMENT;
        query.skip = page * PAGING_INCREMENT;

        // Update state(s)
        template.states.loadingInfiniteScroll = true;

        // Call the API for data
        HTTP.get('/users/' + template.data.profileId + '/partners' + mout.queryString.encode(query), {
            headers: {
                Authorization: 'Bearer ' + Accounts._storedLoginToken()
            }
        }, function(error, response) {
            if (error || !response.data.users || response.data.users.length === 0) {
                template.states.loadingInfiniteScroll = false;
                template.states.pagingEndReached.set(true);
                return;
            }

            var unorderedResult = response.data.users;
            Meteor.call('users.order_partners', template.data.profileId, unorderedResult, function(error, result) {
                template.states.pagingEndReached.set(result.length < PAGING_INCREMENT);

                var tiles = result.map(function(user) {
                    Partup.client.embed.user(user, result['cfs.images.filerecord']);

                    return {
                        user: user
                    };
                });

                // Add tiles to the column layout
                template.columnTilesLayout.addTiles(tiles, function callback() {
                    template.states.loadingInfiniteScroll = false;
                });
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

Template.app_profile_partners.onRendered(function() {
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

Template.app_profile_partners.helpers({
    data: function() {
        var template = Template.instance();
        var self = this;
        return {
            columnTilesLayout: function() {
                return template.columnTilesLayout;
            },
            count: function() {
                return template.partnerCount.get();
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
                return states.partnerCountLoading.get();
            },
            selectedFilter: function() {
                return template.filter.get();
            }
        };
    }
});
