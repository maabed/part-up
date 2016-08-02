Template.AdminCreateSwarm.onCreated(function() {
    this.subscribe('swarms.admin_all');
    this.currentSwarm = new ReactiveVar('');
});

var placeholders = {
    'name': function() {
        return TAPi18n.__('pages-modal-create-details-form-name-placeholder');
    }
};

Template.AdminCreateSwarm.helpers({
    swarms: function() {
        return Swarms.find();
    },
    upperCount: function(swarm) {
        return swarm.uppers.length;
    },
    currentSwarm: function() {
        return Template.instance().currentSwarm;
    },
    getSwarmAdmin: function() {
        return Meteor.users.findOne(this.admin_id);
    }
});

/*************************************************************/
/* Widget events */
/*************************************************************/
Template.AdminCreateSwarm.events({
    'click [data-toggle]': function(event) {
        event.preventDefault();
        $(event.currentTarget).next('[data-toggle-target]').toggleClass('pu-state-active');
        $('[data-toggle-target]').not($(event.currentTarget).next('[data-toggle-target]')[0]).removeClass('pu-state-active');
    },
    'click [data-expand]': function(event) {
        $(event.currentTarget).addClass('pu-state-expanded');
    },
    'click [data-closepage]': function eventClickClosePage (event, template) {
        event.preventDefault();
        Intent.return('create-swarm');
    },
    'click [data-swarm-edit]': function(event, template) {
        var swarmSlug = $(event.currentTarget).data('swarm-edit');
        template.currentSwarm.set(swarmSlug);
        Partup.client.popup.open({
            id: 'popup.admin-edit-swarm'
        });
    },
    'click [data-swarm-remove]': function(event, template) {
        Partup.client.prompt.confirm({
            onConfirm: function() {
                var swarmId = $(event.currentTarget).data('swarm-remove');
                Meteor.call('swarms.remove', swarmId, function(error) {
                    if (error) {
                        Partup.client.notify.error(TAPi18n.__('pages-modal-admin-createswarm-error-' + error.reason));
                        return;
                    }
                    Partup.client.notify.success('Swarm removed correctly');
                });
            }
        });
    }
});

/*************************************************************/
/* Widget form hooks */
/*************************************************************/
AutoForm.hooks({
    createSwarmForm: {
        onSubmit: function(insertDoc, updateDoc, currentDoc) {
            var self = this;

            Meteor.call('swarms.insert', insertDoc, function(error, swarmId) {
                if (error) {
                    Partup.client.notify.error(TAPi18n.__('pages-modal-admin-createswarm-error-' + error.reason));
                    return;
                }
                Partup.client.notify.success('Swarm inserted correctly');
            });

            return false;
        }
    }
});

