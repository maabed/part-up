Partup.client.chat = {
    _chat_timekeeper: new ReactiveDict(),
    _current_chat: undefined,
    MAX_TYPING_PAUSE: 5000, // 5s
    initialize: function(template) {
        this._current_chat = template;
    },
    destroy: function() {
        this._chat_timekeeper.clear();
        this._current_chat = undefined;
    },
    instantlyScrollToBottom: function() {
        if (!this._current_chat) return;

        this._current_chat.instantlyScrollToBottom();
    },
    ajustScrollOffsetByMessageCount: function(count) {
        if (!this._current_chat) return;

        this._current_chat.ajustScrollOffsetByMessageCount(count);
    },
    onNewMessageRender: function(cb) {
        if (!this._current_chat) return;

        this._current_chat.onNewMessageRender(cb);
    },
    highlightMessage: function(message_id) {
        var self = this;
        if (!self._current_chat) return;

        $('.pu-state-highlight').removeClass('pu-state-highlight');

        setTimeout(function() {
            if (!self._current_chat) return;
            window.location.hash = message_id;
            var $msg = $('[data-chat-message-id=' + message_id + ']');
            var $scroller = $('[data-reversed-scroller]');
            $msg.addClass('pu-state-highlight');
            $scroller.scrollTop(
                $msg[0].offsetTop
                + $msg.closest('.pu-chatbox')[0].offsetTop
                - ($scroller.height() / 2)
                + ($msg.height() / 2)
            );
        }, 100);
    }
};
