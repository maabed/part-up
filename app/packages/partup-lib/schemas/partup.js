var tagsConfiguration = {
    tagClass: 'pu-tag pu-tag-disableglobalclick',
    maxTags: 5
};
/**
 * Base Partup schema
 * @name partupBaseSchema
 * @memberOf Partup.schemas
 * @private
 */
var partupBaseSchema = new SimpleSchema({
    description: {
        type: String,
        min: 10,
        max: 250
    },
    currency: {
        type: String,
        optional: true,
        allowedValues: [
            'EUR',
            'USD',
            'GBP'
        ],
        autoform: {
            options: [
                {label: 'EUR', value: 'EUR'},
                {label: 'USD', value: 'USD'},
                {label: 'GBP', value: 'GBP'}
            ]
        }
    },
    phase: {
        type: String,
        allowedValues: [
            Partups.PHASE.BRAINSTORM,
            Partups.PHASE.PLAN,
            Partups.PHASE.EXECUTE,
            Partups.PHASE.GROW
        ]
    },
    type: {
        type: String,
        allowedValues: [
            Partups.TYPE.CHARITY,
            Partups.TYPE.ENTERPRISING,
            Partups.TYPE.COMMERCIAL,
            Partups.TYPE.ORGANIZATION
        ]
    },
    type_commercial_budget: {
        type: Number,
        min: 0,
        optional: true,
        custom: function() {
            var required = this.field('type').value === Partups.TYPE.COMMERCIAL;
            if (required && !this.isSet) {
                return 'required';
            }
        }
    },
    type_organization_budget: {
        type: Number,
        min: 0,
        optional: true,
        custom: function() {
            var required = this.field('type').value === Partups.TYPE.ORGANIZATION;
            if (required && !this.isSet) {
                return 'required';
            }
        }
    },
    end_date: {
        type: Date,
        min: function() {
            var timezone = new Date().getTimezoneOffset() / 60;
            return new Date(new Date().setHours(-timezone, 0, 0, 0));
        }
    },
    partup_name: {
        type: String,
        max: 60
    },
    image: {
        type: String
    },
    network_id: {
        type: String,
        optional: true,
        regEx: SimpleSchema.RegEx.Id,
        custom: function() {
            if (this.field('privacy_type_input').value === 'network' && !this.isSet) {
                return 'required';
            }
        }
    }
});

/**
 * Partup entity schema
 * @name partup
 * @memberOf Partup.schemas.entities
 */
Partup.schemas.entities.partup = new SimpleSchema([partupBaseSchema, {
    _id: {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },
    activity_count: {
        type: Number,
        defaultValue: 0
    },
    archived_at: {
        type: Date,
        optional: true
    },
    created_at: {
        type: Date,
        defaultValue: new Date()
    },
    creator_id: {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },
    featured: {
        type: Object,
        optional: true
    },
    'featured.active': {
        type: Boolean
    },
    'featured.by_upper': {
        type: Object
    },
    'featured.by_upper._id': {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },
    'featured.by_upper.job_title': {
        type: String,
        optional: true
    },
    'featured.comment': {
        type: String
    },
    invites: {
        type: [String],
        optional: true,
        regEx: SimpleSchema.RegEx.Id
    },
    language: {
        type: String,
        min: 2,
        max: 5
    },
    location: {
        type: Object,
        optional: true
    },
    'location.city': {
        type: String
    },
    'location.country': {
        type: String
    },
    privacy_type: {
        type: Number,
        min: 1,
        max: 5
    },
    shared_count: {
        type: Object
    },
    'shared_count.facebook': {
        type: Number,
        min: 0
    },
    'shared_count.twitter': {
        type: Number,
        min: 0
    },
    'shared_count.linkedin': {
        type: Number,
        min: 0
    },
    'shared_count.email': {
        type: Number,
        min: 0
    },
    start_date: {
        type: Date
    },
    status: {
        type: String
    },
    supporters: {
        type: [String],
        optional: true,
        regEx: SimpleSchema.RegEx.Id
    },
    tags: {
        type: [String],
        minCount: 1
    },
    'tags.$': {
        max: 30
    },
    updated_at: {
        type: Date,
        defaultValue: new Date()
    },
    uppers: {
        type: [String],
        optional: true,
        regEx: SimpleSchema.RegEx.Id
    },
    upper_data: {
        type: [Object],
        optional: true
    },
    'upper_data.$._id': {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },
    'upper_data.$.new_updates': {
        type: [String],
        optional: true
    }
}]);

/**
 * start partup form schema
 * @name partupUpdate
 * @memberOf Partup.schemas.forms
 */
Partup.schemas.forms.partupUpdate = new SimpleSchema([partupBaseSchema, {
    focuspoint_x_input: {
        type: Number,
        min: 0,
        max: 1,
        decimal: true,
        optional: true
    },
    focuspoint_y_input: {
        type: Number,
        min: 0,
        max: 1,
        decimal: true,
        optional: true
    },
    location_input: {
        type: String,
        max: 255
    },
    tags_input: {
        type: String,
        regEx: Partup.services.validators.tagsSeparatedByComma,
        custom: function() {
            var max = false;
            lodash.each(this.value.split(','), function(tag) {
                if (tag.length > 30) max = true;
            });

            if (max) return 'individualMaxString';
        },
        autoform: {
            type: 'tags',
            afFieldInput: tagsConfiguration
        }
    }
}]);

/**
 * start partup create form schema
 * @name partupCreate
 * @memberOf Partup.schemas.forms
 */
Partup.schemas.forms.partupCreate = new SimpleSchema([Partup.schemas.forms.partupUpdate, {
    privacy_type_input: {
        type: String,
        allowedValues: [
            'public',
            'private',
            'network'
        ]
    }
}]);

/**
 * Feature partup form schema
 * @name featurePartup
 * @memberOf Partup.schemas.forms
 */
Partup.schemas.forms.featurePartup = new SimpleSchema({
    active: {
        type: Boolean
    },
    comment: {
        type: String
    },
    author_id: {
        type: String
    },
    job_title: {
        type: String
    }
});

Partup.schemas.forms.editPartup = new SimpleSchema({
    network_id: {
        type: String,
        optional: true
    }
});
