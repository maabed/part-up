/**
 * @memberOf Networks
 * @private
 */
var NETWORK_PUBLIC = 1;
/**
 * @memberOf Networks
 * @private
 */
var NETWORK_INVITE = 2;
/**
 * @memberOf Networks
 * @private
 */
var NETWORK_CLOSED = 3;

/**
 * Network model
 *
 * @memberOf Networks
 */
var Network = function(document) {
    _.extend(this, document);
};

/**
 * Check if given user is admin of this network
 *
 * @memberOf Networks
 * @param {String} userId the user id of the user to be checked
 * @return {Boolean}
 */
Network.prototype.isNetworkAdmin = function(userId) {
    if (!userId || !this.admins) return false;
    return mout.lang.isString(userId) && (this.admins.indexOf(userId) > -1);
};

/**
 * Check if given user is the super admin or admin of this network
 *
 * @memberOf Networks
 * @param {String} userId the user id of the user to be checked
 * @return {Boolean}
 */
Network.prototype.isAdmin = function(userId) {
    if (!userId) return false;
    var user = Meteor.users.findOne({_id: userId});
    if (!user) return false;
    return this.isNetworkAdmin(userId) || User(user).isAdmin();
};

/**
 * Check if given user is a member of this network
 *
 * @memberOf Networks
 * @param {String} userId the user id of the user to be checked
 * @return {Boolean}
 */
Network.prototype.hasMember = function(userId) {
    if (!userId) return false;
    var uppers = this.uppers || [];
    return mout.lang.isString(userId) && uppers.indexOf(userId) > -1;
};

/**
 * Check if given network has public access
 *
 * @memberOf Networks
 * @return {Boolean}
 */
Network.prototype.isPublic = function() {
    return this.privacy_type === NETWORK_PUBLIC;
};

/**
 * Check if given network is private and for invites only
 *
 * @memberOf Networks
 * @return {Boolean}
 */
Network.prototype.isInvitational = function() {
    return this.privacy_type === NETWORK_INVITE;
};

/**
 * Check if given network is private and closed
 *
 * @memberOf Networks
 * @return {Boolean}
 */
Network.prototype.isClosed = function() {
    return this.privacy_type === NETWORK_CLOSED;
};

/**
 * Check if given network is closed for specific user
 *
 * @memberOf Networks
 * @param {String} upperId the user id of the user to be checked
 * @return {Boolean}
 */
Network.prototype.isClosedForUpper = function(upperId) {
    if (this.isPublic()) return false;
    if (!upperId) return true;
    if (this.isAdmin(upperId)) return false;
    if (this.hasMember(upperId)) return false;

    return true;
};

/**
 * Check if upper is already invited to the network
 *
 * @memberOf Networks
 * @param {String} upperId the user id of the user to be checked
 * @return {Boolean}
 */
Network.prototype.isUpperInvited = function(upperId) {
    if (!upperId) return false;
    return !!Invites.findOne({
        network_id: this._id,
        invitee_id: upperId
    });
};

/**
 * Check if the upper-invite is pending (to be accepted by admin)
 *
 * @memberOf Networks
 * @param {String} userId the user id of the user to be checked
 * @return {Boolean}
 */
Network.prototype.isUpperInvitePending = function(userId) {
    if (!this.pending_uppers || !userId) return false;
    return mout.lang.isString(userId) && this.pending_uppers.indexOf(userId) > -1;
};

/**
 * Check if upper can invite other uppers
 *
 * @memberOf Networks
 * @param {String} upperId the user id of the user to be checked
 * @return {Boolean}
 */
Network.prototype.canUpperInvite = function(upperId) {
    if (!upperId) return false;
    return this.hasMember(upperId);
};

/**
 * Check if upper can join network
 *
 * @memberOf Networks
 * @param {String} upperId the user id of the user to be checked
 * @return {Boolean}
 */
Network.prototype.canUpperJoin = function(upperId) {
    if (!upperId) return false;
    if (this.isPublic()) return true;
    if (this.isUpperInvited(upperId)) return true;
    return false;
};

/**
 * Add Upper to Network
 *
 * @memberOf Networks
 * @param {String} upperId the user id of the user to be added
 */
Network.prototype.addUpper = function(upperId) {
    Networks.update(this._id, {$addToSet: {uppers: upperId}, $inc: {upper_count: 1}});
    Meteor.users.update(upperId, {$addToSet: {networks: this._id}});
    this.removeAllUpperInvites(upperId);
};

/**
 * Add upper to pending list
 *
 * @memberOf Networks
 * @param {String} upperId the user id of the user to be added
 */
Network.prototype.addPendingUpper = function(upperId) {
    // Check if user is already added as a pending upper
    if (this.isUpperPending(upperId)) {
        return false;
    }

    Networks.update(this._id, {$addToSet: {pending_uppers: upperId}});
    Meteor.users.update(upperId, {$addToSet: {pending_networks: this._id}});
};

/**
 * Check if upper is already added to the pending list
 *
 * @memberOf Networks
 * @param {String} upperId the user id of the user to be checked
 * @return {Boolean}
 */
Network.prototype.isUpperPending = function(upperId) {
    if (!upperId) return false;
    return !!Networks.findOne({_id: this._id, pending_uppers: {'$in': [upperId]}});
};

/**
 * Check if upper is invited by an admin
 *
 * @memberOf Networks
 * @param {String} upperId the user id of the user to be checked
 * @return {Boolean}
 */
Network.prototype.isUpperInvitedByAdmin = function(upperId) {
    if (!upperId) return false;
    var invitedByAdmin = false;
    var invites = Invites.find({type: Invites.INVITE_TYPE_NETWORK_EXISTING_UPPER, network_id: this._id, invitee_id: upperId});
    var self = this;

    // A user can be invited multiple times, so check all of them
    invites.forEach(function(invite) {
        // Set variable to true when matching the criteria
        if (self.isAdmin(invite.inviter_id)) invitedByAdmin = true;
    });

    return invitedByAdmin;
};

/**
 * Consume an access token to add the user as an invitee
 *
 * @memberOf Partups
 * @param {String} upperId
 * @param {String} accessToken
 */
Network.prototype.convertAccessTokenToInvite = function(upperId, accessToken) {
    // Find and update the current invite
    var invite = Invites.findOne({
        type: Invites.INVITE_TYPE_NETWORK_EMAIL,
        access_token: accessToken,
        network_id: this._id
    });

    if (!invite) return;

    Invites.update(invite._id, {$set: {
        type: Invites.INVITE_TYPE_NETWORK_EXISTING_UPPER,
        invitee_id: upperId,
        updated_at: new Date
    }});

    // Also remove the access token from the network and add the new invite to the network
    Networks.update(this._id, {
        $pull: {'access_tokens': accessToken},
        $addToSet: {'invites': {_id: upperId, invited_by_id: invite.inviter_id, invited_at: invite.created_at}}
    });
};

/**
 * Accept a pending upper to the network
 *
 * @memberOf Networks
 * @param {String} upperId the user id of the user that should be accepted
 */
Network.prototype.acceptPendingUpper = function(upperId) {
    Networks.update(this._id, {$pull: {pending_uppers: upperId}, $addToSet: {uppers: upperId}, $inc: {upper_count: 1}});
    Meteor.users.update(upperId, {$pull: {pending_networks: this._id}, $addToSet: {networks: this._id}});
    this.removeAllUpperInvites(upperId);
};

/**
 * Reject a pending upper
 *
 * @memberOf Networks
 * @param {String} upperId the user id of the user that should be rejected
 */
Network.prototype.rejectPendingUpper = function(upperId) {
    Networks.update(this._id, {$pull: {pending_uppers: upperId}});
    Invites.remove({
        'network_id': this._id,
        'invitee_id': upperId
    });
    Meteor.users.update(upperId, {$pull: {pending_networks: this._id}});
};

/**
 * Remove all invites for a specific user for this network
 *
 * @memberOf Invites
 * @param {String} upperId id of the user whose invites have to be removed
 */
Network.prototype.removeAllUpperInvites = function(upperId) {
    // Clear out the invites from Invites collection
    Invites.remove({network_id: this._id, invitee_id: upperId});

    // And don't forget the invites property of this network
    var invites = this.invites || [];
    var self = this;
    invites.forEach(function(invite) {
        if (invite._id === upperId) {
            Networks.update(self._id, {$pull: {invites: invite}});
        }
    });
};

/**
 * Leave network
 *
 * @memberOf Networks
 * @param {String} upperId the user id of the user that is leaving the network
 */
Network.prototype.leave = function(upperId) {
    Networks.update(this._id, {$pull: {uppers: upperId}, $inc: {upper_count: -1}});
    Meteor.users.update(upperId, {$pull: {networks: this._id}});
};

Network.prototype.displayTags = function(slug) {
    var maxTags = 5;
    var tags = [];
    var commonTags = this.common_tags || [];
    var customTags = this.tags || [];

    _.times(maxTags, function() {
        var tag = commonTags.shift();
        if (!tag) return;
        tags.push({
            tag: tag.tag,
            networkSlug: slug || ''
        });
    });

    if (tags.length === maxTags) return tags;

    _.times((maxTags - tags.length), function() {
        var tag = customTags.shift();
        if (!tag) return;
        tags.push({
            tag: tag,
            networkSlug: slug || ''
        });
    });

    return tags;
};

/**
 * Make a user an admin
 *
 * @memberOf Networks
 * @param {String} upperId the user id of the user that is being added as an admin
 */
Network.prototype.addAdmin = function(upperId) {
    Networks.update(this._id, {$push: {admins: upperId}});
};

/**
 * Remove user from admins
 *
 * @memberOf Networks
 * @param {String} upperId the user id of the user that is being removed from admins
 */
Network.prototype.removeAdmin = function(upperId) {
    Networks.update(this._id, {$pull: {admins: upperId}});
};

/**
 * Checks if a ContentBlock belongs to this network
 *
 * @memberOf Networks
 * @param {String} contentBlockId
 */
Network.prototype.hasContentBlock = function(contentBlockId) {
    var contentBlocks = this.contentblocks || [];
    return mout.lang.isString(contentBlockId) && contentBlocks.indexOf(contentBlockId) > -1;
};

/**
 Networks, also known as "Tribes" are entities that group users and partups
 @namespace Networks
 */
Networks = new Mongo.Collection('networks', {
    transform: function(document) {
        return new Network(document);
    }
});

// Add indices
if (Meteor.isServer) {
    Networks._ensureIndex('slug');
    Networks._ensureIndex('admins');
    Networks._ensureIndex('privacy_type');
}

/**
 * @memberOf Networks
 * @public
 */
Networks.NETWORK_PUBLIC = NETWORK_PUBLIC;
/**
 * @memberOf Networks
 * @public
 */
Networks.NETWORK_INVITE = NETWORK_INVITE;
/**
 * @memberOf Networks
 * @public
 */
Networks.NETWORK_CLOSED = NETWORK_CLOSED;

/**
 * Modified version of Collection.find that makes
 * sure the user (or guest) can only retrieve
 * fields that are publicly available
 *
 * @memberOf Networks
 * @param {Object} selector
 * @param {Object} options
 * @return {Cursor}
 */
Networks.guardedMetaFind = function(selector, options) {
    selector = selector || {};
    options = options || {};

    // Make sure that if the callee doesn't pass the fields
    // key used in the options parameter, we set it with
    // the _id fields, so we do not publish all fields
    // by default, which would be a security issue
    options.fields = {_id: 1};

    // The fields that should be available on each network
    var unguardedFields = ['_id', 'name', 'description', 'website', 'slug', 'icon', 'image', 'privacy_type', 'pending_uppers', 'invites', 'language', 'tags', 'location', 'stats', 'swarms', 'background_image', 'common_tags', 'most_active_partups', 'most_active_uppers', 'admins', 'archived_at'];

    unguardedFields.forEach(function(unguardedField) {
        options.fields[unguardedField] = 1;
    });

    return this.find(selector, options);
};

/**
 * Networks collection helpers
 *
 * @memberOf Networks
 * @param {String} userId the user id of the current user
 * @param {Object} selector the requested selector
 * @param {Object} options options object to be passed to mongo find (limit etc.)
 * @return {Mongo.Cursor}
 */
Networks.guardedFind = function(userId, selector, options) {
    if (Meteor.isClient) return this.find(selector, options);

    selector = selector || {};
    options = options || {};

    // The fields that should never be exposed
    var guardedFields = ['access_tokens'];
    options.fields = options.fields || {};

    guardedFields.forEach(function(guardedField) {
        options.fields[guardedField] = 0;
    });

    var guardedCriterias = [
        // The network is open, which means everyone can access it
        {'privacy_type': {'$in': [Networks.NETWORK_PUBLIC]}},
    ];

    // Some extra rules that are only applicable to users that are logged in
    if (userId) {
        // The user is part of the network uppers, which means he has access anyway
        guardedCriterias.push({'uppers': {'$in': [userId]}});

        // Of course the admin of a network always has the needed rights
        guardedCriterias.push({'admins': {'$in': [userId]}});
    }

    // Guarding selector that needs to be fulfilled
    var guardingSelector = {'$or': guardedCriterias};

    // Merge the selectors, so we still use the initial selector provided by the caller
    var finalSelector = {'$and': [guardingSelector, selector]};

    return this.find(finalSelector, options);
};

/**
 * Find featured networks
 *
 * @memberOf Networks
 * @param {String} language
 * @return {Mongo.Cursor}
 */
Networks.findFeatured = function(language) {
    var selector = {'featured.active': true};
    if (language) {
        selector.language = language;
    }
    return Networks.find(selector);
};

/**
 * Find the network for a partup
 *
 * @memberOf Networks
 * @param {Partup} partup
 * @param {String} userId
 * @return {Mongo.Cursor}
 */
Networks.findForPartup = function(partup, userId) {
    return Networks.guardedFind(userId, {_id: partup.network_id}, {limit: 1});
};

/**
 * Find the networks for a user
 *
 * @memberOf Networks
 * @param {User} user
 * @param {String} userId
 * @return {Mongo.Cursor}
 */
Networks.findForUser = function(user, userId, options) {
    var networks = user.networks || [];
    return Networks.guardedFind(userId, {_id: {'$in': networks}}, options);
};

/**
 * Find the networks for a user
 *
 * @memberOf Networks
 * @param {String} loggedInUserId
 * @param {Object} options - mongo query options
 * @return {Mongo.Cursor}
 */
Networks.findForDiscoverFilter = function(loggedInUserId, options) {
    options = options || {};

    options.sort = options.sort || {};
    //TODO: add sort rule for loggedInUserId existance in network.uppers
    options.sort.upper_count = -1;

    return Networks.guardedFind(loggedInUserId, {}, options);
};

/**
 * Find the networks in a swarm
 *
 * @memberOf Networks
 * @param {Swarm} swarm
 * @param {String} userId
 * @return {Mongo.Cursor}
 */
Networks.findForSwarm = function(swarm, userId) {
    var networks = swarm.networks || [];
    return Networks.guardedFind(userId, {_id: {$in: networks}}, {});
};
