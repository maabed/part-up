/**
 * @memberof Partups
 * @private
 */
var PUBLIC = 1;
/**
 * @memberof Partups
 * @private
 */
var PRIVATE = 2;
/**
 * @memberof Partups
 * @private
 */
var NETWORK_PUBLIC = 3;
/**
 * @memberof Partups
 * @private
 */
var NETWORK_INVITE = 4;
/**
 * @memberof Partups
 * @private
 */
var NETWORK_CLOSED = 5;
/**
 * @memberof Partups
 * @private
 */
var NETWORK_ADMINS = 6;
/**
 * @memberof Partups
 * @private
 */
var TYPE = {
    CHARITY: 'charity',
    ENTERPRISING: 'enterprising',
    COMMERCIAL: 'commercial',
    ORGANIZATION: 'organization'
};
/**
 * @memberof Partups
 * @private
 */
var PHASE = {
    BRAINSTORM: 'brainstorm',
    PLAN: 'plan',
    EXECUTE: 'execute',
    GROW: 'grow'
};

/**
 * @ignore
 */
var Partup = function(document) {
    _.extend(this, document);
};

/**
 * Check if a given user can edit this partup
 *
 * @memberof Partups
 * @param {User} user the user object
 * @return {Boolean}
 */
Partup.prototype.isEditableBy = function(user) {
    var uppers = this.uppers || [];

    return user && (uppers.indexOf(user._id) > -1 || User(user).isAdmin());
};

/**
 * Check if a given user is the creator of this partup
 *
 * @memberof Partups
 * @param {User} user the user object
 * @return {Boolean}
 */
Partup.prototype.isCreatedBy = function(user) {
    return user && this.creator_id === user._id;
};

/**
 * Check if a given user can remove this partup
 *
 * @memberof Partups
 * @param {User} user the user object
 * @return {Boolean}
 */
Partup.prototype.isRemovableBy = function(user) {
    return user && (this.creator_id === user._id || User(user).isAdmin());
};

/**
 * Check whether or not a partup is removed
 *
 * @memberOf Partups
 * @return {Boolean}
 */
Partup.prototype.isRemoved = function() {
    return !!this.deleted_at;
};

/**
 * Check if given user is a supporter of this partup
 *
 * @memberof Partups
 * @param {String} userId the id of the user that should be checked
 * @return {Boolean}
 */
Partup.prototype.hasSupporter = function(userId) {
    if (!this.supporters) return false;
    return mout.lang.isString(userId) && this.supporters.indexOf(userId) > -1;
};

/**
 * Check if given user is an upper in this partup
 *
 * @memberof Partups
 * @param {String} userId the id of the user that should be checked
 * @return {Boolean}
 */
Partup.prototype.hasUpper = function(userId) {
    if (!this.uppers) return false;
    return mout.lang.isString(userId) && this.uppers.indexOf(userId) > -1;
};

/**
 * Check if given user is on the invite list of this partup
 *
 * @memberof Partups
 * @param {String} userId the id of the user to check against
 * @return {Boolean}
 */
Partup.prototype.hasInvitedUpper = function(userId) {
    if (!this.invites) return false;
    return mout.lang.isString(userId) && this.invites.indexOf(userId) > -1;
};

/**
 * Check if given user has the right to view the partup
 *
 * @memberof Partups
 * @param {String} userId
 * @param {String} accessToken
 * @return {Boolean}
 */
Partup.prototype.isViewableByUser = function(userId, accessToken) {
    if (this.privacy_type === PUBLIC) return true;
    if (this.privacy_type === NETWORK_PUBLIC) return true;
    var user = Meteor.users.findOne(userId);
    if (this.privacy_type === NETWORK_ADMINS && User(user).isAdminOfNetwork(this.network_id)) return true;
    if (this.privacy_type === PRIVATE || this.privacy_type === NETWORK_INVITE || this.privacy_type === NETWORK_CLOSED) {
        var accessTokens = this.access_tokens || [];
        if (accessTokens.indexOf(accessToken) > -1) return true;

        if (!user) return false;
        var networks = user.networks || [];
        if (networks.indexOf(this.network_id) > -1) return true;

        if (this.hasSupporter(userId)) return true;
        if (this.hasUpper(userId)) return true;
        if (this.hasInvitedUpper(userId)) return true;
    }

    return false;
};

/**
 * Check if a partup has ended
 *
 * @return {Boolean}
 */
Partup.prototype.hasEnded = function() {
    var now = new Date;
    var endDate = this.endDate;

    return now < endDate;
};

/**
 * Make the upper a supporter
 *
 * @memberof Partups
 * @param {String} upperId the user that becomes a supporter
 */
Partup.prototype.makeSupporter = function(upperId) {
    if (!this.hasUpper(upperId)) {
        Partups.update(this._id, {$addToSet: {'supporters': upperId}});
        Meteor.users.update(upperId, {$addToSet: {'supporterOf': this._id}});

        this.createUpperDataObject(upperId);
    }
};

/**
 * Promote a user from supporter to partner
 *
 * @memberof Partups
 * @param {String} upperId the user that gets promoted
 */
Partup.prototype.makeSupporterPartner = function(upperId) {
    Partups.update(this._id, {$pull: {'supporters': upperId, 'invites': upperId}, $addToSet: {'uppers': upperId}});
    Meteor.users.update(upperId, {$pull: {'supporterOf': this._id}, $addToSet: {'upperOf': this._id}});
};

/**
 * Demote a user from partner to supporter
 *
 * @memberof Partups
 * @param {String} upperId the user that gets demoted
 */
Partup.prototype.makePartnerSupporter = function(upperId) {
    Partups.update(this._id, {$pull: {'uppers': upperId}, $addToSet: {'supporters': upperId}});
    Meteor.users.update(upperId, {$pull: {'upperOf': this._id}, $addToSet: {'supporterOf': this._id}});
};

/**
 * Consume an access token to add the user as an invitee
 *
 * @memberOf Partups
 * @param {String} upperId
 * @param {String} accessToken
 */
Partup.prototype.convertAccessTokenToInvite = function(upperId, accessToken) {
    Partups.update(this._id, {$pull: {'access_tokens': accessToken}, $addToSet: {'invites': upperId}});
};

/**
 * Soft delete a partup
 *
 * @memberOf Partups
 */
Partup.prototype.remove = function() {
    var supporters = this.supporters || [];
    var uppers = this.uppers || [];

    Meteor.users.update({_id: {$in: supporters}}, {$pull: {'supporterOf': this._id}}, {multi: true});
    Meteor.users.update({_id: {$in: uppers}}, {$pull: {'upperOf': this._id}}, {multi: true});

    Partups.update(this._id, {$set:{deleted_at: new Date}});
};

/**
 * Check whether or not a partup is removed
 *
 * @memberOf Partups
 * @return {Boolean}
 */
Partup.prototype.isRemoved = function() {
    return !!this.deleted_at;
};

/**
 * Check whether or not a partup is featured
 *
 * @memberOf Partups
 * @return {Boolean}
 */
Partup.prototype.isFeatured = function() {
    return !!this.featured.active;
};

/**
 * Get all partners and supporters
 *
 * @memberOf Partups
 */
Partup.prototype.getUsers = function() {
    var uppers = this.uppers || [];
    var supporters = this.supporters || [];

    return uppers.concat(supporters);
};

/**
 * Create the upper_data object for the given upperId
 *
 * @memberOf Partups
 */
Partup.prototype.createUpperDataObject = function(upperId) {
    Partups.update({
        _id: this._id,
        'upper_data._id': {
            $ne: upperId
        }
    }, {
        $push: {
            upper_data: {
                _id: upperId,
                new_updates: []
            }
        }
    });
};

/**
 * Remove the upper_data object for the given upperId
 *
 * @memberOf Partups
 */
Partup.prototype.removeUpperDataObject = function(upperId) {
    Partups.update({
        _id: this._id,
        'upper_data._id': upperId
    }, {
        $pull: {upper_data: {_id: upperId}}
    });
};

/**
 * Update new updates for a single user
 *
 * @memberOf Partups
 */
Partup.prototype.addNewUpdateToUpperData = function(update, currentUserId) {
    // Update existing upper data first
    var upper_data = this.upper_data || [];
    upper_data.forEach(function(upperData) {
        if (upperData._id === update.upper_id) return;
        if (upperData._id === currentUserId) return;
        upperData.new_updates.push(update._id);
    });

    // Create object for new uppers that dont have upper_data
    var currentUpperDataIds = _.map(upper_data, function(upperData) {
        return upperData._id;
    });
    var newUpperIds = _.difference(this.getUsers(), currentUpperDataIds);
    newUpperIds.forEach(function(upperId) {
        if (upperId === update.upper_id) return;
        if (upperId === currentUserId) return;
        upper_data.push({
            _id: upperId,
            new_updates: [update._id]
        });
    });

    Partups.update({_id: this._id}, {$set: {upper_data: upper_data}});
};

/**
 * Increase email share count
 *
 * @memberOf Partups
 */
Partup.prototype.increaseEmailShareCount = function() {
    Partups.update({_id: this._id}, {$inc: {'shared_count.email': 1}});
};

/**
 * Check if partup is archived
 *
 * @memberOf Partups
 * @return {Boolean}
 */
Partup.prototype.isArchived = function() {
    return !!this.archived;
};

/**
 * Partups describe collaborations between several uppers
 * @namespace Partups
 */
Partups = new Mongo.Collection('partups', {
    transform: function(document) {
        return new Partup(document);
    }
});

// Add indices
if (Meteor.isServer) {
    Partups._ensureIndex({'name': 'text', 'description': 'text'}, {language_override: 'idioma'});
    Partups._ensureIndex('creator_id');
    Partups._ensureIndex('privacy_type');
    Partups._ensureIndex('slug');
    Partups._ensureIndex('progress');
    Partups._ensureIndex('tags');
    Partups._ensureIndex('deleted_at');
}

/**
 * @memberof Partups
 * @public
 */
Partups.PUBLIC = PUBLIC;
/**
 * @memberof Partups
 * @public
 */
Partups.PRIVATE = PRIVATE;
/**
 * @memberof Partups
 * @public
 */
Partups.NETWORK_PUBLIC = NETWORK_PUBLIC;
/**
 * @memberof Partups
 * @public
 */
Partups.NETWORK_INVITE = NETWORK_INVITE;
/**
 * @memberof Partups
 * @public
 */
Partups.NETWORK_CLOSED = NETWORK_CLOSED;
/**
 * @memberof Partups
 * @public
 */
Partups.TYPE = TYPE;
/**
 * @memberof Partups
 * @public
 */
Partups.PHASE = PHASE;

/**
 * ============== PARTUPS COLLECTION HELPERS ==============
 */

/**
 * Modified version of Collection.find that makes sure the
 * user (or guest) can only retrieve authorized entities
 *
 * @memberof Partups
 * @param {String} userId
 * @param {Object} selector
 * @param {Object} options
 * @param {String} accessToken
 * @return {Cursor}
 */
Partups.guardedFind = function(userId, selector, options, accessToken) {
    // We do not want to return partups that have been soft deleted
    selector.deleted_at = selector.deleted_at || {$exists: false};

    if (Meteor.isClient) return this.find(selector, options);

    var selector = selector || {};
    var options = options || {};

    var guardedCriterias = [
        // Either the partup is public or belongs to a public network
        {'privacy_type': {'$in': [Partups.PUBLIC, Partups.NETWORK_PUBLIC]}}
    ];

    // If an access token is provided, we allow access if it matches one of the partups access tokens
    if (accessToken) {
        guardedCriterias.push({'access_tokens': {'$in': [accessToken]}});
    }

    // Some extra rules that are only applicable to users that are logged in
    if (userId) {
        var user = Meteor.users.findOneOrFail(userId);
        var networks = user.networks || [];

        // The user is part of the partup uppers, which means he has access anyway
        guardedCriterias.push({'uppers': {'$in': [userId]}});

        // The user is part of the partup supporters, which means he has access anyway
        guardedCriterias.push({'supporters': {'$in': [userId]}});

        // Of course the creator of a partup always has the needed rights
        guardedCriterias.push({'creator_id': userId});

        // Everyone who is part of the network the partup is part of can view it
        guardedCriterias.push({'network_id': {'$in': networks}});

        // Check if upper is invited, so has the rights to view a partup in a closed network
        guardedCriterias.push({'invites': {'$in': [userId]}});
    }

    var finalSelector = {};

    // MongoDB only allows 1 root $or, so we have to merge the $or from the given selector
    // with the $or values that we generate with the guarded criteria above here
    if (selector.$or) {
        finalSelector = selector;
        finalSelector.$and = [{'$or': guardedCriterias}, {'$or': selector.$or}];
        delete finalSelector.$or;
    } else {
        // Guarding selector that needs to be fulfilled
        var guardingSelector = {'$or': guardedCriterias};

        // Merge the selectors, so we still use the initial selector provided by the caller
        finalSelector = {'$and': [guardingSelector, selector]};
    }

    return this.find(finalSelector, options);
};

/**
 * Modified version of Collection.find that makes
 * sure the user (or guest) can only retrieve
 * fields that are publicly available
 *
 * @memberof Partups
 * @param {Object} selector
 * @param {Object} options
 * @return {Cursor}
 */
Partups.guardedMetaFind = function(selector, options) {
    var selector = selector || {};
    var options = options || {};

    // We do not want to return partups that have been soft deleted
    selector.deleted_at = selector.deleted_at || {$exists: false};

    // Make sure that if the callee doesn't pass the fields
    // key used in the options parameter, we set it with
    // the _id fields, so we do not publish all fields
    // by default, which would be a security issue
    options.fields = {_id: 1};

    // The fields that should be available on each partup
    var unguardedFields = ['privacy_type', 'archived_at'];

    unguardedFields.forEach(function(unguardedField) {
        options.fields[unguardedField] = 1;
    });

    return this.find(selector, options);
};

/**
 * Find the partups used in the discover page
 *
 * @memberof Partups
 * @param userId
 * @param {Object} options
 * @param parameters
 * @return {Cursor}
 */
Partups.findForDiscover = function(userId, options, parameters) {
    var selector = {};

    options = options || {};
    options.limit = options.limit ? parseInt(options.limit) : undefined;
    options.skip = options.skip ? parseInt(options.skip) : 0;
    options.sort = options.sort || {};

    parameters = parameters || {};
    var sort = parameters.sort || undefined;
    var textSearch = parameters.textSearch || undefined;
    var locationId = parameters.locationId || undefined;
    var networkId = parameters.networkId || undefined;
    var language = parameters.language || undefined;

    if (sort) {
        // Sort the partups from the newest to the oldest
        if (sort === 'new') {
            options.sort['created_at'] = -1;
        }

        // Sort the partups from the most popular to the least popular
        if (sort === 'popular') {
            options.sort['popularity'] = -1;
        }
    }

    // Filter the partups on language
    if (language) {
        selector['language'] = language;
    }

    // Filter archived partups
    selector['archived_at'] = {$exists: false};

    // Filter the partups that are in a given location
    if (locationId) {
        selector['location.place_id'] = locationId;
    }

    // Filter the partups that are in a given network
    if (networkId) {
        selector['network_id'] = networkId;
    }

    // Filter the partups that match the text search
    if (textSearch) {
        Log.debug('Searching for [' + textSearch + ']');

        var textSearchSelector = {$text: {$search: textSearch}};
        var tagSelector = {tags: {$in: [textSearch]}};

        options.fields = {score: {$meta: 'textScore'}};
        options.sort['score'] = {$meta: 'textScore'};

        selector.$or = [textSearchSelector, tagSelector];
    }

    return this.guardedFind(userId, selector, options);
};

/**
 * Find the partup for an update
 *
 * @memberOf Partups
 * @param {String} userId
 * @param {Update} update
 * @return {Mongo.Cursor|Void}
 */
Partups.findForUpdate = function(userId, update) {
    if (!update.partup_id) return;
    return this.guardedFind(userId, {_id: update.partup_id}, {limit:1});
};

/**
 * Find the partups in a network
 *
 * @memberof Partups
 * @param {Network} network
 * @param {Object} parameters
 * @param {Object} options
 * @param {String} loggedInUserId
 * @return {Cursor}
 */
Partups.findForNetwork = function(network, parameters, options, loggedInUserId) {
    parameters = parameters || {};
    options = options || {};
    options.sort = options.sort || {};
    var textSearch = parameters.textSearch || undefined;

    var selector = {
        network_id: network._id
    };

    options.sort['popularity'] = -1;

    if (parameters.hasOwnProperty('archived')) {
        selector.archived_at = {$exists: parameters.archived};
    }

    // Filter the partups that match the text search
    if (textSearch) {
        Log.debug('Searching for [' + textSearch + ']');

        var tagSelector = {tags: {$in: [textSearch]}};
        var slugSelector = {slug: new RegExp('.*' + textSearch.replace(/ /g,'-') + '.*', 'i')};
        var nameSelector = {name: new RegExp('.*' + textSearch + '.*', 'i')};
        var descriptionSelector = {description: new RegExp('.*' + textSearch + '.*', 'i')};

        selector.$or = [tagSelector, slugSelector, nameSelector, descriptionSelector];
    }

    return this.guardedFind(loggedInUserId, selector, options);
};

/**
 * Find the partups that a user is upper of
 *
 * @memberof Partups
 * @param {Object} user
 * @param {Object} parameters
 * @param {Number} parameters.limit
 * @param {String} parameters.sort
 * @param {Boolean} parameters.count
 * @param {String} loggedInUserId Server side only
 * @return {Cursor}
 */
Partups.findUpperPartupsForUser = function(user, parameters, loggedInUserId) {
    parameters = parameters || {};

    var upperOf = user.upperOf || [];

    var selector = {_id: {$in: upperOf}};
    var options = {};

    if (parameters.count) {
        options.count = true;
    } else {
        options.limit = parseInt(parameters.limit);
        options.skip = parseInt(parameters.skip);
        options.sort = parameters.sort || {popularity: -1};
    }

    if (parameters.network_id) {
        selector.network_id = parameters.network_id;
    }

    selector.archived_at = {$exists: parameters.archived};

    return this.guardedFind(loggedInUserId, selector, options);
};

/**
 * Find the partups that a user supporter of
 *
 * @memberof Partups
 * @param {Object} user
 * @param {Object} parameters
 * @param {Number} parameters.limit
 * @param {String} parameters.sort
 * @param {Boolean} parameters.count
 * @param {String} loggedInUserId Server side only
 * @return {Cursor}
 */
Partups.findSupporterPartupsForUser = function(user, parameters, loggedInUserId) {
    user = user || {};
    parameters = parameters || {};

    var supporterOf = user.supporterOf || [];

    var selector = {_id: {$in: supporterOf}};
    var options = {};

    if (parameters.count) {
        options.count = true;
    } else {
        options.skip = parseInt(parameters.skip);
        options.limit = parseInt(parameters.limit);
        options.sort = parameters.sort || {popularity: -1};
    }

    if (parameters.network_id) {
        selector.network_id = parameters.network_id;
    }

    selector.archived_at = {$exists: parameters.archived};

    return this.guardedFind(loggedInUserId, selector, options);
};

Partups.findStatsForAdmin = function() {
    var partups = this.find({});
    results = {
        'total': 0,
        'open': 0,
        'private': 0,
        'networkopen': 0,
        'networkinvite': 0,
        'networkclosed': 0
    };
    partups.forEach(function(partup) {
        switch (partup.privacy_type) {
            case 1:
                results.open++;
                break;
            case 2:
                results.private++;
                break;
            case 3:
                results.networkopen++;
                break;
            case 4:
                results.networkinvite++;
                break;
            case 5:
                results.networkclosed++;
                break;

        }
        results.total++;
    });
    return results;
};

Partups.findForAdminList = function(selector, options) {
    selector = selector || {};

    var limit = options.limit;
    var page = options.page;
    return this.find(selector, {
        fields: {'_id': 1, 'slug': 1, 'name': 1, 'description': 1, 'creator_id': 1, 'created_at': 1, 'network_id': 1, 'language': 1},
        sort: {'created_at': -1},
        limit: limit,
        skip: limit * page
    });
};
