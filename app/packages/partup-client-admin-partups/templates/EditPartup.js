/**
 */
Template.EditPartup.onCreated(function() {
    var template = this;
    template.submitting = new ReactiveVar(false);
});

Template.EditPartup.helpers({
    formSchema: Partup.schemas.forms.editPartup,
    // fieldsFromNetworkAdmin: function() {
    //     var network = Networks.findOne({slug: Template.instance().data.networkSlug.get()});
    //     return Partup.transformers.network.toFormNetworkAdmin(network)
    // },
    submitting: function() {
        return Template.instance().submitting.get();
    },
    partup: function() {
        return Template.instance().data.partup;
    }
});

AutoForm.hooks({
    adminEditPartupForm: {
        onSubmit: function(insertDoc, updateDoc, currentDoc) {
            var self = this;
            var template = self.template.parent();

            var parent = Template.instance().parent();
            parent.submitting.set(true);

            alert('not yet implemented');

            Partup.client.popup.close();
            return false;
        }
    }
});
