var Subs = new SubsManager({
    cacheLimit: 1,
    expireIn: 10
});

Template.app_partup_activities.onCreated(function() {
    var tpl = this;

    tpl.partup = Partups.findOne(tpl.data.partupId);

    tpl.activities = {

        // States
        loading: new ReactiveVar(false),

        // Filter
        filter: new ReactiveVar('default'),

        // All activities
        all: function(options) {
            var options = options || {};

            var filter = tpl.activities.filter.get();

            var activities = Activities
                .findForPartup(tpl.partup, {}, {archived: !!options.archived})
                .fetch()
                .filter(function(activity, idx) {
                    if (filter === 'my-activities')
                        return activity.creator_id && activity.creator_id === Meteor.user()._id;

                    if (filter === 'open-activities')
                        return Contributions.findForActivity(activity).count() === 0;

                    return true;
                })
                .sort(Partup.client.sort.dateASC.bind(null, 'created_at'))
                .sort(Partup.client.sort.dateASC.bind(null, 'end_date'));

            return activities;
        }
    };

    // Partup findOne and activities subscription
    tpl.activities.loading.set(true);
    var sub = tpl.subscribe('activities.from_partup', tpl.partup._id, {
        onReady: function() {
            tpl.activities.loading.set(false);
        }
    });
});

Template.app_partup_activities.helpers({
    activities: function() {
        return Template.instance().activities.all({archived: false});
    },
    archivedActivities: function() {
        return Template.instance().activities.all({archived: true});
    },
    isUpper: function() {
        var partup = Template.instance().partup;
        if (!partup || !partup.uppers) return false;

        var user = Meteor.user();
        if (!user) return false;

        return partup.uppers.indexOf(user._id) > -1;
    },
    filterReactiveVar: function() {
        return Template.instance().activities.filter;
    },

    // Loading state
    activitiesLoading: function() {
        return Template.instance().activities.loading.get();
    },

    createCallback: function() {
        var template = Template.instance();
        return function(activityId) {
            Meteor.defer(function() {

                Partup.client.scroll.to(template.find('[data-activity-id=' + activityId + ']'), 0, {
                    duration: 250,
                    callback: function() {
                        template.$('[data-activity-id=' + activityId + ']').addClass('pu-state-highlight');
                    }
                });

            });
        };
    }

});

Template.app_partup_activities.events({
    'click [data-new-activity]': function(event, template) {
        event.preventDefault();

        var userId = Meteor.userId();
        var proceed = function() {
            Partup.client.popup.open({
                id: 'new-activity'
            });
        };

        if (!userId) {
            Intent.go({route: 'login'}, function(user) {
                if (user) proceed();
            });
        } else {
            proceed();
        }
    }
});
