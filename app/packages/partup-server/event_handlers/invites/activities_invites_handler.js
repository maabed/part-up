/**
 * Generate a notification and email when an invite gets sent
 */
Event.on('invites.inserted.activity', function(inviter, partup, activity, invitee, searchQuery) {
    if (!User(invitee).isActive()) return; // Ignore deactivated accounts

    // Check if there is already an invite update
    var inviteUpdate = Updates.findOne({partup_id: partup._id, upper_id: inviter._id, type: 'partups_invited'}, {sort: {updated_at: -1}});

    if (inviteUpdate && inviteUpdate.isLatestUpdateOfItsPartup()) {
        // Update the update with new invitee name
        var inviteeNames = inviteUpdate.type_data.invitee_names;
        inviteeNames.unshift(User(invitee).getFirstname());
        Updates.update(inviteUpdate._id, {$set: {
            'type_data.invitee_names': inviteeNames,
            updated_at: new Date()
        }});
    } else {
        // Create a new update
        var updateType = 'partups_invited';
        var updateTypeData = {
            invitee_names: [User(invitee).getFirstname()]
        };
        var update = Partup.factories.updatesFactory.make(inviter._id, partup._id, updateType, updateTypeData);
        Updates.insert(update);
    }

    // Set the notification details
    var notificationOptions = {
        userId: invitee._id,
        type: 'partup_activities_invited',
        typeData: {
            inviter: {
                _id: inviter._id,
                name: inviter.profile.name,
                image: inviter.profile.image
            },
            activity: {
                _id: activity._id,
                name: activity.name
            },
            partup: {
                _id: partup._id,
                name: partup.name,
                slug: partup.slug
            },
            update: {
                _id: activity.update_id
            }
        }
    };

    // Send notification
    Partup.server.services.notifications.send(notificationOptions);

    // Set the email details
    var emailOptions = {
        type: 'invite_upper_to_partup_activity',
        toAddress: User(invitee).getEmail(),
        subject: TAPi18n.__('emails-invite_upper_to_partup_activity-subject', {activity: activity.name, partup: partup.name}, User(invitee).getLocale()),
        locale: User(invitee).getLocale(),
        typeData: {
            name: User(invitee).getFirstname(),
            partupName: partup.name,
            partupDescription: partup.description,
            activityName: activity.name,
            activityDescription: activity.description,
            inviterName: inviter.profile.name,
            searchQuery: searchQuery,
            url: Meteor.absoluteUrl() + 'partups/' + partup.slug,
            unsubscribeOneUrl: Meteor.absoluteUrl() + 'unsubscribe-email-one/invite_upper_to_partup_activity/' + invitee.profile.settings.unsubscribe_email_token,
            unsubscribeAllUrl: Meteor.absoluteUrl() + 'unsubscribe-email-all/' + invitee.profile.settings.unsubscribe_email_token
        },
        userEmailPreferences: invitee.profile.settings.email
    };

    // Send the email
    Partup.server.services.emails.send(emailOptions);

    // Update stats
    partup.increaseEmailShareCount();
});

/**
 * Generate an email when an invite gets sent
 */
Event.on('invites.inserted.activity.by_email', function(inviter, partup, activity, email, name, message, accessToken) {

    // Split by double newline
    var toParagraphs = function(message) {
        return message.split('\n\n');
    };

    // Interpolate email message (replace [name] with invitee name and [url] with activity url)
    var interpolate = function(message) {
        var url = Meteor.absoluteUrl() + 'partups/' + partup.slug + '?token=' + accessToken;

        return Partup.helpers.interpolateEmailMessage(message, {
            url: '<a href="' + url + '">' + url + '</a>',
            name: name
        });
    };

    // Set the email details
    var emailOptions = {
        type: 'invite_email_address_to_partup_activity',
        toAddress: email,
        subject: TAPi18n.__('emails-invite_upper_to_partup_activity-subject', {activity: activity.name, partup: partup.name}, User(inviter).getLocale()),
        locale: User(inviter).getLocale(),
        typeData: {
            paragraphs: toParagraphs(interpolate(message)),
            partupName: partup.name,
            partupDescription: partup.description,
            activityName: activity.name,
            activityDescription: activity.description,
            inviterName: inviter.profile.name
        }
    };

    // Send the email
    Partup.server.services.emails.send(emailOptions);

    // Create a new update
    var updateType = 'partups_invited';
    var updateTypeData = {
        invitee_names: [name]
    };
    var update = Partup.factories.updatesFactory.make(inviter._id, partup._id, updateType, updateTypeData);
    Updates.insert(update);

    // Save the access token to the partup to allow access
    Partups.update(partup._id, {$addToSet: {access_tokens: accessToken}});
});
