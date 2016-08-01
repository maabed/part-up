Template.registerHelper('partupLineBreakToBr', function(input) {
    return input.replace(/(?:\r\n|\r|\n)/g, '<br />');
});
