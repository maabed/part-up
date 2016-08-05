Meteor.methods({
    /**
     * Update a user
     *
     * @param {mixed[]} fields
     */
    'users.update': function(fields) {
        check(fields, Partup.schemas.forms.profileSettings);

        var upper = Meteor.user();

        if (!upper) {
            throw new Meteor.Error(401, 'unauthorized');
        }

        try {
            var userFields = Partup.transformers.profile.fromFormProfileSettings(fields);
            userFields.profile.normalized_name = Partup.helpers.normalize(userFields.profile.name);

            // Merge the old profile so empty fields do not get overwritten
            var mergedProfile = _.extend(upper.profile, userFields.profile);

            Meteor.users.update(upper._id, {$set:{profile: mergedProfile}});
            Event.emit('users.updated', upper._id, userFields);

            return {
                _id: upper._id
            };
        } catch (error) {
            Log.error(error);
            throw new Meteor.Error(400, 'user_could_not_be_updated');
        }
    },

    /**
     * Return a list of users in a specific partup based on search query
     *
     * @param {string} searchString
     * @param {string} group
     * @param {string} partupId
     * @param {object} options
     */
    'users.autocomplete': function(searchString, group, partupId, options) {
        options = options || {};

        check(searchString, String);
        if (group) check(group, String);
        if (partupId) check(partupId, String);
        if (options.chatSearch) check(options.chatSearch, Boolean);

        var user = Meteor.user();
        if (!user) throw new Meteor.Error(401, 'unauthorized');

        try {
            // Remove accents that might have been added to the query
            searchString = mout.string.replaceAccents(searchString.toLowerCase());
            var selector = {'profile.normalized_name': new RegExp('.*' + searchString + '.*', 'i')};
            if (options.chatSearch) selector._id = {$ne: user._id};
            var suggestions = Meteor.users.findActiveUsers(selector, {limit: 30}).fetch();
            switch (group) {
                case 'partners':
                    var partners = Meteor.users.findActiveUsers({upperOf: {$in: [partupId]}}).fetch();
                    suggestions.unshift({
                        type: 'partners',
                        name: 'Partners',
                        users: partners
                    });

                    break;
                case 'supporters':
                    var supporters = Meteor.users.findActiveUsers({supporterOf: {$in: [partupId]}}).fetch();
                    suggestions.unshift({
                        type: 'supporters',
                        name: 'Supporters',
                        users: supporters
                    });
                    break;
            }

            return suggestions.map(function(user) {
                if (options.chatSearch) {
                    user.embeddedImage = Images.findForUser(user).fetch().pop();
                }

                return user;
            });
        } catch (error) {
            Log.error(error);
            throw new Meteor.Error(400, 'users_could_not_be_autocompleted');
        }
    },

    /**
     * Return a list of users based on search query
     *
     * @param {string} searchString
     */
    'users.upper_autocomplete': function(searchString) {
        check(searchString, String);

        var user = Meteor.user();
        if (!user) throw new Meteor.Error(401, 'unauthorized');

        try {
            // Remove accents that might have been added to the query
            searchString = mout.string.replaceAccents(searchString.toLowerCase());
            return Meteor.users.findActiveUsers({'profile.normalized_name': new RegExp('.*' + searchString + '.*', 'i')}, {limit: 30}).fetch();
        } catch (error) {
            Log.error(error);
            throw new Meteor.Error(400, 'users_could_not_be_autocompleted');
        }
    },

    /**
     * Deactivate user
     *
     * @param  {string} userId
     */
    'users.deactivate': function(userId) {
        check(userId, String);

        var user = Meteor.user();
        if (!User(user).isAdmin()) {
            return;
        }

        var subject = Meteor.users.findOne(userId);
        if (!subject) throw new Meteor.Error(401, 'unauthorized');
        if (!User(subject).isActive()) throw new Meteor.Error(400, 'user_is_inactive');

        try {
            Meteor.users.update(subject._id, {$set:{
                deactivatedAt: new Date()
            }});

            Event.emit('users.deactivated', subject._id);

            return {
                _id: subject._id
            };
        } catch (error) {
            Log.error(error);
            throw new Meteor.Error(500, 'user_could_not_be_deactivated');
        }
    },

    /**
     * Reactivate user
     *
     * @param  {string} userId
     */
    'users.reactivate': function(userId) {
        check(userId, String);

        var user = Meteor.user();
        if (!User(user).isAdmin()) {
            return;
        }

        var subject = Meteor.users.findOne(userId);
        if (!subject) throw new Meteor.Error(401, 'unauthorized');
        if (User(subject).isActive()) throw new Meteor.Error(400, 'user_is_active');

        try {
            Meteor.users.update(subject._id, {$unset:{
                deactivatedAt: ''
            }});

            Event.emit('users.reactivated', subject._id);

            return {
                _id: subject._id
            };
        } catch (error) {
            Log.error(error);
            throw new Meteor.Error(500, 'user_could_not_be_reactivated');
        }
    },

    /**
    * Returns user data to superadmins only
    */
    'users.admin_all': function(selector, options) {
        var user = Meteor.users.findOne(this.userId);
        if (!User(user).isAdmin()) {
            return;
        }
        var selector = selector || {};
        var option = options || {};
        return Meteor.users.findForAdminList(selector, options).fetch();
    },

    /**
    * Returns user stats to superadmins only
    */
    'users.admin_stats': function() {
        var user = Meteor.users.findOne(this.userId);
        if (!User(user).isAdmin()) {
            return;
        }
        return Meteor.users.findStatsForAdmin();
    },

    /**
    * Returns user stats to superadmins only
    */
    'users.admin_impersonate': function(userId) {
        check(userId, String);
        var currentUser = Meteor.users.findOne(this.userId);
        if (!User(currentUser).isAdmin()) {
            return;
        }

        var impersonateUser = Meteor.users.findOne(userId);
        if (!impersonateUser) throw new Meteor.Error(404, 'user_could_not_be_found');
        this.setUserId(userId);
    },

    /**
     * Returns the user's locale based on IP lookup
     */
    'users.get_locale': function() {
        this.unblock();

        var ipAddress = this.connection.clientAddress;
        return Partup.server.services.locale.get_locale(ipAddress);
    },

    /**
     * Returns the users membership of the provided network
     */
    'users.member_of_network': function(userId, networkSlug) {
        var network = Networks.findOne({slug: networkSlug});
        var response = network ? {
            has_member: network.hasMember(userId)
        } : false;
        return response;
    },

    /**
     * Register a device for push notifications
     */
    'users.register_pushnotifications_device': function(registrationId, device, loginToken, appVersion) {
        check(this.userId, String);
        check(registrationId, String);
        check(device.uuid, String);
        check(device.manufacturer, String);
        check(device.model, String);
        check(device.version, String);
        check(device.platform, String);
        check(loginToken, Match.Optional(String));
        check(appVersion, Match.Optional(String));

        if (loginToken) {
            var hashedLoginToken = Accounts._hashLoginToken(loginToken);
            var loginTokenValid = !!Meteor.users.findOne({
                '_id': this.userId,
                'services.resume.loginTokens.hashedToken': hashedLoginToken
            });
            if (!loginTokenValid) {
                throw 'loginToken is expired';
            }
        }

        // Remove old push notification device by uuid
        Meteor.users.update({
            _id: this.userId
        }, {
            $pull: {
                'push_notification_devices': {
                    uuid: device.uuid
                }
            }
        });

        // Insert new push notification device
        Meteor.users.update(this.userId, {
            $addToSet: {
                'push_notification_devices': {
                    registration_id: registrationId,
                    uuid: device.uuid,
                    manufacturer: device.manufacturer,
                    model: device.model,
                    platform: device.platform,
                    version: device.version,
                    loginToken: loginToken && hashedLoginToken || null,
                    createdAt: new Date(),
                    appVersion: appVersion || 'unknown'
                }
            }
        });
    },

    /**
     * Start a chat with the provided users
     */
    'users.start_chat': function(userIds) {
        check(userIds, [String]);

        var user = Meteor.user();
        if (!user) throw new Meteor.Error(401, 'unauthorized');
        userIds.unshift(user._id);

        try {
            var chatId = Meteor.call('chats.insert', fields);
            Chats.update(chatId, {$set: {creator_id: user._id}});
            Meteor.users.update({_id: {$in: userIds}}, {$addToSet: {chats: chatId}});

            return chatId;
        } catch (error) {
            Log.error(error);
            throw new Meteor.Error(400, 'network_chat_could_not_be_inserted');
        }
    },

    /**
     * Order set of parners by occurrence
     * @param userId
     * @param partners
     */
    'users.order_partners': function(userId, partners) {
        check(userId, String);
        check(partners, [Object]);

        var upper = Meteor.users.findOne(userId);
        var upperPartups = upper.upperOf || [];

        partners.forEach(function(partner) {
           partner.partner_count = lodash.intersection(upperPartups, partner.upperOf).length;
        });

        return lodash.sortByOrder(partners, ['partner_count', 'participation_score'], ['desc', 'desc']);
    }
});
