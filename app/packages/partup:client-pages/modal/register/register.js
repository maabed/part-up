Template.modal_register.onCreated(function() {
    this.subscribe('users.count');
});

/*************************************************************/
/* Page events */
/*************************************************************/
Template.modal_register.events({
    'click [data-closepage]': function(event, template) {
        event.preventDefault();
        Partup.client.intent.return('register-details', [], function() {
            Partup.client.intent.return('register');
        });
    }
});
