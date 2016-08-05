/**
 * Window popup helpers
 *
 * @class window
 * @memberof Partup.client
 */

Partup.client.window = {

    /**
     * Get parameters for popup window
     *
     * @memberof Partup.client.window
     * @param {Object} options
     * @param {Number} options.width
     * @param {Number} options.height
     * @param {Boolean} options.scrollbars
     */
    getPopupWindowSettings: function(options) {
        var options = options || {};
        var width = options.width || 600;
        var height = options.height || 400;
        var scrollbars = options.scrollbars ? (options.scrollbars ? 'yes' : 'no') : 'no';
        var top = (window.innerHeight / 2) - (height / 2);
        var left = (window.innerWidth / 2) - (width / 2);

        return 'width=' + width + ', height=' + height + ', scrollbars=' + scrollbars + ', top=' + top + ', left=' + left;
    },

    clearUrlHash: function() {
        var scrollV;
        var scrollH;
        var loc = window.location;
        if ('pushState' in history)
            history.pushState('', document.title, loc.pathname + loc.search);
        else {
            // Prevent scrolling by storing the page's current scroll offset
            scrollV = document.body.scrollTop;
            scrollH = document.body.scrollLeft;

            loc.hash = '';

            // Restore the scroll offset, should be flicker free
            document.body.scrollTop = scrollV;
            document.body.scrollLeft = scrollH;
        }
    }
};
