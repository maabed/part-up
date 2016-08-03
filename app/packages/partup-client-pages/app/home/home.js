var getAmountOfColumns = function(screenwidth) {
    if (screenwidth > Partup.client.grid.getWidth(11) + 80) {
        return 4;
    }

    if (screenwidth > Partup.client.grid.getWidth(6) + 80) {
        return 2;
    }

    return 1;
};

Template.app_home.onCreated(function() {
    var template = this;

    template.states = {
        popular_partups_loading: new ReactiveVar(false)
    };

    template.video = new ReactiveVar(false);

    // Featured partup
    template.featured_partup = new ReactiveVar();

    // Featured networks
    template.featured_networks = new ReactiveVar([]);

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

Template.app_home.onRendered(function() {
    var template = this;

    // When the screen size alters
    template.autorun(function() {
        var screenWidth = Partup.client.screen.size.get('width');
        var columns = getAmountOfColumns(screenWidth);

        if (columns !== template.columnTilesLayout.columns.curValue.length) {
            template.columnTilesLayout.setColumns(columns);
        }
    });

    // Popular partups
    template.autorun(function() {
        var currentLanguage = Partup.client.language.current.get();
        if (currentLanguage == undefined) return;

        // Call first four discover part-ups and add them to the UI
        template.states.popular_partups_loading.set(true);
        HTTP.get('/partups/home/' + currentLanguage, {}, function(error, response) {
            if (error || !response.data.partups || response.data.partups.length === 0) {
                template.states.popular_partups_loading.set(false);
                return;
            }

            var result = response.data;
            var tiles = result.partups.map(function(partup) {
                Partup.client.embed.partup(partup, result['cfs.images.filerecord'], result.networks, result.users);

                return {
                    partup: partup,
                    HIDE_TAGS: true
                };
            });

            // Add tiles to the column layout
            template.columnTilesLayout.addTiles(tiles, function() {
                template.states.popular_partups_loading.set(false);
            });
        });

        // Call one featured part-up
        HTTP.get('/partups/featured_one_random/' + currentLanguage, {}, function(error, response) {
            if (error || !response.data.partups || response.data.partups.length === 0) return;

            var result = response.data;
            var partup = result.partups.pop();
            Partup.client.embed.partup(partup, result['cfs.images.filerecord'], result.networks, result.users);
            template.featured_partup.set(partup);
        });

        // Call featured networks
        HTTP.get('/networks/featured/' + currentLanguage, {}, function(error, response) {
            if (error || !response.data.networks || response.data.networks.length === 0) return;

            var result = response.data;

            var networks = lodash.chain(result.networks)
                .each(function(network) {
                    Partup.client.embed.network(network, result['cfs.images.filerecord'], result.users);
                })
                .shuffle()
                .slice(0, 5)
                .value();

            template.featured_networks.set(networks);
        });
    });
});

Template.app_home.helpers({
    columnTilesLayout: function() {
        return Template.instance().columnTilesLayout;
    },
    featured_partup: function() {
        return Template.instance().featured_partup.get();
    },
    featured_networks: function() {
        return Template.instance().featured_networks.get();
    },
    videoWatched: function() {
        return Session.get('home.videowatched');
    },
    greeting: function() {
        var daypart;
        var hour = moment().hours();

        if (hour < 6) daypart = 'night';
        else if (hour < 12) daypart = 'morning';
        else if (hour < 18) daypart = 'afternoon';
        else if (hour < 24) daypart = 'evening';
        else daypart = 'fallback';

        return TAPi18n.__('pages-app-home-loggedin-greeting-' + daypart);
    },
    firstName: function() {
        return User(Meteor.user()).getFirstname();
    },
    playVideo: function() {
        return Template.instance().video.get();
    },
    popularPartupsLoading: function() {
        return Template.instance().states.popular_partups_loading.get();
    }
});

Template.app_home.events({
    'click [data-start-video]': function(event, template) {
        event.preventDefault();
        template.video.set(true);
        Meteor.setTimeout(function() {
            Session.set('home.videowatched', true);
        }, 500);

        Partup.client.scroll.to(event.currentTarget, -30, {
            duration: 800
        });
    }
});
