// jscs:disable
/**
 * Render a single partup tile
 *
 * widget options:
 *
 * @param {Boolean} HIDE_TAGS       Whether the widget should hide the tags
 * @module client-partup-tile
 */
// jscs:enable

var MAX_AVATARS = 5;
var AVATAR_DEFAULT_RADIUS = 100;
var AVATAR_HOVERING_RADIUS = 125;
var AVATAR_DEFAULT_DISTANCE = 24;
var AVATAR_HOVERING_DISTANCE = 18;

Template.PartupTile.onCreated(function() {
    var template = this;

    // Partup image reactive hover state

    // Transform partup
    var partup = template.data.partup;
    template.data.partup.hovering = new ReactiveVar(false);

    // -- Partup details
    partup.name = Partup.helpers.url.capitalizeFirstLetter(partup.name);
    partup.imageObject = partup.imageObject || Images.findOne({_id: partup.image});
    partup.boundedProgress = partup.progress ? Math.max(10, Math.min(99, partup.progress)) : 10;
    partup.mappedTags = partup.tags.map(function(tag, index) {
        return {
            tag: tag,
            delay: .05 * index
        };
    });
    // -- Partup network
    partup.networkObject = partup.networkObject || Networks.findOne({_id: partup.network_id});
    if (partup.networkObject) {
        partup.networkObject.iconObject = partup.networkObject.iconObject || Images.findOne({_id: partup.networkObject.icon});

        // this checkd the network object en determines if the user is definitly a member of the network
        // this should not be considered the truth if it is false
        partup.networkObject.userIsDefinitlyMember = Partup.client.partuptile.userIsDefinitlyMemberOfNetwork(partup.networkObject, Meteor.userId());
    }

    // -- Partup counts
    partup.activityCount = partup.activity_count || Activities.findForPartup(partup).count();
    partup.supporterCount = partup.supporters ? partup.supporters.length : 0;
    partup.dayCount = Math.ceil(((((new Date() - new Date(partup.created_at)) / 1000) / 60) / 60) / 24);

    // -- Partup uppers
    partup.avatars = partup.uppers
        .slice(0, MAX_AVATARS)
        .map(function(avatar, index, arr) {

            // Avatar position
            var default_coords = Partup.client.partuptile.getAvatarCoordinates(arr.length, index, 0, AVATAR_DEFAULT_DISTANCE, AVATAR_DEFAULT_RADIUS);
            var hovering_coords = Partup.client.partuptile.getAvatarCoordinates(arr.length, index, 0, AVATAR_HOVERING_DISTANCE, AVATAR_HOVERING_RADIUS);
            var position = {
                default: {
                    delay: .03 * index,
                    x: Math.round(default_coords.x + 95),
                    y: Math.round(default_coords.y + 95)
                },
                hover: {
                    delay: .03 * index,
                    x: Math.round(hovering_coords.x + 95),
                    y: Math.round(hovering_coords.y + 95)
                }
            };

            // Blue avatar, for example: (5+)
            if (partup.uppers.length > arr.length && index + 1 === MAX_AVATARS) {
                return {
                    position: position,
                    data: {
                        remainingUppers: partup.uppers.length - MAX_AVATARS + 1
                    }
                };
            }

            // Default avatar
            var upper = mout.object.find(partup.upperObjects, {_id: avatar}) || Meteor.users.findOne({_id: avatar});
            upper.profile.imageObject = upper.profile.imageObject || Images.findOne({_id: upper.profile.image});

            return {
                position: position,
                data: {
                    upper: upper
                }
            };
        });
});

Template.PartupTile.onRendered(function() {
    var template = this;

    // Bind tag positioner
    var tagsElement = template.find('.pu-sub-partup-tags');
    if (tagsElement) {
        template.autorun(function() {
            Partup.client.screen.size.get();
            var br = document.body.getBoundingClientRect();
            var rect = tagsElement.getBoundingClientRect();

            if (rect.right > br.right) {
                tagsElement.classList.add('pu-state-right');
            }
        });
    }

    // Focuspoint in discover image
    if (template.data.partup.image && !template.data.partup.archived_at) {
        var image = template.data.partup.imageObject || Images.findOne({_id: template.data.partup.image});

        if (image && image.focuspoint) {
            var focuspointElm = template.find('[data-partup-tile-focuspoint]');
            template.focuspoint = new Focuspoint.View(focuspointElm, {
                x: image.focuspoint.x,
                y: image.focuspoint.y
            });
        }
    }

    var canvasElm = template.find('canvas.pu-sub-radial');
    if (canvasElm) Partup.client.partuptile.drawCircle(canvasElm);
});

Template.PartupTile.helpers({
    templateName: function() {
        return this.archived_at ? 'PartupTile_archived' : 'PartupTile_active';
    },
    showStartQuery: function() {
        return this.userIsDefinitlyMember ? (this.archived_at ? 'show=true' : 'show=false' ) : '';
    }
});

Template.PartupTile.events({
    'mouseenter .pu-partupcircle': function(event, template) {
        template.data.partup.hovering.set(true);
    },
    'mouseleave .pu-partupcircle': function(event, template) {
        template.data.partup.hovering.set(false);
    }
});
