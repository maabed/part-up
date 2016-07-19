Part-up
=================

[![Join the chat at https://gitter.im/part-up/part-up](https://badges.gitter.im/part-up/part-up.svg)](https://gitter.im/part-up/part-up?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Installation

- ensure [imagemagick][im] is installed (OS X: `brew
  install imagemagick`)
- ensure [meteor](https://www.meteor.com/install) is installed
- make sure you have all the correct environment variables set, which can be done in two ways:
    1. generate the development configuration using `cd config/development && ./decrypt` (this requires a password, which can be requested from the Part-up team)
    2. rename the file `config/development/env.sh.dist` to `config/development/env.sh` and fill in all the required credentials
- `./start` (in the root folder of the app)
- App running at: http://localhost:3000/

[im]: http://www.imagemagick.org/

# Frontend

## Structure
We have four types of application parts: *layout*, *page*, *widget* and *small component*. The explanation below points out their uses. Grahpic: **app/packages/partup:client-pages/app** and for the modals **app/packages/partup:client-pages/modal**.

### Layout
Layouts are the top-level templates. They can contain a header, current page placeholder and footer. The Sass file should only contain header and footer positioning rules. The js file should keep track of the state of the template and handle navigation functionality.

### Page
Pages can contain single components with page-specific functionality, widgets (packages) and sub-pages. A page, in fact, only represents a composition. Therefore, the Sass file should only contain position defenitions of the inside components. The js file should handle the page states and navigation functionality if subpages are present. Pages are directly binded to routes.

### Widget (packages)
With a funcionality, you can think of a widget which will fulfill one standalone functionality. Functionalities that tie the app together (like a navigation bar) should not be declared as a package, because it’s not a widget with a standalone functionality. The Sass file may only contain component composition rules. When a widget is called WidgetsPartupActivities, the package should be called partup:client-widgets-partup-activities.

### Small component
The whole app is made up of small styled components. These components are not functional by themselves, but only provides styling. For example: buttons, inputs, titles, paragraphs and menus. Each component should be defined as a Sass class prefixed with “pu-”, for example “pu-button”. Be aware not to define any styling dealing with the position of the component inside its parent or relative to its siblings.

### Adding an icon
1. `cd app/`
2. `meteor add partup:iconfont-generator`
3. Add the new icon SVG to the */client/icons* folder, **dot not use this folder for anything else than the iconfont icons**
4. Name the icon svg file properly (upload icon should be named `upload.svg`, not `icon_upload.svg`, don't use a prefix like `icon_` for consistency)
5. Wait for `[iconfont] generating`
6. In */client/stylesheets/font-faces* a new `_picons.sass` is generated, NOTE: `_picons.sass` cannot be used to change icon styles, do this in */client/stylesheets/components/pu-icons.sass*
7. check in **all** supported browsers if icons still work, **especially IE**
8. `meteor remove partup:iconfont-generator`
9. You now have a new icon added to the project *cheers*. Push the icon file changes to your current branch.


# Backend
## Collections manipulation flow

- Frontend uses `Meteor.call` to insert, update or remove documents in a collection.
- Backend checks if the logged in user is authorised to perform the given operation (inside a Meteor method).
- Backend saves document in mongodb
- Backend emits an event that corresponds with the given CRUD operation, e.g. `inserted, updated or removed` (inside a Meteor method).
- Handlers are created that have to react to these created events, for instance when inserting an update or notification.

# Fixtures

- the following users are created automatically (all with password "user"):
    - user@example.com
    - john@example.com
    - judy@example.com
    - admin@example.com
- admin created all the tribes
- john is member of closed tribe and created a closed partup
- user is member of open and invite tribe and created a partups in these tribes
- judy is invited for closed tribe

# Unit / Integration tests

- disable tests
    - `cd app`
    - `meteor remove mike:mocha`
- enable tests
    - `cd app`
    - `meteor add mike:mocha`
    - `meteor add xolvio:cucumber`

# DevOps

## Quick deployment
- `cd devops`
- `./devops provision <environment> all --tags=app` (provide the SHA hash of the commit to be deployed, make sure it is build by Jenkins upfront)

## MongoDB

- Connecting: `mongo "<host>/<database>" -u "<user>" -p "<password>"`
- Dumping: `mongodump "<host>" --db "<database>" -u "<user>" -p "<password>" -o \`date +%s\``
- Restoring: `mongorestore "<host>" --db "<database>" -u "<user>" -p "<password>"`
- Restoring Meteor LoginServiceConfiguration: `mongorestore "<host>" --db "<database>" -u "<user>" -p "<password>" -c "meteor_accounts_loginServiceConfiguration" <bson file from dump>`
- Emptying all Collections (run in mongo shell): `db.getCollectionNames().forEach(function(collectionName) { db[collectionName].remove({}); });`
- Make user (super)admin: `db.users.update({ '_id': '<insertuseridhere>' }, { $set: { 'roles': ['admin'] } })`
- Find faulty / wrongly uploaded pictures: `db.getCollection('cfs.images.filerecord').find({'copies':{$exists:false}})`
- Overwrite the language of a specific part-up: `db.getCollection('partups').find({'_id':'<<partupid>>'},{$set: {'language':'nl'}});`

## Required server environment variables
```
NODE_ENV
MONGO_URL
ROOT_URL
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_BUCKET_REGION
AWS_BUCKET_NAME
FACEBOOK_APP_ID
FACEBOOK_APP_SECRET
LINKEDIN_API_KEY
LINKEDIN_SECRET_KEY
TZ = Europe/Amsterdam
MAIL_URL
FLICKR_API_KEY
FLICKR_SECRET_KEY
NEW_RELIC_LICENSE_KEY
NEW_RELIC_APP_NAME
NEW_RELIC_NO_CONFIG_FILE = true
KADIRA_APP_ID
KADIRA_APP_SECRET
METEOR_SETTINGS = {"public":{"analyticsSettings":{"Google Analytics":{"trackingId":""}}}}
GOOGLE_API_KEY
```

## data dumps

### clean userdump
- regular mongo dump command
- unpack bson `for f in *.bson; do bsondump "$f" > "$f.json"; done`
- `cat users.bson.json | sed 's/accessToken" : "[^"]*"/accessToken" : ""/g' > users.bson-clean.json`
- `cat users.bson-clean.json | sed 's/hashedToken" : "[^"]*"/hashedToken" : ""/g' > users.bson-clean-2.json`
- `cat users.bson-clean-2.json | sed 's/bcrypt" : "[^"]*"/bcrypt" : ""/g' > users.bson-clean-3.json`
- `cat users.bson-clean-3.json | sed 's/token" : "[^"]*"/token" : ""/g' > users.bson-clean-4.json`

## editing env.sh-ecrypted

`cd config/development && ansible-vault edit env.sh-encrypted`

## Phraseapp translation
```install Phraseapp CLI https://phraseapp.com/docs/developers/cli/installation/```

```npm install```

After all the node_modules deps are installed 
run 

``` npm run-script pull-translation ```

or 


``` npm run-script push-translation ```

and follow the prompt instruction

**ask [tlimpanont](http://github.com/tlimpanont) for the push & pull access_token** 

# License

Copyright (C) 2016 Part-up

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.

An interactive user interface displays "Appropriate Legal Notices" to the
extent that it includes a convenient and prominently visible feature
that (1) displays an appropriate copyright notice, and (2) tells the user
that there is no warranty for the work (except to the extent that warranties
are provided), that licensees may convey the work under this License, and
how to view a copy of this License. If the interface presents a list of user
commands or options, such as a menu, a prominent item in the list meets this
criterion.
