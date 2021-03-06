/*

Jappix - An open social platform
These are the storage JS scripts for Jappix

-------------------------------------------------

License: AGPL
Author: Valérian Saliou

*/

// Bundle
var Storage = (function () {

    /**
     * Alias of this
     * @private
     */
    var self = {};


      /**
     * Gets the storage items of the user
     * @public
     * @param {string} type
     * @return {undefined}
     */
    self.get = function(type) {

        /* REF: http://xmpp.org/extensions/xep-0049.html */

        try {
            var iq = new JSJaCIQ();
            iq.setType('get');
            
            var iqQuery = iq.setQuery(NS_PRIVATE);
            iqQuery.appendChild(iq.buildNode('storage', {'xmlns': type}));
            
            con.send(iq, self.handle);
        } catch(e) {
            Console.error('Storage.get', e);
        }

    };


    /**
     * Handles the storage items
     * @public
     * @param {object} iq
     * @return {undefined}
     */
    self.handle = function(iq) {

        try {
            var handleXML = iq.getQuery();
            var handleFrom = Common.fullXID(Common.getStanzaFrom(iq));
            
            // Define some vars
            var options = $(handleXML).find('storage[xmlns="' + NS_OPTIONS + '"]');
            var inbox = $(handleXML).find('storage[xmlns="' + NS_INBOX + '"]');
            var bookmarks = $(handleXML).find('storage[xmlns="' + NS_BOOKMARKS + '"]');
            var rosternotes = $(handleXML).find('storage[xmlns="' + NS_ROSTERNOTES + '"]');
            
            // No options and node not yet configured
            if(options.size() && !options.find('option').size() && (iq.getType() != 'error')) {
                Welcome.open();
            }
            
            // Parse the options xml
            options.find('option').each(function() {
                // We retrieve the informations
                var type = $(this).attr('type');
                var value = $(this).text();
                
                // We display the storage
                DataStore.setDB(Connection.desktop_hash, 'options', type, value);
                
                // If this is the buddy list show status
                if((type == 'roster-showall') && (value == '1'))
                    Interface.showAllBuddies('storage');
            });
            
            // Parse the inbox xml
            inbox.find('message').each(function() {
                Inbox.storeMessage(
                          $(this).attr('from'),
                          $(this).attr('subject'),
                          $(this).text(),
                          $(this).attr('status'),
                          $(this).attr('id'),
                          $(this).attr('date'),
                          [
                           $(this).attr('file_title'),
                           $(this).attr('file_href'),
                           $(this).attr('file_type'),
                           $(this).attr('file_length')
                          ]
                         );
            });
            
            // Parse the bookmarks xml
            bookmarks.find('conference').each(function() {
                // We retrieve the informations
                var xid = $(this).attr('jid');
                var name = $(this).attr('name');
                var autojoin = $(this).attr('autojoin');
                var password = $(this).find('password').text();
                var nick = $(this).find('nick').text();
                
                // Filter autojoin (compatibility)
                autojoin = ((autojoin == 'true') || (autojoin == '1')) ? 'true' : 'false';

                // We display the storage
                Favorites.display(xid, name, nick, autojoin, password);
                
                // Join the chat if autojoin is enabled
                if(autojoin == 'true')
                    Chat.checkCreate(xid, 'groupchat', nick, password, name);
            });
            
            // Parse the roster notes xml
            rosternotes.find('note').each(function() {
                DataStore.setDB(Connection.desktop_hash, 'rosternotes', $(this).attr('jid'), $(this).text());
            });
            
            // Options received
            if(options.size()) {
                Console.log('Options received.');
                
                // Now, get the inbox
                self.get(NS_INBOX);
                
                // Geolocate the user
                PEP.geolocate();
                
                $('.options-hidable').show();
            }
            
            // Inbox received
            else if(inbox.size()) {
                Console.log('Inbox received.');
                
                // Send the first presence!
                Presence.sendFirst(DataStore.getDB(Connection.desktop_hash, 'checksum', 1));
                
                // Check we have new messages (play a sound if any unread messages)
                if(Inbox.checkMessages()) {
                    Audio.play('notification');
                }
                
                $('.inbox-hidable').show();
            }
            
            // Bookmarks received
            else if(bookmarks.size()) {
                // Join the groupchats the admin defined (if any)
                Groupchat.joinConf();
                
                Console.log('Bookmarks received.');
            }
            
            // Roster notes received (for logger)
            else if(rosternotes.size()) {
                Console.log('Roster notes received.');
            }
        } catch(e) {
            Console.error('Storage.handle', e);
        }

    };


    /**
     * Return class scope
     */
    return self;

})();