Package.describe({
    name: 'partup-client-admin-partups',
    version: '0.0.1',
    summary: '',
    documentation: null
});

Package.onUse(function(api) {
    api.use([
        'partup-lib'
    ], ['client', 'server']);

    api.use([
        'templating',
        'aldeed:autoform',
        'reactive-dict'
    ], 'client');

    api.addFiles([

        'AdminPartups.html',
        'AdminPartups.js'

    ], 'client');

});
