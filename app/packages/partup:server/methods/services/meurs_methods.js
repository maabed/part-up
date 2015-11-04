Meteor.methods({
    /**
     * Retrieve an authentication token
     */
    'meurs.create_test': function() {
        this.unblock();

        var upper = Meteor.user();
        if (!upper) throw new Meteor.Error(401, 'unauthorized');

        // Declare vars
        var q4youId = (upper.profile.meurs && upper.profile.meurs._id) ? upper.profile.meurs._id : '';
        var portal = (upper.profile.meurs && upper.profile.meurs.portal) ?
            upper.profile.meurs.portal :
            (upper.profile.settings.locale ? upper.profile.settings.locale : 'en');

        if (!upper.profile.meurs || !upper.profile.meurs.portal) {
            Meteor.users.update(upper._id, {$set: {'profile.meurs.portal': portal}});
        }

        // Authenticate
        var token = Partup.server.services.meurs.getToken(portal);

        // Create user if needed
        if (!upper.profile.meurs || !upper.profile.meurs._id) {
            // Add user
            q4youId = Partup.server.services.meurs.addUser(token, upper._id, User(upper).getEmail());

            // Activate user
            var isUserActivated = Partup.server.services.meurs.activateUser(token, q4youId);
            if (!isUserActivated) return false;

            // Update user
            Meteor.users.update(upper._id, {$set: {'profile.meurs._id': q4youId}});
        }

        // Get Program Templates
        //var programTemplates = Partup.server.services.meurs.getProgramTemplates(token);

        // Create Program Session if needed
        if (!upper.profile.meurs || !upper.profile.meurs.program_session_id) {
            // Create session
            var programSessionId = Partup.server.services.meurs.createProgramSessionId(token, q4youId);

            // Activate Program Session
            var isProgramSessionActivated = Partup.server.services.meurs.setActiveProgramSession(token, q4youId, programSessionId);
            if (!isProgramSessionActivated) return false;

            // Update user
            Meteor.users.update(upper._id, {$set: {'profile.meurs.program_session_id': programSessionId}});
        }

        // Get Program Session Content
        //var programSessionContent = Partup.server.services.meurs.getProgramSessionContent(token, q4youId, programSessionId);

        // Create return URL
        var returnUrl = Meteor.absoluteUrl() + 'profile/' + upper._id + '/about?results_ready=true';

        // Generate browser token and return generated URL to FE
        return Partup.server.services.meurs.getBrowserToken(token, q4youId, returnUrl);
    },

    'meurs.get_results': function(upperId) {
        // Get Upper
        var upper = Meteor.users.findOne({_id: upperId});
        if (!upper) throw new Meteor.Error(404, 'user not found');

        // Authenticate
        var token = Partup.server.services.meurs.getToken();

        // Get results
        var results = Partup.server.services.meurs.getResults(token, upper.profile.meurs._id, upper.profile.meurs.programSessionId);

        if (results) {
            Meteor.users.update({_id: upper._id}, {$set: {'profile.meurs.results': results}});
        } else {
            // setInterval or something
        }
    }
});
