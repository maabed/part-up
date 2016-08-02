Template.AdminFeaturedPartups.onCreated(function() {
    this.subscribe('partups.featured_all');
    this.partupSelection = new ReactiveVar();
    this.submitting = new ReactiveVar(false);
});

/*************************************************************/
/* Page helpers */
/*************************************************************/
Template.AdminFeaturedPartups.helpers({
    featuredPartups: function() {
        return Partups.find({}).fetch();
    },
    submitting: function() {
        return Template.instance().submitting.get();
    },
    schema: Partup.schemas.forms.featurePartup,

    // Autocomplete field
    partupSelectionReactiveVar: function() {
        return Template.instance().partupSelection;
    },
    partupFieldPlaceholder: function() {
        return TAPi18n.__('pages-modal-admin-featured-partups-form-partup-placeholder');
    },
    commentFieldPlaceholder: function() {
        return TAPi18n.__('pages-modal-admin-featured-partups-form-comment-placeholder');
    },
    authorFieldPlaceholder: function() {
        return TAPi18n.__('pages-modal-admin-featured-partups-form-author-placeholder');
    },
    jobTitleFieldPlaceholder: function() {
        return TAPi18n.__('pages-modal-admin-featured-partups-form-job-title-placeholder');
    },
    partupLabel: function() {
        return function(partup) {
            return partup.name;
        };
    },
    partupFormvalue: function() {
        return function(partup) {
            return partup._id;
        };
    },
    partupQuery: function() {
        return function(query, sync, async) {
            Meteor.call('partups.autocomplete', query, '', true, function(error, partups) {
                lodash.each(partups, function(p) {
                    p.value = p.name; // what to show in the autocomplete list
                });
                async(partups);
            });
        };
    },
    getQuoteAuthor: function() {
        return Meteor.users.findOne(this.featured.by_upper._id);
    }
});

/*************************************************************/
/* Page events */
/*************************************************************/
Template.AdminFeaturedPartups.events({
    'click [data-toggle]': function(event) {
        event.preventDefault();
        $(event.currentTarget).next('[data-toggle-target]').toggleClass('pu-state-active');
        $('[data-toggle-target]').not($(event.currentTarget).next('[data-toggle-target]')[0]).removeClass('pu-state-active');
    },
    'click [data-unset-featured]': function(event, template) {
        Partup.client.prompt.confirm({
            onConfirm: function() {
                Meteor.call('partups.unfeature', event.currentTarget.dataset.partupId, function(err) {
                    if (err) {
                        Partup.client.notify.error(err.reason);
                        return;
                    }
                });
            }
        });
    }
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
