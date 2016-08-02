Template.AdminFeaturedNetworks.onCreated(function() {
    this.subscribe('networks.featured_all');
    this.networkSelection = new ReactiveVar();
    this.submitting = new ReactiveVar(false);
    this.uploadingNetworkLogo = new ReactiveVar(false);
    this.currentLogoId = new ReactiveVar();
});

/*************************************************************/
/* Page helpers */
/*************************************************************/
Template.AdminFeaturedNetworks.helpers({
    featuredNetworks: function() {
        return Networks.findFeatured();
    },
    submitting: function() {
        return Template.instance().submitting.get();
    },
    schema: Partup.schemas.forms.featureNetwork,

    // Autocomplete field
    networkSelectionReactiveVar: function() {
        return Template.instance().networkSelection;
    },
    networkFieldPlaceholder: function() {
        return TAPi18n.__('pages-modal-admin-featured-networks-form-network-placeholder');
    },
    authorFieldPlaceholder: function() {
        return TAPi18n.__('pages-modal-admin-featured-networks-form-author-placeholder');
    },
    commentFieldPlaceholder: function() {
        return TAPi18n.__('pages-modal-admin-featured-networks-form-comment-placeholder');
    },
    jobTitleFieldPlaceholder: function() {
        return TAPi18n.__('pages-modal-admin-featured-networks-form-job-title-placeholder');
    },
    networkLabel: function() {
        return function(network) {
            return network.name;
        };
    },
    networkFormvalue: function() {
        return function(network) {
            return network._id;
        };
    },
    networkQuery: function() {
        return function(query, sync, async) {
            Meteor.call('networks.autocomplete', query, function(error, networks) {
                lodash.each(networks, function(p) {
                    p.value = p.name; // what to show in the autocomplete list
                });
                async(networks);
            });
        };
    },
    getQuoteAuthor: function() {
        return Meteor.users.findOne(this.featured.by_upper._id);
    },
    networkLogoUrl: function() {
        var uploadedImageID = Template.instance().currentLogoId.get();

        if (uploadedImageID) {
            var image = Images.findOne({_id: uploadedImageID});
            return image ? Partup.helpers.url.getImageUrl(image, '360x360') : null;
        }
    },
    uploadingNetworkLogo: function() {
        return Template.instance().uploadingNetworkLogo.get();
    },
    logoInput: function() {
        var template = Template.instance();
        return {
            button: 'data-browse-photos',
            input: 'data-network-logo-input',
            onFileChange: function(event) {
                Partup.client.uploader.eachFile(event, function(file) {
                    template.uploadingNetworkLogo.set(true);

                    Partup.client.uploader.uploadImage(file, function(error, image) {
                        if (error) {
                            Partup.client.notify.error(TAPi18n.__(error.reason));
                            template.uploadingNetworkLogo.set(false);
                            return;
                        }
                        template.$('input[name=logo]').val(image._id);
                        template.currentLogoId.set(image._id);

                        template.uploadingNetworkLogo.set(false);
                    });

                });
            }
        }
    }
});

/*************************************************************/
/* Page events */
/*************************************************************/
Template.AdminFeaturedNetworks.events({
    'click [data-toggle]': function(event) {
        event.preventDefault();
        $(event.currentTarget).next('[data-toggle-target]').toggleClass('pu-state-active');
        $('[data-toggle-target]').not($(event.currentTarget).next('[data-toggle-target]')[0]).removeClass('pu-state-active');
    },
    'click [data-expand]': function(event) {
        $(event.currentTarget).addClass('pu-state-expanded');
    },
    'click [data-unset-featured]': function(event, template) {
        Partup.client.prompt.confirm({
            onConfirm: function() {
                Meteor.call('networks.unfeature', event.currentTarget.dataset.networkId, function(err) {
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
AutoForm.addHooks('featureNetworkForm', {
    onSubmit: function(doc) {
        var self = this;
        self.event.preventDefault();

        var template = self.template.parent();
        template.submitting.set(true);
        var networkId = template.networkSelection.curValue._id;

        Meteor.call('networks.feature', networkId, doc, function(error) {
            if (error) return console.error(error);
            template.submitting.set(false);
            AutoForm.resetForm(self.formId);

            self.done();
        });

        return false;
    }
});
