/**
 * Sample plugin to demonstrate how we can restrict read actions based on user location
 *
 * This plugin:
 *   - stores configuration about features available in restricted areas into the plugin's repository
 *   - adds plugin controller actions to manage the feature availabilities
 *   - adds a trigger before read actions to restrict access to users located in the good areas
 *
 * @see http://docs.kuzzle.io/plugins-reference for more info about Kuzzle plugins
 * @see https://github.com/kuzzleio/kuzzle-core-plugin-boilerplate for full plugin sample
 */
class UserLocationPlugin {
  constructor () {
    this.context = null;
    this.config = {};

    /**
     * hook each get/search actions to checkFeatureAvailability trigger
     */
    this.pipes = {
      'document:beforeCount': 'checkFeatureAvailability',
      'document:beforeGet': 'checkFeatureAvailability',
      'document:beforeMGet': 'checkFeatureAvailability',
      'document:beforeScroll': 'checkFeatureAvailability',
      'document:beforeSearch': 'checkFeatureAvailability'
    };

    /**
     * controller to manage featureAvailability
     */
    this.controllers = {
      'featureAvailability': {
        'get': 'getAvailability',
        'set': 'setAvailability'
      }
    };
    this.routes = [
      {verb: 'get', url: '/feature-availability/:index/:collection', controller: 'featureAvailability', action: 'get'},
      {verb: 'put', url: '/feature-availability/:index/:collection', controller: 'featureAvailability', action: 'set'}
    ];
  }

  /**
   * Initializes the plugin with configuration and context.
   *
   * @param {Object} customConfig The custom configuration passed to the plugin
   *                               via the Kuzzle configuration overriding the defaultConfig.
   * @param {Object} context A restricted gateway to the Kuzzle API
   *
   */
  init (customConfig, context) {
    this.config = Object.assign(this.config, customConfig);
    this.context = context;

    // Initialize the plugin repository to store feature availabilities
    this.availabilityRepository = new context.constructors.Repository('feature_availability');
  }

  /**
   * Check is the user is allowed to access the current collection (ie. feature)
   *
   * @param {Request} request The request that triggered the event
   * @param {Function} callback The callback that bears the result of the
   *                            function. Signature: `callback(error, request)`
  */
  checkFeatureAvailability (request, callback) {
    return this.availabilityRepository.get(`${request.input.resource.index}/${request.input.resource.collection}`)
      .then(availability => {
        if (availability) {
          // availability found in the plugin storage => means that there are restrictions on the collection
          // we check the user's zone from the input headers and deny the request if the zone not match
          if (request.input.headers.zone === undefined) {
            const message = `Unauthorized action [${request.input.controller}/${request.input.action}]: feature ${request.input.resource.index}/${request.input.resource.collection} is area restricted`;
            return callback(new this.context.errors.UnauthorizedError(message), request);
          }
          if (availability.zones.indexOf(request.input.headers.zone) === -1) {
            const message = `Unauthorized action [${request.input.controller}/${request.input.action}]: feature ${request.input.resource.index}/${request.input.resource.collection} is not allowed in ${request.input.headers.zone}`;
            return callback(new this.context.errors.UnauthorizedError(message), request);
          }
        }

        // if the availability is not found in the plugin storage (means that there ar no restrictions on the collection),
        // or if the user belong to the allowed area,
        // we accept the request => hook to the next step of processRequest without altering the request.
        callback(null, request);
      })
      .catch(error => callback(error, request));
  }


  /**
   * Get a feature availability settings
   *
   * @param {Request} request The request sent to the controller/action route
   *
   * @return {Promise} A promise resolving the response of the route.
   */
  getAvailability (request) {
    return this.availabilityRepository.get(`${request.input.resource.index}/${request.input.resource.collection}`);
  }

  /**
   * create/replace a feature availability
   *
   * @param {Request} request The request sent to the controller/action route
   *
   * @return {Promise} A promise resolving the response of the route.
   */
  setAvailability (request) {
    const body = request.input.body;

    body._id = `${request.input.resource.index}/${request.input.resource.collection}`;

    return this.availabilityRepository.createOrReplace(body);
  }
}

module.exports = UserLocationPlugin;
