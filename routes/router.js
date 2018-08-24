const {
	_accountCreate,
	_accountEdit,
	_accountDelete,
	_checks,
	_checksCreate,
	_checksEdit,
	_checksList,
	_favicon,
	_index,
	_menus,
	_orders,
	_ping,
	_notFound,
	_public,
	_sessionCreate,
	_sessionDelete,
	_carts,
	_users,
	_tokens,
}   = require( '../core/handlers' );

const {
	_validateString,
	_validateValueInArray
}   = require( '../services/helpers' );

/*
* server.router
* Define a request route
* ping   : handlers.ping
* users  : handlers.users
* tokens : handlers.tokens
* checks : handlers.checks
* */
router   = {};

/*
* Valid request
* */
const validRequests   = [
	{
		path   : 'carts',
		methods: [ 'delete', 'get', 'post', 'put' ]
	}, {
		path   : 'menus',
		methods: [ 'delete', 'get', 'post', 'put' ]
	}, {
		path   : 'orders',
		methods: [ 'delete', 'get', 'post' ]
	}, {
		path   : 'tokens',
		methods: [ 'delete', 'get', 'post', 'put' ]
	}, {
		path   : 'users',
		methods: [ 'delete', 'get', 'post', 'put' ]
	}
];

router._allValidEntities   = validRequests.map( req => req.path );

router._isValidRequest   = async ( path, method ) => {
	path   = _validateString( path ) ? path.toLowerCase() : false;
	method = _validateString( method ) ? method.toLowerCase() : false;
	return  _validateValueInArray( path, router._allValidEntities ) ? validRequests.find( req => req.path === path).methods.includes( method ) : false;
};

router._routes   = {
	''                 : _index,
	'account/create'   : _accountCreate,
	'account/edit'     : _accountEdit,
	'account/deleted'  : _accountDelete,
	'carts'            : _carts,
	'checks'           : _checks,
	'checks/all'       : _checksList,
	'checks/create'    : _checksCreate,
	'checks/edit'      : _checksEdit,
	'favicon.ico'      : _favicon,
	'menus'            : _menus,
	'notFound'         : _notFound,
	'orders'           : _orders,
	'ping'             : _ping,
	'public'           : _public,
	'session/create'   : _sessionCreate,
	'session/deleted'  : _sessionDelete,
	'tokens'           : _tokens,
	'users'            : _users,
};

module.exports   = router;
