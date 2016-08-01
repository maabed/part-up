/**
 * Constructor for the column tiles layout
 *
 * @class ColumnTilesLayout
 * @memberof Partup.client
 */
Partup.client.constructors.ColumnTilesLayout = function(options) {
    options = options || {};

    if (!mout.lang.isFunction(options.calculateApproximateTileHeight)) {
        throw new Error('ColumnTilesLayout: options.calculateApproximateTileHeight() not found');
    }

    var C = this;
    var _options = {
        calculateApproximateTileHeight: options.calculateApproximateTileHeight,
        columns: options.columns || 0
    };
    var _tiles = [];
    var _columnElements = [];

    var _measureColumnHeights = function() {
        _columnElements = C._template.$('[data-column]');
        if (!_columnElements || !_columnElements.length) {
            throw new Error('ColumnTilesLayout: could not find any columns');
        }

        var heights = [];

        _columnElements.each(function(index) {
            heights[index] = $(this).outerHeight();
        });

        return heights;
    };

    var initialColumns = [];
    _.times(_options.columns, function() {
        initialColumns.push([]);
    });

    C.columns = new ReactiveVar(initialColumns);

    C.clear = function(cb) {
        if (!_columnElements || !_columnElements.length) return;
        _tiles = [];

        // Create array of arrays
        C.columns.set(mout.array.range(0, _options.columns - 1).map(function() {
            return [];
        }));

        // Wait for new columns to render
        Meteor.defer(function() {
            if (!C._template) return;
            if (C._template.view.isDestroyed) return;
            _columnElements = C._template.$('[data-column]');
            if (mout.lang.isFunction(cb)) {
                cb.call(C);
            }
        });
    };

    C.addTiles = function(tiles, cb) {
        Meteor.defer(function() {
            if (!C._template) return;

            _tiles = _tiles.concat(tiles);
            var columns = C.columns.get();

            var columnHeights = _measureColumnHeights();

            tiles.forEach(function(tile) {
                var shortestColumn = columnHeights.indexOf(mout.array.min(columnHeights));
                var tileHeight = _options.calculateApproximateTileHeight(tile, _columnElements.eq(0).width());

                columnHeights[shortestColumn] += tileHeight;
                columns[shortestColumn].push(tile);
            });
            C.columns.set(columns);

            if (mout.lang.isFunction(cb)) {
                cb.call(C);
            }
        });
    };

    C.setColumns = function(amount, cb) {
        var tilesBackup = _tiles;
        _options.columns = amount;

        C.clear(function callback() {
            C.addTiles(tilesBackup);

            if (mout.lang.isFunction(cb)) {
                cb.call(C);
            }
        });
    };
};
