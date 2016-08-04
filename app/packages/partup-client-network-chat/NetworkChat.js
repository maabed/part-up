Template.NetworkChat.onCreated(function() {
    var template = this;
    var networkSlug = template.data.networkSlug;
    var chatId = undefined;

    template.searching = false;
    template.LIMIT = 50;
    template.SEARCH_LIMIT = 50;
    template.initialized = new ReactiveVar(false);
    template.bottomBarHeight = new ReactiveVar(68);
    // template.sendingMessage = new ReactiveVar(false);

    var initialize = function(chat_id) {
        chatId = chat_id;
        startMessageCollector(chat_id);
        template.initialized.set(true);
    };

    template.resetUnreadMessagesIndicatorBadge = function() {
        Meteor.call('chats.reset_counter', chatId);
    };

    var chatSubscriptionHandler = function() {
        var network = Networks.findOne({slug: networkSlug});
        var chat = Chats.findOne({_id: network.chat_id || 0});
        if (chat) {
            // if a chat is available, continue
            initialize(chat._id);
        }
    };

    var chatSubscription = template.subscribe('networks.one.chat', networkSlug, {limit: template.SEARCH_LIMIT}, {onReady: chatSubscriptionHandler});
    template.limitReached = new ReactiveVar(false);
    template.messageLimit = new ReactiveVar(template.LIMIT, function(oldLimit, newLimit) {
        if (oldLimit === newLimit) return;

        chatSubscription = template.subscribe('networks.one.chat', networkSlug, {limit: newLimit}, {
            onReady: function() {
                var messagesCount = ChatMessages.find({chat_id: chatId}, {limit: newLimit, sort: {created_at: 1}}).count();
                var totalNewMessages = messagesCount - oldLimit;
                if (totalNewMessages < 1) {
                    template.limitReached.set(true);
                } else {
                    _.defer(function() {
                        Partup.client.chat.ajustScrollOffsetByMessageCount(totalNewMessages);
                        setTimeout(function() {
                            template.loadingOlderMessages = false;
                        }, 500);
                    });
                }
            }
        });
    });

    template.loadOlderMessages = function() {
        if (template.loadingOlderMessages || template.searching) return;
        template.loadingOlderMessages = true;
        if (template.limitReached.get()) return;
        template.messageLimit.set(template.messageLimit.get() + 10);
    };

    // search
    template.searchQuery = new ReactiveVar('', function(oldValue, newValue) {
        if (oldValue === newValue) return;

        template.searching = (typeof newValue === 'string') && newValue.length;
        if (!template.searching) return;

        Meteor.call('chatmessages.search_in_network', networkSlug, newValue, {limit: template.LIMIT}, function(err, res) {
            template.reactiveMessages.set(res);
            _.defer(Partup.client.chat.instantlyScrollToBottom);
        });
    });
    var setSearchQuery = function(query) {
        template.searchQuery.set(query);
    };
    template.throttledSetSearchQuery = _.throttle(setSearchQuery, 500, {trailing: true});

    template.onMessageClick = function(messageClickEvent) {
        if (!messageClickEvent.searching) return;
        var message_id = messageClickEvent.message_id;
        Meteor.call('chatmessages.get_context', networkSlug, message_id, {limit: 50}, function(err, res) {
            template.reactiveMessages.set(res);
            Partup.client.chat.highlightMessage(message_id);
        });
    };

    // messages
    var localChatMessagesCollection = [];
    template.reactiveMessages = new ReactiveVar([]);
    var startMessageCollector = function(chat_id) {

        // gets chatmessages and stores them in localChatMessagesCollection
        template.autorun(function(computation) {
            // run this autorun when the searchquery changes
            var searchQuery = template.searchQuery.get();
            // var sendingMessage = template.sendingMessage.get();

            // don't do anything if the user is searching
            // or if a message is not processed yet (scraper)
            // if (template.searching || sendingMessage) return;
            if (template.searching) return;

            var limit = template.messageLimit.get();
            var messages = ChatMessages
                .find({chat_id: chat_id}, {limit: limit, sort: {created_at: 1}})
                .fetch();

            // store messages locally and filter out duplicates
            localChatMessagesCollection = localChatMessagesCollection.concat(messages);
            localChatMessagesCollection = mout.array.unique(localChatMessagesCollection, function(message1, message2) {
                return message1._id === message2._id;
            });

            // wrapped in nonreactive to prevent unnecessary autorun
            Tracker.nonreactive(function() {
                template.reactiveMessages.set(localChatMessagesCollection);
            });
        });
    };
});

Template.NetworkChat.helpers({
    config: function() {
        var template = Template.instance();
        var network = Networks.findOne({slug: template.data.networkSlug});
        if (!network.chat_id) return false;
        return {
            messageView: function() {
                return {
                    chatId: network.chat_id,
                    onScrollTop: template.loadOlderMessages,
                    onNewMessagesViewed: template.resetUnreadMessagesIndicatorBadge,
                    onMessageClick: template.onMessageClick,
                    placeholderText: TAPi18n.__('pages-app-network-chat-empty-placeholder'),
                    reactiveMessages: template.reactiveMessages,
                    reactiveHighlight:  template.searchQuery,
                    reactiveBottomBarHeight: template.bottomBarHeight
                };
            },
            bottomBar: function() {
                return {
                    chatId: network.chat_id,
                    reactiveBottomBarHeight: template.bottomBarHeight
                };
            },
            sideBar: function() {
                return {
                    networkSlug: template.data.networkSlug,
                    onSearch: template.throttledSetSearchQuery
                };
            }
        };
    },
    data: function() {
        var template = Template.instance();
        var network = Networks.findOne({slug: template.data.networkSlug});
        return {
            network: function() {
                return network;
            },
            chatId: function() {
                return network.chat_id;
            },
            reactiveMessages: function() {
                return template.reactiveMessages;
            }
        };
    },
    state: function() {
        var template = Template.instance();
        return {
            initialized: function() {
                return template.initialized.get();
            }
        };
    }
});
