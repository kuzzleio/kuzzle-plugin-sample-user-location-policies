# Sample "User location policies" plugin for Kuzzle

This plugin demonstrates how we can restrict read actions based on user location

## How it works

Let’s assume we have a feature which exposes contents from a [Kuzzle collection](https://docs.kuzzle.io/guide/essentials/persisted/), and we only want to make this contents available to users in France.

Let's assume our Kuzzle server is hosted behind a reverse proxy that is able to geolocalize the clients queries and add a header with the current user's country.

The plugin add pipes that listen to input requests on document controller and check the input headers to check if the user is allowed to access the contents.

## Install

Clone this repository locally and make it accessible from the `plugins/enabled` directory relative to the Kuzzle installation directory. A common practice is to put the code of the plugin in `plugins/available` and create a symbolic link to it in `plugins/enabled`.

**Note.** If you are running Kuzzle within a Docker container, you will need to mount the local plugin installation directory as a volume in the container.

Please refer to the Guide for further instructions on [how to install Kuzzle plugins](https://docs.kuzzle.io/guide/essentials/plugins/#how-to-install-plugin).

## How to use it

### setup a feature availability

Call the plugins's 'featureAvailability/set' action to setup restrictions on a features.
Sample HTTP query:
```
curl --request PUT \
  --url http://kuzzle:7512/_plugin/kuzzle-plugin-sample-user-location-policies/feature-availability/myindex/mycollection \
  --header 'content-type: application/json' \
  --data '{"zones": ["FRANCE"] }'
```

### show availabilities for a feature

Call the plugins's 'featureAvailability/get' action to setup restrictions on a features.
Sample HTTP query:
```
curl --request GET \
  --url http://kuzzle:7512/_plugin/kuzzle-plugin-sample-user-location-policies/feature-availability/myindex/mycollection?pretty=true
```

Response:
```
{
  "requestId": "20ecbcec-9210-4385-9083-c255a82b2981",
  "status": 200,
  "error": null,
  "controller": "kuzzle-plugin-sample-user-location-policies/featureAvailability",
  "action": "get",
  "collection": "mycollection",
  "index": "myindex",
  "volatile": null,
  "result": {
    "zones": [
      "FRANCE"
    ],
    "_id": "myindex/mycollection"
  }
}
```

### Test restrictions

While the availability setup is done, you can add contents to `myindex/mycollection` collection (using [document/write]() action), and then try to get contents, adding a HTTP header with the user zone

Sample queries:

```
# Allowed query
curl --request GET \
  --url http://kuzzle:7512/myindex/mycollection/AV6f3ptUipd9RiEqp_WY?pretty=true \
  --header 'zone: FRANCE'

# => response:
# {
#  "requestId": "9b00f4c6-96d3-4341-9dbb-13f8a10d009f",
#  "status": 200,
#  "error": null,
#  "controller": "document",
#  "action": "get",
#  "collection": "mycollection",
#  "index": "myindex",
#  "volatile": null,
#  "result": {
#    "_index": "myindex",
#    "_type": "mycollection",
#    "_id": "AV6f3ptUipd9RiEqp_WY",
#    "_version": 3,
#    "found": true,
#    "_source": {
#      "foo": "bar",
#      "createAt": 1505920725963
#    },
#    "_meta": {
#      "author": "-1",
#      "createdAt": 1522397080673,
#      "updatedAt": 1522397080673,
#      "updater": "-1",
#      "active": true,
#      "deletedAt": null
#    }
#  }
#}

# Denied query
curl --request GET \
  --url http://kuzzle:7512/myindex/mycollection/AV6f3ptUipd9RiEqp_WY?pretty=true \
  --header 'zone: GERMANY'

# => response:
#{
#  "requestId": "4bf7a1d3-fe00-4f1b-8637-660d3e5285a2",
#  "status": 401,
#  "error": {
#    "message": "Unauthorized action [document/get]: feature myindex/mycollection is not allowed in GERMANY",
#    "status": 401
#  },
#  "controller": "document",
#  "action": "get",
#  "collection": "mycollection",
#  "index": "myindex",
#  "volatile": null,
#  "result": null
#}
```
