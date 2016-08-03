Template.AdminCreateTribe.onCreated(function() {
    this.subscribe('networks.admin_all');
    this.currentNetwork = new ReactiveVar('');
});

var placeholders = {
    'name': function() {
        return TAPi18n.__('pages-modal-create-details-form-name-placeholder');
    }
};

var privacyTypeOptions = [
    {
        label: 'Public',
        value: 1
    },
    {
        label: 'Invite',
        value: 2
    },
    {
        label: 'Closed',
        value: 3
    },
];

Template.AdminCreateTribe.helpers({
    privacyTypeOptions: function() {
        return privacyTypeOptions;
    },
    networks: function() {
        return Networks.find();
    },
    privacyType: function(type) {
        var pType = _.findWhere(privacyTypeOptions, {value: type});
        if (!pType) return false;
        return pType.label ? pType.label : false;
    },
    upperCount: function(network) {
        return network.uppers ? network.uppers.length : 0;
    },
    currentNetwork: function() {
        return Template.instance().currentNetwork;
    },
    networkAdmins: function() {
        return Meteor.users.find({_id: {$in: this.admins ? this.admins : []}});
    }
});

/*************************************************************/
/* Widget events */
/*************************************************************/
Template.AdminCreateTribe.events({
    'click [data-toggle]': function(event) {
        event.preventDefault();
        $(event.currentTarget).next('[data-toggle-target]').toggleClass('pu-state-active');
        $('[data-toggle-target]').not($(event.currentTarget).next('[data-toggle-target]')[0]).removeClass('pu-state-active');
    },
    'click [data-expand]': function(event) {
        $(event.currentTarget).addClass('pu-state-expanded');
    },
    'click [data-closepage]': function(event, template) {
        event.preventDefault();
        Intent.return('create-network');
    },
    'click [data-network-edit]': function(event, template) {
        var networkSlug = $(event.currentTarget).data('network-edit');
        template.currentNetwork.set(networkSlug);
        Partup.client.popup.open({
            id: 'popup.admin-edit-tribe'
        });
    },
    'click [data-network-remove]': function(event, template) {
        var networkId = $(event.currentTarget).data('network-remove');
        var network = Networks.findOne(networkId);
        Partup.client.prompt.confirm({
            title: 'Are you sure you want to delete this tribe?',
            message: 'There are still ' + network.stats.partup_count + ' active part-ups in this tribe.',
            onConfirm: function() {
                Partup.client.prompt.confirm({
                    title: 'Are you REALLY sure you want to delete this tribe?',
                    message: 'There are still ' + network.stats.upper_count + ' active uppers in this tribe.',
                    onConfirm: function() {
                        Meteor.call('networks.remove', networkId, function(error) {
                            if (error) {
                                Partup.client.notify.error(TAPi18n.__('pages-modal-admin-createtribe-error-' + error.reason));
                                return;
                            }
                            Partup.client.notify.success('Tribe removed correctly');
                        });
                    }
                });
            }
        });
    }
});

/*************************************************************/
/* Widget form hooks */
/*************************************************************/
AutoForm.hooks({
    createNetworkForm: {
        onSubmit: function(insertDoc, updateDoc, currentDoc) {
            var self = this;

            Meteor.call('networks.insert', insertDoc, function(error, networkId) {
                if (error) {
                    Partup.client.notify.error(TAPi18n.__('pages-modal-admin-createtribe-error-' + error.reason));
                    return;
                }
                Partup.client.notify.success('Tribe inserted correctly');
            });

            return false;
        }
    }
});

