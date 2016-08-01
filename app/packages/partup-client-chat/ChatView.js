Template.ChatView.onCreated(function() {
    var template = this;
    var chatId = template.data.config.chatId;
    if (!chatId) throw "No chatId was provided";
    template.stickyAvatar = new ReactiveVar(undefined);
    template.initialized = new ReactiveVar(false);
    template.rendered = new ReactiveVar(false);
    template.overscroll = new ReactiveVar(false);
    template.underscroll = new ReactiveVar(false);
    template.chatEmpty = new ReactiveVar(false);
    template.oldestUnreadMessage = new ReactiveVar(undefined);
    template.userIsAtScrollBottom = true;
    template.focussed = true;

    if (template.data.config.reactiveBottomBarHeight) {
        template.data.config.reactiveBottomBarHeight.equalsFunc = function(a, b) {
            template.instantlyScrollToBottom();
        };
    }

    template.init = function() {
        Partup.client.chat.initialize(template);
        start();
        template.initialized.set(true);
    };

    var handleNewMessagesViewedIfMessageDividerIsOnScreen = function() {
        Meteor.setTimeout(function() {
            if (!template.dividerLineIsVisible() || !template.focussed) return;
            template.data.config.onNewMessagesViewed();
            template.hideLine();
        }, 4000);
    };

    template.scrollBottomCheck = function() {
        var element = template.scrollContainer[0];
        var pos = element.scrollTop;
        var height = element.scrollHeight - element.clientHeight;
        if (pos === height) {
            template.userIsAtScrollBottom = true;
        } else {
            template.userIsAtScrollBottom = false;
        }
    };

    template.ajustScrollOffsetByMessageCount = function(count) {
        var offset = $('[data-chat-message-id]')
            .slice(0, count)
            .map(function() {
                return $(this).outerHeight(true);
            })
            .toArray()
            .reduce(function(prevHeight, curHeight) {
                return prevHeight + curHeight;
            });
        template.scrollContainer[0].scrollTop = offset;
    };

    template.ajustScrollOffset = function() {
        if (!template.scrollContainer) return;
        var element = template.scrollContainer[0];
        if (!element) return;
        var pos = element.scrollTop;
        var height = element.scrollHeight - element.clientHeight;
        _.defer(function() {
            if (pos === height || template.userIsAtScrollBottom) template.instantlyScrollToBottom();
            template.stickyNewMessagesDividerHandler();
        });
    };

    template.instantlyScrollToBottom = function() {
        var element = template.scrollContainer[0];
        element.scrollTop = element.scrollHeight;
    };

    template.dividerLineIsVisible = function() {
        var dividerElement = $('[data-new-messages-divider]');
        if (!dividerElement[0]) return false; // maybe it's already hidden, I dunno

        var scrollElement = template.scrollContainer;
        var scrollDest = dividerElement[0].offsetTop - (scrollElement[0].clientHeight - (dividerElement[0].clientHeight * 1.5));
        return scrollElement.scrollTop() >= scrollDest;
    };

    template.hideTimeout;
    template.hideLine = function() {
        if (template.hideTimeout) clearTimeout(template.hideTimeout);

        var overscroll = template.overscroll.get();
        var underscroll = template.underscroll.get();
        if (overscroll || underscroll) return;

        // check if the divider line is visible for the user, then hide it
        if (!template.dividerLineIsVisible()) return;

        var dividerElement = $('[data-new-messages-divider]');
        dividerElement.addClass('hide');

        // remove the oldestUnreadMessage when the divider has faded out
        Meteor.setTimeout(function() {
            template.oldestUnreadMessage.set(undefined);
        }, 250);
    };
    template.delayedHideLine = function(delay) {
        if (template.hideTimeout) clearTimeout(template.hideTimeout);
        template.hideTimeout = setTimeout(template.hideLine, delay);
    };

    template.windowFocusHandler = function(event) {
        template.focussed = true;
        template.stickyNewMessagesDividerHandler(true);
        $('[data-messageinput]').focus();
    };
    template.windowBlurHandler = function(event) {
        template.focussed = false;
    };
    $(window).on('focus', template.windowFocusHandler);
    $(window).on('blur', template.windowBlurHandler);

    template.rememberOldestUnreadMessage = function(oldestUnreadMessage) {
        if (!template.oldestUnreadMessage.get()) {
            template.oldestUnreadMessage.set(oldestUnreadMessage);
        }
    };

    template.newMessagesDividerHandler = function(messages) {
        var chat = Chats.findOne(chatId);
        if (!chat) return;

        var userId = Meteor.userId();
        var counter = lodash.find(chat.counter || [], {user_id: userId});

        // get the unread messages count
        var unreadMessagesCount = counter ? counter.unread_count : 0;

        // stop if the user is not focussed or if there are no unread messages
        if (template.focussed && unreadMessagesCount <= 0) return;

        // if user is focussed stop here
        if (template.focussed && template.initialized.get()) return;

        // returns the oldest unread message with n offset
        // offset = 0 is oldest, offset = 1 is second oldest
        var returnOldestUnreadMessageWithOffset = function(n) {
            return messages[messages.length - ((unreadMessagesCount + 1) - n)];
        };

        var offset = 0;
        var oldestUnreadMessage = returnOldestUnreadMessageWithOffset(offset);

        // stop if there is no oldest unread message
        if (!oldestUnreadMessage) return;

        // make sure the oldest unread message is not the current user's message
        while (oldestUnreadMessage.creator_id === userId) {
            offset++;
            var newOldestMessage = returnOldestUnreadMessageWithOffset(offset);
            if (!newOldestMessage) {
                oldestUnreadMessage = undefined;
                break;
            }
            oldestUnreadMessage = newOldestMessage;
            if (offset == unreadMessagesCount) break;
        }

        // again, stop if there is no oldest unread message
        if (!oldestUnreadMessage) return;

        template.rememberOldestUnreadMessage(oldestUnreadMessage);
    };

    template.stickyNewMessagesDividerHandler = function(hideWhenViewed) {
        if ($('[data-new-messages-divider]')[0]) {
            var overscroll = $('[data-new-messages-divider]').position().top < 0;
            var underscroll = $('[data-new-messages-divider]').position().top > (template.scrollContainer[0].clientHeight - $('[data-new-messages-divider]').outerHeight(true));
            template.overscroll.set(overscroll);
            template.underscroll.set(underscroll);
            if (!overscroll && hideWhenViewed) {
                template.delayedHideLine(1000);
            }
        }
    };

    template.stickyUserAvatarHandler = function() {
        var imageId = undefined;
        var userId = undefined;

        $('[data-message-user-image-id]').each(function() {
            var elm = $(this);
            var offsetTop = elm.position().top;
            var bottomOffsetTop = offsetTop + elm.outerHeight(true);

            if (offsetTop < 5 && bottomOffsetTop > 48) {
                imageId = elm.attr('data-message-user-image-id');
                userId = elm.attr('data-message-user-id');
                var avatar = Images.findOne({_id: imageId});
                var image = Partup.helpers.url.getImageUrl(avatar, '80x80');
                $('[data-avatar]').css({
                    'background-image': 'url(' + image + ')',
                    'background-color': '#eee'
                });
                elm.addClass('pu-chatbox-noavatar');

            } else {
                elm.removeClass('pu-chatbox-noavatar');
            }
            if (offsetTop < 0) {
                elm.addClass('pu-chatbox-avatar-bottom').removeClass('pu-chatbox-avatar-top');
            } else {
                elm.addClass('pu-chatbox-avatar-top').removeClass('pu-chatbox-avatar-bottom');
            }
        });
        if (userId === Meteor.userId()) {
            $('[data-sticky-avatar]').addClass('pu-sticky-user-right');
        } else {
            $('[data-sticky-avatar]').removeClass('pu-sticky-user-right');
        }
        if (!imageId) {
            $('[data-avatar]').css({
                'background-image': 'none',
                'background-color': 'transparent'
            });
        }
        template.stickyAvatar.set(userId);
    };

    template.scrollToNewMessages = function() {
        template.overscroll.set(false);
        template.underscroll.set(false);

        var dividerElement = $('[data-new-messages-divider]');
        var scrollElement = template.scrollContainer;
        var scrollDest = dividerElement[0].offsetTop - (dividerElement.outerHeight(true));

        scrollElement.animate({
            scrollTop: scrollDest
        }, 300, function() {
            template.delayedHideLine(1000);
        });
    };

    var newMessageListeneners = [];
    template.onNewMessageRender = function(callback) {
        newMessageListeneners.push(callback);
    };
    template.newMessagesDidRender = function() {
        newMessageListeneners.forEach(function() {
            newMessageListeneners.pop().call();
        });
    };

    var start = function() {
        template.autorun(function() {
            var messages = template.data.config.reactiveMessages.get();
            Tracker.nonreactive(function() {
                template.newMessagesDividerHandler(messages);
                template.chatEmpty.set(!messages.length);
            });
        });

        // marks all messages as seen (not read) in current chat
        template.autorun(function() {
            // var sendingMessage = template.sendingMessage.get();
            // if (template.searching || sendingMessage) return;
            if (template.searching) return;

            if (template.focussed) {
                ChatMessages
                    .find({chat_id: chatId, read_by: {$nin: [Meteor.userId()]}, seen_by: {$nin: [Meteor.userId()]}})
                    .forEach(function(message) {
                        Meteor.call('chatmessages.read', message._id);
                    });

                template.data.config.onNewMessagesViewed();
            } else {
                ChatMessages
                    .find({chat_id: chatId, seen_by: {$nin: [Meteor.userId()]}})
                    .forEach(function(message) {
                        Meteor.call('chatmessages.seen', message._id);
                    });
            }
        });

        handleNewMessagesViewedIfMessageDividerIsOnScreen();
    };
});

Template.ChatView.onRendered(function() {
    var template = this;
    template.scrollContainer = $('[data-reversed-scroller]');
    Meteor.setTimeout(function() {
        template.scrollContainer[0].scrollTop = template.scrollContainer[0].scrollHeight;
        Meteor.setTimeout(function() {
            template.rendered.set(true);
        }, 10);
    }, 10);
    template.init();
});

Template.ChatView.onDestroyed(function() {
    var template = this;
    $(window).off('focus', template.windowFocusHandler);
    $(window).off('blur', template.windowBlurHandler);
    Partup.client.chat.destroy();
});

Template.ChatView.helpers({
    data: function() {
        var template = Template.instance();
        return {
            messagesGroupedByDelay: function(messages) {
                return Partup.client.chatmessages.groupByDelay(messages, {seconds: 120});
            },
            messagesGroupedByDay: function(messages) {
                return Partup.client.chatmessages.groupByCreationDay(messages);
            },
            messagesGroupedByUser: function(messages) {
                return Partup.client.chatmessages.groupByCreatorId(messages);
            },
            messages: function() {
                var messages = template.data.config.reactiveMessages.get();
                var oldestUnreadMessage = template.oldestUnreadMessage.get();
                var dateBorder = oldestUnreadMessage ? oldestUnreadMessage.created_at : new Date();
                template.ajustScrollOffset();
                return {
                    old: function() {
                        return _.filter(messages, function(message) {
                            return message.created_at < dateBorder;
                        });
                    },
                    new: function() {
                        return _.filter(messages, function(message) {
                            return message.created_at >= dateBorder;
                        });
                    }
                };
            },
            stickyAvatar: function() {
                var activeId = template.stickyAvatar.get();
                if (!activeId) return false;
                return Meteor.users.findOne(template.stickyAvatar.get());
            }
        };
    },
    state: function() {
        var template = Template.instance();
        return {
            fullyLoaded: function() {
                return template.initialized.get() && template.rendered.get();
            },
            reactiveHighlight: function() {
                return template.data.config.reactiveHighlight;
            },
            limitReached: function() {
                return template.data.config.messageLimitReached;
            },
            overscroll: function() {
                return template.overscroll.get();
            },
            underscroll: function() {
                return template.underscroll.get();
            },
            chatEmpty: function() {
                return template.chatEmpty.get();
            },
            placeholderText: function() {
                return template.data.config.placeholderText;
            },
            bottomOffset: function() {
                return template.data.config.reactiveBottomBarHeight.get();
            }
        };
    },
    handlers: function() {
        var template = Template.instance();
        return {
            onMessageRender: function() {
                return template.newMessagesDidRender;
            }
        };
    },
    translations: function() {
        var template = Template.instance();
        return {
            noresultsResults: function() {
                return TAPi18n.__('pages-app-chat-label-noresults', {
                    searchquery: template.data.config.reactiveHighlight.get()
                });
            },
            showingResults: function() {
                return TAPi18n.__('pages-app-chat-label-showingresults', {
                    searchquery: template.data.config.reactiveHighlight.get()
                });
            }
        };
    }
});

Template.ChatView.events({
    'DOMMouseScroll [data-preventscroll], mousewheel [data-preventscroll]': Partup.client.scroll.preventScrollPropagation,
    'DOMMouseScroll [data-reversed-scroller], mousewheel [data-reversed-scroller]': function(event, template) {
        template.stickyNewMessagesDividerHandler(true);
    },
    'scroll [data-reversed-scroller]': function(event, template) {
        template.scrollBottomCheck();
        if (event.currentTarget.scrollTop < 50) {
            template.data.config.onScrollTop();
        }
        if (!Partup.client.browser.isSafari()) template.stickyUserAvatarHandler();
    },
    'click [data-new-messages-divider]': function(event, template) {
        template.hideLine();
    },
    'click [data-scrollto]': function(event, template) {
        event.preventDefault();
        template.scrollToNewMessages();
    }
});

