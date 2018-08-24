/*
* Helpers for various tasks
* */

// Dependencies
const _crypto   = require( 'crypto' );
const Promise   = require( 'bluebird' );

const _fs       = Promise.promisifyAll( require( 'fs' ) );
const _path     = require( 'path' );
const _isEmail  = require( 'isemail' );
const revHash = require('rev-hash');

const _config   = require( '../config/config' );

const baseDir   = _path.join( __dirname, '/../.data' );

// Container for all the helpers
let helpers   = {};

// Add the universal header and footer to a string, and pass provided data object to the header and footer for interpolation
helpers._addUniversalTemplates   = ( str, data ) => {
	str   = helpers._validateString( str ) ? str : '';
	data  = helpers._validateObject( data ) ? data : {};
	let header   = {};
	let toReturn   = {};
	// Get the header
	const getTemplateMsg1   = helpers._getTemplate( '_header', data );
	
	helpers._validateStatusCode( getTemplateMsg1.StatusCode )
		.then( () => {
			header   = getTemplateMsg1.data;
			return helpers._getTemplate( '_footer', data );
		} )
		.then( getTemplateMsg2 => {
			helpers._validateStatusCode( getTemplateMsg2.StatusCode );
			return getTemplateMsg2.data;
		} )
		.catch( error => {
			toReturn   = helpers._responseTemplate( 404, `ERROR: [ helpers._addUniversalTemplates ] Could not find the footer template- ERROR - ${ err.message }`, {} );
		} )
		.then( footer => {
			const fullString   = header + str + footer;
			toReturn   = helpers._responseTemplate( 201, 'Web page has been joined successfully', fullString );
		} )
		.catch( error => {
			toReturn   = helpers._responseTemplate( 404, `ERROR: [ helpers._addUniversalTemplates ] Could not find the header template- ERROR - ${ err.message }`, {} );
		} );
	return toReturn;
};
// helpers._addUniversalTemplates   =  ( str, data, callback ) => {
// 	str   = helpers._validateString( str ) ? str : '';
// 	data  = helpers._validateObject( data ) ? data : {};
//
// 	// Get the header
// 	helpers._getTemplate( '_header', data, ( err, headerString ) => {
// 		if ( !error && headerString ) {
// 			// Get the footer
// 			helpers._getTemplate( '_footer', data, ( err, footerString ) => {
// 				if ( !error && footerString ) {
// 					// Add all together
// 					const fullString   = headerString + str + footerString;
// 					callback( data, fullString );
// 				} else {
// 					callback( 'Could not find the footer template' );
// 				}
// 			} );
// 		} else {
// 			callback( 'Could not find the header template' );
// 		}
// 	} );
// };

// Create a new data/time format
helpers._createDateFormat  =  dateTime => {
	const tokenDataDate  = new Date( dateTime );
	const tokenDataExp  = `${ tokenDataDate.getFullYear() }/${ tokenDataDate.getMonth() + 1 }/${ tokenDataDate.getDate() }  ${ tokenDataDate.getHours() }:${ tokenDataDate.getMinutes() }:${ tokenDataDate.getSeconds()}`;
	return tokenDataExp;
};

// Create a SHA256 hash
helpers._createHash   =  str => {
	if ( helpers._validateString( str ) ) {
		return  _crypto.createHmac( 'sha256', _config.hashingSecret ).update( str ).digest( 'hex' );
	}
	return false;
};

// Create encrypted fileName
helpers._createFileEncrypted   = fileName => {
	console.log( '[ helpers._createFileEncrypted ] - fileName: ', fileName );
	return revHash( fileName );
};

// Create web message - HTML
helpers._createHTMLMessage = orderObj => {
	console.log( '[ helpers ] - orderObj: ', orderObj );
	let htmlMessage   = `<html>`;
	htmlMessage += `<body style="background-color: #f6f6f6;"> `;
	htmlMessage += `<main style="margin-top: 35px;"> `;
	htmlMessage += `</br></br></br> `;
	htmlMessage += `<div style="text-align: center;"> `;
	htmlMessage += `<h1>Total: $ ${ helpers.currencyFormatted( orderObj.total ) } Paid</h1> `;
	htmlMessage += `<h2>Thanks for using or73 Inc.</h2> `;
	htmlMessage += `</div> `;
	htmlMessage += `</br></br></br>`;
	htmlMessage += `<div align="center"> `;
	htmlMessage += `<table style="max-width: 100%"> `;
	htmlMessage += `<tbody> `;
	htmlMessage += `<tr><td><strong>Order Id</strong>:</td><td></td><td>${ orderObj.shoppingCartId}</td></tr> `;
	htmlMessage += `<tr><td><strong>Invoice</strong>:</td><td></td><td>${ orderObj.id }</td> </tr> `;
	htmlMessage += `<tr><td><strong>Authorization Date</strong>:<td></td></td><td>${ orderObj.authorizationDate}</td></tr> `;
	htmlMessage += `<tr><td><strong>currency</strong>:</td><td>${ orderObj.currency }</td></tr>`;
	htmlMessage += `<tr><td><strong>Payment Method</strong>:</td><td>${ orderObj.paymentMethod } - ${ orderObj.object }</td></tr>`;
	htmlMessage += `<tr><td><strong>Last 4 Digits</strong>:</td><td>${ orderObj.last4 }</td></tr>`;
	htmlMessage += `<tr><td><strong>Name</strong>:</td><td>${ orderObj.customer }</td></tr>`;
	htmlMessage += `<tr><td><strong>E-mail</strong>:</td><td>${ orderObj.email }</td></tr>`;
	htmlMessage += `</tbody> `;
	htmlMessage += `</table> `;
	htmlMessage += `</div> `;
	htmlMessage += `</br></br></br> `;
	htmlMessage += `<div align="center"> `;
	htmlMessage += `<table style="white-space: nowrap; max-width: 90%"> `;
	htmlMessage += `<thead style="text-align: center"> `;
	htmlMessage += `<tr><th>Product</th><th>Price</th><th>Qtty</th><th>Total</th></tr> `;
	htmlMessage += `</thead> `;
	htmlMessage += `<tbody style="text-align: left"> `;
	
	const items = orderObj.items;
	items.forEach( item => {
		htmlMessage   += `<tr> `;
		htmlMessage   += `<td style="padding: 0 .5em;">${ item.name }</td> `;
		htmlMessage   += `<td style="text-align: right; padding: 0 1em;">$ ${ helpers.currencyFormatted( item.price ) }</td> `;
		htmlMessage   += `<td style="text-align: center; padding: 0 1em;">${ item.amount }</td> `;
		htmlMessage   += `<td style="padding: 0 1em; text-align: right;">$ ${ helpers.currencyFormatted( item.totalItem ) }</td> `;
		htmlMessage   += `</tr> `;
	} );
	
	htmlMessage += `</tbody> `;
	htmlMessage += `<tfoot style="text-align: right"> `;
	htmlMessage += `<tr style="height: 3px;"></tr> `;
	htmlMessage += `<tr><td colspan="3"></td><td style="border-top: 3px double black"></td></tr> `;
	htmlMessage += `<tr style="height: 3px"></tr>`;
	htmlMessage += `<tr style="border-top: 2px solid #333;"> `;
	htmlMessage += `<td style="text-align: right;" colspan="3"><strong>Total</strong></td> `;
	htmlMessage += `<td style="text-align: right; padding: 0 1em;"><strong>$ ${ helpers.currencyFormatted( orderObj.total ) }</strong></td> `;
	htmlMessage += `</tr> `;
	htmlMessage += `</tfoot> `;
	htmlMessage += `</table> `;
	htmlMessage += `</div> `;
	htmlMessage += `</br></br> `;
	htmlMessage += `<div style="text-align: center"> `;
	htmlMessage += `<h4>or73 Inc. 123 Some Place, The World 123456</h4> `;
	htmlMessage += `<footer> `;
	htmlMessage += `Questions? Email <a href="mailto:">support@or73.inc</a> `;
	htmlMessage += `</footer> `;
	htmlMessage += `</div> `;
	htmlMessage += `</br></br> `;
	htmlMessage += `</main> `;
	htmlMessage += `</body> `;
	htmlMessage += `</html> `;
	return htmlMessage;
};

// Modify currency format to print the value
helpers.currencyFormatted   = amount => {
	let i = parseFloat( amount );
	if ( isNaN ( i ) ) { i = 0.00; }
	let minus = '';
	if( i < 0 ) { minus = '-'; }
	i = Math.abs( i );
	i = parseInt( ( i + .005 ) * 100 );
	i = i / 100;
	let s = String( i );
	if( s.indexOf('.') < 0) { s += '.00'; }
	if( s.indexOf('.') === ( s.length - 2 ) ) { s += '0'; }
	s = minus + s;
	let splitS = s.split( '.' );
	s   = splitS[ 0 ] + `.<small> ${ splitS[ 1 ] } </small>`;
	return s;
}

// Create random string
helpers._createRandomString   =  strLength  => {
	// Start the final string
	let str   = false;
	if ( helpers._validateNumber( strLength ) ) {
		str   = '';
		// Define all the possible characters that could go into a string
		const possibleCharacters   = '1234567890abcdefghijklmnopqrstwxyz';
		
		for ( let i = 0; i < strLength; i++ ) {
			// Get a random character from the possible Characters string
			let randomCharacter   = possibleCharacters.charAt( Math.floor( Math.random() * possibleCharacters.length ) );
			// Append this character to the final string
			str += randomCharacter;
		}
	}
	return str;
};

// Get the contents of a static (public) asset
helpers._getStaticAsset   =  ( fileName, callback ) => {
	fileName   = helpers._validateString( fileName ) ? fileName : false;
	
	if ( fileName ) {
		const publicDir   = _path.join( __dirname, '/../public/' );
		_fs.readFile( `${ publicDir }/${ fileName }`, ( err, data ) => {
			if ( !error && data ) {
				callback( false, data );
			} else {
				callback( 'No file could be found' );
			}
		} );
	} else {
		callback( 'A valid file name was not specified' );
	}
};

// Get the string content of a template
helpers._getTemplate   = ( templateName, data ) => {
	templateName   = helpers._validateString( templateName ) ? templateName : false;
	data   = helpers._validateObject( data ) ? data : {};
	
	if ( templateName ) {
		const templatesDir  = _path.join( __dirname, '/../templates/' );
		const readData   = helpers._getTemplateRead( `${ templatesDir }/${ templateName }.html` );
		let toReturn   = {};
		helpers._validateStatusCodeRead( readData.StatusCode )
			.then( () => toReturn   = helpers._interpolate( readData.data, data ) )   // Do interpolation on the string
			.catch( error => {
				toReturn   = helpers._responseTemplate( 404, `[ helpers.getTemplate ] No such file of directory - ERROR: ${ err.message }`, {} );
			} );
	} else {
		return helpers._responseTemplate( 404, '[ helpers.getTemplate ] Invalid templateName was provided');
	}
};
// helpers._getTemplate   =  ( templateName, data, callback ) => {
// 	templateName   = helpers._validateString( templateName ) ? templateName : false;
// 	data   = helpers._validateObject( data ) ? data : {};
//
// 	if ( templateName ) {
// 		const templatesDir   = _path.join( __dirname, '/../templates/' );
// 		_fs.readFile( `${ templatesDir }/${ templateName }.html`, 'utf8', ( err, str ) => {
// 			if ( !error && helpers._validateString( str ) ) {
// 				// Do interpolation on the string
// 				const finalString   = helpers._interpolate( str, data );
// 				callback( false, finalString );
// 			}
// 		} );
// 	}  else {
// 		callback( 'A valid template name was not specified' );
// 	}
// };

helpers._getTemplateRead   = async filePath => {
	console.log( '[ helpers._getTemplateRead ] - getTemplateRead START' );
	let toReturn   = {};
	
	await _fs.readFileAsync( filePath, 'utf8' )
		.then( val => {
			helpers._validateString( val );
			return val;
		} )
		.catch( error => {
			console.log("[ data._read ] Fetched data is not a valid string, ERROR: ", err.message );
			toReturn   = helpers._responseTemplate( err.statusCode || 400, `Unable to read JSON file, fetched data is not a valid string - Error: ${ err.message }` );
		} )
		.then( val => {
			toReturn = helpers._responseTemplate(200, 'File fetched successfully', val );
		} )
		.catch( error => {
			console.log("[ data._read ] Unable to read a file, ERROR: ", err.message );
			toReturn   = helpers._responseTemplate( err.statusCode || 400, `Unable to read JSON file - Error: ${ err.message }` );
		} );
	console.log("[ data._read ] toReturn: ", toReturn );
	return toReturn;
};
/*
lib._read   = async ( dirName, fileName ) => {
	console.log( '[ data._read ] data.read START ' );
	const filePath   = `${ lib.baseDir }/${ dirName }/${ fileName }.json`;
	let toReturn   = {};
	await _fs.readFileAsync( filePath, 'utf8' )
		.then( val => {
			console.log('[ data._read ] - val: ', val );
			console.log( '[ data._read ] - File data fetched successfully ');
			toReturn   = _responseTemplate( 200, 'File fetched successfully', _parseJsonToObject( val ) );
		} )
		.catch( error => {
			console.log("[ data._read ] Unable to read a file, ERROR: ", err.message );
			toReturn   = _responseTemplate( err.statusCode || 400, `Unable to read JSON file - Error: ${ err.message }` );
		});
	console.log("[ data._read ] toReturn: ", toReturn );
	return toReturn;
};
* */


// Take a given string and a data Object, and find/replace all the keys within it
helpers._interpolate   =  ( str, data ) => {
	str   = helpers._validateString( str ) ? str : '';
	data  = helpers._validateObject( data ) ? data : {};
	
	// Add the templateGlobals to the data object, prepending their key name with 'global'
	for ( let keyName in _config.templateGlobals ) {
		if ( _config.templateGlobals.hasOwnProperty( keyName ) ) {
			data[ 'global.' + keyName ]   = _config.templateGlobals[ keyName ];
		}
	}
	
	// For each key in the data Object, insert its value into the string at the corresponding placeholder
	for ( let key in data ) {
		if ( data.hasOwnProperty( key ) && helpers._validateString( data[ key ] ) ) {
			let replace   = data[ key ];
			let find      = '{' + key + '}';
			str   = str.replace( find, replace );
		}
	}
	return str;
};

// Parse a JSON string to an Object in all cases, without throwing
helpers._parseJsonToObject   =  str => {
	// return Promise.resolve( str ).then( JSON.parse ).catch( error => { return false; } );
	try {
		return JSON.parse( str );
	} catch ( e ) {
		return {};
	}
};

// Parse a JSON object to an string in all cases, without throwing
helpers._parseObjectToJson   =  obj => {
	return JSON.stringify( obj );
};

helpers._responseTemplate   =  ( StatusCode = 400, message = '', data = {}, ContentType = 'json' ) => {
	return { StatusCode, message, data, ContentType};
};

// Choose Content-Type
helpers._selectContentType   =  ( cType, payload ) => {
	console.log( '[ helpers._selectContentType ] - cType: ', cType );
	console.log( '[ helpers._selectContentType ] - payload: ', payload );
	return new Promise( ( resolve, reject ) => {
		if ( cType ) {
			console.log( '[ helpers._selectContentType ] - cType: ', cType );
			let toReturn   = { payloadString: '', contentType: '' };
			// let payloadString   = '';
			let payLoadAux      = null;
			// let contentType   = '';
			
			switch ( cType ) {
				case 'html':
					toReturn.contentType   = 'text/html';
					toReturn.payloadString = typeof payload === 'string' ? payload : '';
					break;
				case 'favicon':
					toReturn.contentType   = 'image/x-icon';
					toReturn.payloadString = typeof payload !== 'undefined' ? payload : '';
					break;
				case 'plain':
					toReturn.contentType   = 'text/plain';
					toReturn.payloadString = typeof payload !== 'undefined' ? payload : '';
					break;
				case 'css':
					toReturn.contentType   = 'text/css';
					toReturn.payloadString = typeof payload !== 'undefined' ? payload : '';
					break;
				case 'jpg':
					toReturn.contentType   = 'image/jpeg';
					toReturn.payloadString = typeof payload !== 'undefined' ? payload : '';
					break;
				case 'png':
					toReturn.contentType   = 'image/png';
					toReturn.payloadString = typeof payload !== 'undefined' ? payload : '';
					break;
				case 'jpg':
					toReturn.contentType   = 'image/jpeg';
					toReturn.payloadString = typeof payload !== 'undefined' ? payload : '';
					break;
				default:    // 'json' is default value
					toReturn.contentType   = 'application/json';
					// use the payload called back by the handler, or default to an empty object
					payLoadAux	= typeof payload === 'object' ? payload : {};
					// Convert the payload to a string
					toReturn.payloadString	= JSON.stringify( payLoadAux );
					break;
			}
			resolve( toReturn );
		} else {
			reject( helpers._responseTemplate( 400, 'No Content-Type has been provided', {} ) );
		}
	} );
};

// Validates if the object provided is an array
helpers._validateArray    =  arr => {
	return typeof arr instanceof Array && value.constructor === Array;
	// return ( typeof arr instanceof Array );
};

// Validates if the object provided is a boolean
helpers._validateBoolean   =  bool => {
	return typeof bool === 'boolean';
	// return typeof bool === 'boolean';
};

// Validates if provided value is a valid date
helpers._validateDate   = value => {
	// return !isNaN( Date.parse( value ) );
	return !isNaN( Date.parse( value ) ) && value instanceof Date;
};

// Validates if the object provided is a valid email
helpers._validateEmail   = email => {
	return _isEmail.validate( email );
};

// Validates if two objects have equal fields values
helpers._validateEmailUser = ( obj1, obj2 ) => {
	// return ( obj1.email === obj2.email && obj1.password === obj2.password );
	return ( obj1.email === obj2.email && obj1.password === obj2.password );
};

// Validate if file exist
helpers._validateFileExist   = ( dirName, fileName ) => {
	const filePath   = `${ baseDir }/${ dirName }/${ fileName }.json`;
	console.log( '[ helpers.fileExist ] - filePath: ', filePath );
	return new Promise( ( resolve, reject ) => {
		if ( _fs.existsSync( filePath ) ) resolve( true );
		else reject( false );
	} );
};

// Validate if file does not exist
helpers._validateFileDontExist   = async ( dirName, fileName ) => {
	const filePath   = `${ baseDir }/${ dirName }/${ fileName }.json`;
	console.log( '[ helpers.fileDontExist ] - filePath: ', filePath );
	return new Promise( ( resolve, reject ) => {
		if ( _fs.existsSync( filePath ) ) reject( 'File already exist' );
		else resolve( 'File do not exist' );
	} );
};

// Validates if the object provided is a float number
helpers._validateFloatNumber   =  num => {
	return Number( num ) === num || num % 1 !== 0 || num % 1 === 0;
};

// Validates if the object provided is a number
helpers._validateNumber   =  num => {
	return typeof num === 'number' && num >= 0 && isFinite( num );
	// return ( typeof num === 'number' && num > 0 );
};

// Validates if the object provided is an object
helpers._validateObject   =  obj => {
	return obj && typeof obj === 'object' && obj !== null;
	// return ( typeof obj === 'object' && obj !== null );
};

// Validates if an object is empty
helpers._validateObjectEmpty   = obj => {
	return new Promise( (resolve, reject) => {
		for ( let key in obj ) {
			if ( obj.hasOwnProperty( key ) ) resolve( 'Empty object' );
		}
		reject( true );
	} );
};

// Validates if status code is 200 or 201
helpers._validateStatusCode   = statusCode => {
	console.log( '[ helpers._validateStatusCode ] - statusCode: ', statusCode );
	console.log( '[ helpers._validateStatusCode ] - typeof statusCode: ', typeof statusCode );
	// return ( statusCode === 200 || statusCode === 201 );
	return new Promise( (resolve, reject) => {
		if ( statusCode === 200 || statusCode === 201 ) resolve( true );
		else reject( `Status Code provided is not successful ${ statusCode }` );
	} );
};

// Validates if status code is !===200 or !===201
helpers._validateStatusCodeRead   = statusCode => {
	console.log( '[ helpers._validateStatusCode ] - statusCode: ', statusCode );
	console.log( '[ helpers._validateStatusCode ] - typeof statusCode: ', typeof statusCode );
	// return ( statusCode === 200 || statusCode === 201 );
	return new Promise( (resolve, reject) => {
		if ( statusCode !== 200 && statusCode !== 201 ) resolve( true );
		else reject( `Provided Status Code is a success code ${ statusCode }` );
	} );
};

// Validates if the object provided is an string
helpers._validateString   =  str => {
	return ( typeof str === 'string' && str.trim().length > 0 );
	// return ( typeof str === 'string' && str.trim().length > 0 );
};

// Validates if a token is not expired
helpers._validateTokenExpires   = ( tokenObj, email ) => {
	console.log( '[ helpers._validateTokenExpires ] - validateTokenExpires START' );
	return new Promise( (resolve, reject) => {
		if ( ( tokenObj.email === email && tokenObj.expires > Date.now() ) ) { resolve( 'Token valid' ); }
		// else reject( 'Expired and invalid token' );
		else reject( 'Invalid or expired token has been provided' )
	} );
};

// Validates if an array contains a provided value
helpers._validateValueInArray   =  ( value, dataArray ) => {
	return new Promise ( ( resolve, reject ) => {
		if ( dataArray.includes( value ) ) resolve( true );
		else reject( Error( 'Invalid token has been provided' ) );
	});
};

// Validates if an array does not contain a provided value
helpers._validateValueNotInArray   =  ( value, dataArray ) => {
	return new Promise ( ( resolve, reject ) => {
		if ( dataArray.includes( value ) ) reject( 'Provided value exists in provided array' );
		else resolve( true );
	});
};

// Validates if objects contains the same keys and its values are equal
helpers._validateValuesChange   = ( currentObjData, newObjData ) => {
	console.log( '[ helpers._validateValuesChange ] validateValuesChange START' );
	return new Promise( (resolve, reject) => {
		// Validates if both provided elements are objects
		if ( helpers._validateObject( newObjData ) && helpers._validateObject( currentObjData ) ) {
			// Objects keys, and sorted array of keys
			const currentObjProps = Object.getOwnPropertyNames( newObjData ).sort();
			const newObjProps = Object.getOwnPropertyNames( currentObjData ).sort();
			// Validates if keys are equal in both objects
			if ( currentObjProps.length !== newObjProps.length ||
				helpers._parseObjectToJson( currentObjProps ) !== helpers._parseObjectToJson( newObjProps ) ) {
				reject( helpers._responseTemplate( 404, '[ helpers._validateValuesChange ] - Wrong data information provided, different keys in objects' ) );
			} else {
				let counter   = 0;
				// Make a comparison of each key-value pair on each object
				for (let i = 0; i < currentObjProps.length; i++) {
					// If values of same property are not equal, objects are not equivalent
					let obj1PropName = currentObjProps[ i ];
					let obj2PropName = newObjProps[ i ];
					// Compares if values, of similar keys, are different
					if (currentObjData[obj1PropName] !== newObjData[obj2PropName] &&
						newObjData[obj2PropName] !== false) {
						currentObjData[obj1PropName] = newObjData[obj2PropName];
						counter++;
					}
				}
				if ( counter > 0 ) resolve( helpers._responseTemplate( 200,'Values validated', currentObjData) );
				else reject( helpers._responseTemplate( 404, '[ helpers._validateValuesChange ] Update was not possible, none new fields information was provided', {} ) );
			}
		} else reject( helpers._responseTemplate( 404, '[ helpers._validateValuesChange ] - Wrong data information was provided' ) );
	} );
};

// Export the module
module.exports   = helpers;
