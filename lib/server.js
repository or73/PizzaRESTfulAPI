/*
* Server-related tasks
* */

// Dependencies
const Promise = require( 'bluebird' );
const _fs     = Promise.promisifyAll( require( 'fs' ) );
const _http   = require( 'http' );
const _https  = require( 'https' );
const _path   = require( 'path' );
const _stringDecoder   = require( 'string_decoder' ).StringDecoder;
const _url    = require( 'url' );
const _util   = require( 'util' );
const enfsensure = require("enfsensure-promise");

const {
	environment
} = require( '../config/config' );
const {
	_allValidEntities,
	_routes,
	_isValidRequest
}             = require( '../routes/router' );

const {
	_selectContentType,
	_parseJsonToObject,
	_validateNumber,
	_validateObject,
	_validateObjectEmpty,
	_validateString
}              = require( '../services/helpers' );

const debug  = _util.debuglog( 'server' );

// Instantiate the server module object
let server  = {};

// Constants & Variables
const HTTP_PORT   = environment.httpPort;
const HTTPS_PORT  = environment.httpsPort;
const MODE        = environment.envName;
// Base directory of the data folder
const baseDir     = _path.join( __dirname, '/../.data' );

// Validate if entities folders exist, if not all must be created
server.createEntities   = async entities => {
	console.log( '[ server.createEntities ] createEntities START' );
	entities.unshift( '.data' );
	for ( let counter = 0; counter < entities.length; counter++ ) {
		let dirName   = entities[ counter ];
		let dirPath   = `${ baseDir }/${ dirName }`;
		if ( dirName === '.data' ) {
			dirPath = `${ _path.join( __dirname, '/../' ) }/${ dirName }`;
		}
		
		await enfsensure.ensureDirP( dirPath )
			.then( path => {
				console.log( `[ server.createEntities ] Validate folder, if it does not exist then is created ${ dirName }` );
			} );
	}
};

// Instantiate the HTTP Server
server.httpServer   = _http.createServer( ( req, res ) => {
	server.unifiedServer( req, res );
} );

// Instantiate the HTTPS Server
server.httpsServerOptions   = {
	'key'   : _fs.readFileSync( _path.join( __dirname, '/./https/key.pem' ) ),
	'cert'  : _fs.readFileSync( _path.join( __dirname, '/./https/cert.pem' ) ),
};

server.httpsServer   = _https.createServer( server.httpsServerOptions, ( req, res ) => {
	server.unifiedServer( req, res );
} );

// All the server logic for both the HTTP a& HTTPS servers
server.unifiedServer   = ( req, res ) => {
	console.log( '[server.unifiedServer ] - unifiedServer START' );
	// Get the URL and parse it
	const parsedUrl   = _url.parse( req.url, true );
	// Get the path from the URL
	const path   = parsedUrl.pathname;
	const trimmedPath   =  path.replace( /^\/+|\/+$/g, '' );
	// Get the query string as an object
	const queryStringObject   = parsedUrl.query;
	// Get the HTTP method
	const method   = req.method.toLowerCase();
	//Get the headers as an object
	const headers  = req.headers;
	// Get the payload, if any
	const decoder  = new _stringDecoder( 'utf-8' );
	let buffer     = '';
	
	req.on( 'data', data => {
		buffer += decoder.write( data );
	} );
	
	req.on( 'end', async () => {
		buffer += decoder.end();
		// Choose the handler this request should go to.   If one is not found, user the notFound handler
		// let chosenHandler   = typeof server.router[ trimmedPath ] !== 'undefined' ? server.router[ trimmedPath ] : _notFound;
		console.log( '[ server.unifiedServer ] - trimmedPath: ', trimmedPath );
		console.log( '[ server.unifiedServer ] - method: ', method );
		if ( await _isValidRequest( trimmedPath, method ) ) {
			console.log( '[ server.unifiedServer ] a validRequest method was provided: ', method );
			let chosenHandler = await _routes[trimmedPath] !== 'undefined' ? _routes[trimmedPath] : _routes._notFound;
			// If the request is within the public directory, user the public handler instead
			// chosenHandler   = trimmedPath.indexOf( 'public/' ) > -1 ? _public : chosenHandler;
			chosenHandler = trimmedPath.indexOf('public/') > -1 ? _routes._public : chosenHandler;
			console.log( '[ server.unifiedServer ] - 111 ' );
			// Construct the data object to send to the handler
			const data = {
				trimmedPath,
				queryStringObject,
				method,
				headers,
				'payload': _parseJsonToObject( buffer )
			};
			console.log( '[ server.unifiedServer ] - data: ', data );
			console.log( '[ server.unifiedServer ] - 222 ' );
			console.log( `[ server.unifiedServer ] - chosenHandler ${ trimmedPath } -> `, chosenHandler );
			// Route the request to the handler specified in the router
			const chosenHandlerData   = await chosenHandler[ method ]( data );
			console.log( '[ server.unifiedServer ] - 333 ' );
			console.log( '[ server.unifiedServer ] - chosenHandlerData ', chosenHandlerData );
			// 	// Determine the type of response (fallback to JSON)
			const contentType = await _validateString( chosenHandlerData.ContentType) ? chosenHandlerData.ContentType : 'json';
			console.log( '[ server.unifiedServer ] - 444 - contentType: ', contentType );
			const statusCode   = await _validateNumber( chosenHandlerData.StatusCode ) ? chosenHandlerData.StatusCode : 200;
			console.log( '[ server.unifiedServer ] - 555 - StatusCode: ', statusCode );
			const dataToSend   = await _validateObject( chosenHandlerData.data ) && !_validateObjectEmpty( chosenHandlerData.data ) ? chosenHandlerData.data : chosenHandlerData;
			const cTypePayload = await _selectContentType( contentType, dataToSend );
			console.log( '[ server.unifiedServer ] - 666 - cTypePayload: ', cTypePayload );
			res.setHeader( 'Content-Type', cTypePayload.contentType );
			res.writeHead( statusCode );
			res.end( cTypePayload.payloadString );
			// Log the request path
			// If the response is 200, print green, otherwise print red
			if (statusCode === 200 || statusCode === 201) {
				//debug( `Returning this response: \n\t statusCode: ${ statusCode } \n\t Payload: ${ payloadString }` );
				debug('\x1b[32m%s]\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
			} else {
				debug('\x1b[31m%s]\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
			}
		} else {
			res.writeHead( 500 );
			res.end( '' );
		}
	} );
};

// Init script
server.init   = () => {
	// Validate if entities folders exist, if not then each one is created
	console.log( '[ server.init ] createEntities ' );
	server.createEntities( _allValidEntities )
		.then( () => { return true; } );
	// Start the HTTP server, and have it listening on some port 3000 --> staging   5000 --> production
	server.httpServer.listen( HTTP_PORT, () => {
		console.log( '\x1b[36m%s\x1b[0m', `The server is listening on <http port>: ${ HTTP_PORT } in -> ${ MODE.toUpperCase() } <- mode` );
	} );
	
	// Start the HTTPS server, and have it listening on some port 3000 --> staging   5000 --> production
	server.httpsServer.listen( HTTPS_PORT, function () {
		console.log( '\x1b[35m%s\x1b[0m', `The server is listening on <https port>: ${ HTTPS_PORT } in -> ${ MODE.toUpperCase() } <- mode` );
	} );
};

// Export the module
module.exports   = server;
