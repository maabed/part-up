Template.AdminPartups.onCreated(function() {
    var template = this;
    template.subscribe('partups.featured_all');
    template.partups = new ReactiveVar([]);
    template.page = 0;
    template.limit = 20;

    template.currentPartup = new ReactiveVar();

    Meteor.call('partups.admin_all', {}, {
        page: template.page,
        limit: template.limit
    }, function(error, results) {
        template.page = 1;
        template.partups.set(results);
    });
});

/*************************************************************/
/* Page helpers */
/*************************************************************/
Template.AdminPartups.helpers({
    partups: function() {
        return Template.instance().partups.get();
    },
    creatorById: function(id) {
        return Meteor.users.findOne(id);
    },
    currentPartup: function() {
        return Template.instance().currentPartup.get();
    }
});

/*************************************************************/
/* Page events */
/*************************************************************/
Template.AdminPartups.events({
    'click [data-toggle]': function(event) {
        event.preventDefault();
        $(event.currentTarget).next('[data-toggle-target]').toggleClass('pu-state-active');
        $('[data-toggle-target]').not($(event.currentTarget).next('[data-toggle-target]')[0]).removeClass('pu-state-active');
    },
    'click [data-expand]': function(event) {
        $(event.currentTarget).addClass('pu-state-expanded');
    },
    'click [data-delete]': function(event, template) {
        alert('not yet implemented');
    },
    'click [data-edit]': function(event, template) {
        template.currentPartup.set(this);
        Partup.client.popup.open({
            id: 'popup.admin-edit-partup'
        });
    },
    'submit .partupsearch': function(event, template) {
        event.preventDefault();
        template.page = 0;
        var query = template.find('[data-partupsearchfield]').value;
        Meteor.call('partups.admin_all', {
            'name': {$regex: query, $options: 'i'}
        },{
            limit: 100,
            page: template.page
        }, function(error, results) {
            template.partups.set(results);
        });
    },
    'click [data-showmore]': function(event, template) {
        Meteor.call('partups.admin_all', {}, {
            page: template.page,
            limit: template.limit
        }, function(error, results) {
            var currentPartups = template.partups.get();
            var newPartupsList = currentPartups.concat(results);
            template.partups.set(newPartupsList);
            template.page++;
        });
    },
});

/*************************************************************/
/* Widget form hooks */
/*************************************************************/
AutoForm.addHooks('featurePartupForm', {
    onSubmit: function(doc) {
        var self = this;
        self.event.preventDefault();

        var template = self.template.parent();
        template.submitting.set(true);
        var partupId = template.partupSelection.curValue._id;

        Meteor.call('partups.feature', partupId, doc, function(error) {
            if (error) return console.error(error);
            template.submitting.set(false);
            AutoForm.resetForm(self.formId);

            self.done();
        });

        return false;
    }
});
