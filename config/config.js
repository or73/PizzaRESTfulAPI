/*
* Create and export configuration variables
* */

// General container for all the environments
let environments = {};
let config = {};



config.stripe       = {
	secret  : 'This key can not be shared, use your own key',
	apiVersion  : '2018-07-27',
};


config.mailgun      = {
	apiKey  : 'This key can not be shared, use your own key',
	domain  : 'This data can not be shared, use your own domain',
	emailFrom   : 'This email cannot be shared, user your own email',
	emailTo     : 'This email cannot be shared, user your own email',
	emailSubject: 'You can customize this message'
};


// Staging (default) environment
environments.staging = {
	'httpPort'  : 3000,
	'httpsPort' : 3001,
	'envName'   : 'staging',
	'hashingSecret' : 'thisIsASecret',
	'maxChecks' : 5,
	'templateGlobals'   : {
		'appName'   : 'PizzApp',
		'companyName'   : 'OR73, Inc.',
		'yearCreated'   : '2018',
		'baseUrl'   : `http://localhost:3000`
	},
};

// Production environment
environments.production = {
	'httpPort'  : 5000,
	'httpsPort' : 5001,
	'envName'   : 'production',
	'hashingSecret' : 'thisIsASecret',
	'maxChecks' : 5,
	'templateGlobals'   : {
		'appName'   : 'PizzApp',
		'companyName'   : 'OR73, Inc.',
		'yearCreated'   : '2018',
		'baseUrl'   : `http://localhost:5000`
	},
};

// Determine which environment was passed as a command-line argument
let currentEnvironment  = typeof process.env.NODE_ENV === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not, default to staging
let environment = typeof environments[ currentEnvironment ] === 'object' ? environments[ currentEnvironment ] : environments.staging;

// Export the module
module.exports  = {
	environment,
	config
};

/*
const apiKey        = _config.mailgun.apiKey;
const domain        = _config.mailgun.domain;
const stripe        = require( 'stripe' )( _config.stripe.secret );
stripe.setApiVersion= config.stripe.apiVersion;
* */
