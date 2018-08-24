/*
* Library for storing and editing data - CRUD operations
* */

// Dependencies
const Promise = require( 'bluebird' );
const _fs     = Promise.promisifyAll( require( 'fs' ) );
const _path   = require( 'path' );

const {
	_parseJsonToObject,
	_parseObjectToJson,
	_responseTemplate,
	_validateStatusCode
}   = require( './helpers' );

// Container for the module (to be exported)
let lib   = {};

// Base directory of the data folder
lib.baseDir   = _path.join( __dirname, '/../.data' );

// Write data to a file
lib._create   = async ( dirName, fileName, data ) => {
	console.log( '[ data._create ] - data._create START ' );
	let toReturn   = {};
	const filePath    = `${ lib.baseDir }/${ dirName }/${ fileName }.json`;
	const parsedData  = _parseObjectToJson( data );
	
	// Open the file for writing
	await _fs.writeFileAsync( filePath, parsedData, 'utf8' )
		.then(  () => {
			delete data.password;
			toReturn   = _responseTemplate( 201, `File created successfully`, data );
		} )
		.catch( error => {
			console.error("[ data._create ] unable to write file, ERROR: ", err.message );
			toReturn   = _responseTemplate( err.statusCode || 400, `Unable to write JSON file - Error: ${ err.message }` );
			Promise.reject( 'Unable to write required file' );
		});
		
	return toReturn;
};

// Delete a file
lib._delete   = async ( dirName, fileName ) => {
	console.log( '[ data._delete ] - data.delete START ' );
	const filePath   = `${lib.baseDir }/${ dirName }/${ fileName }.json`;
	let toReturn= {};
	// Unlink the file
	await _fs.unlinkAsync( filePath )
		.then( () => {
			console.log( `${ fileName } file has been deleted successfully` );
			toReturn   = _responseTemplate( 201, `${ fileName } has been deleted successfully`, {} );
		} )
		.catch( SyntaxError, error => {
			console.error("invalid json in file, ERROR: ", err.message );
			toReturn   = _responseTemplate( err.statusCode || 400, `Invalid JSON file - Error: ${ err.message }`, {} );
		})
		.catch( error => {
			console.error("unable to delete file, ERROR: ", err.message );
			toReturn   = _responseTemplate( err.statusCode || 400, `Unable to delete JSON file - Error: ${ err.message }`, {} );
			Promise.reject( 'Unable to delete required file' );
		});
	return toReturn;
};

// List all the items in a directory
lib.list   = ( dir, callback ) => {
	_fs.readdir( `${ lib.baseDir }/${ dir }/`, ( err, data ) => {
		if ( !error && data && data.length > 0 ) {
			let trimmedFileNames   = [];
			data.forEach( fileName => trimmedFileNames.push( fileName.replace( '.json', '' ) ) );
			callback( false, trimmedFileNames );
		} else {
			callback( err, data );
		}
	} );
};

// Read data from a file
lib._read   = async ( dirName, fileName ) => {
	console.log( '[ data._read ] data.read START ' );
	const filePath   = `${ lib.baseDir }/${ dirName }/${ fileName }.json`;
	let toReturn   = {};
	console.log( '[ data._read ] dirName: ', dirName );
	console.log( '[ data._read ] fileName: ', fileName );
	console.log( '[ data._read ] filePath: ', filePath );
	await _fs.readFileAsync( filePath, 'utf8' )
		.then( val => {
			console.log('[ data._read ] - val: ', val );
			console.log( '[ data._read ] - File data fetched successfully ');
			toReturn   = _responseTemplate( 200, 'File fetched successfully', _parseJsonToObject( val ) );
		} )
		.catch( error => {
			console.log("[ data._read ] Unable to read a file, ERROR: ", error.message );
			toReturn   = _responseTemplate( error.statusCode || 400, `Unable to read JSON file - Error: ${ error.message }` );
			return Promise.reject( 'Unable to read required file' );
		});
	return toReturn;
};

// Read all file names in a folder
lib._readAllFilesNames   = async dirName => {
	const dirtPath   = `${ lib.baseDir }/${ dirName }`;
	let toReturn   = {};
	// Validate if folder is not empty
	try {
		_fs.existsSync( dirtPath );
		// toReturn   = _responseTemplate( 200, `required folder ${ dirName } already exists` );
		// Retrieve all files names from folder
		await _fs.readdirAsync( dirtPath )
			.then( data => {
				toReturn   = _responseTemplate( 200, 'All files names have been retrieved', data );
			} )
			.catch( error => {
				toReturn   = _responseTemplate( 404, `ERROR: [ data.readFilesNames ] Folder could not be read - ERROR: ${ err.message }` );
				Promise.reject( 'Files could not be retrieved' );
			});
	} catch( error ) {
		console.log( `[ data._readFilesAllNames ] required folder ${ dirName } does not exist`);
		toReturn   = _responseTemplate( 404, `ERROR: [ data.readFilesNames ] No such file or directory - ERROR: ${ err.message }` );
	}
	return toReturn;
};

// Read all file names and its content in a folder
lib._readAllFilesNamesData   = async ( dirName ) => {
	const filesNamesList   = await lib._readAllFilesNames( dirName );
	let toReturn   = {};
	let filesDataList  = [];
	await _validateStatusCode( filesNamesList.StatusCode )
		.then( async () => {
			const filesData   = filesNamesList.data;
			for (let counter   = 0; counter < filesData.length; counter++ ) {
				//filename.split('.').slice(0, -1).join('.')
				let fileName   = ( filesData[ counter ] ).split( '.' ).slice( 0, 1 ).join( '.' );
				let readFile   = await lib._read( dirName, fileName );
				let toAdd      = false;
				await _validateStatusCode( readFile.StatusCode )
					.then( () => { toAdd   = true; } )
					.catch( error => { toAdd = false; });
				if ( toAdd ) {
					filesDataList.push( readFile.data );
				}
			}
			toReturn   = _responseTemplate( 200, 'All files and its data have been retrieved successfully', filesDataList );
		} )
		.catch( error => {
			console.log( `[ data._readAllFilesNamesData ] ERROR : ${ filesNamesList } - ERROR - ${ err.message }` );
			toReturn   = filesNamesList;
			Promise.reject( 'Files could not be loaded' );
		} );
	
	return toReturn;
};
// Update data inside a file
lib._update   = async ( dirName, fileName, data ) => {
	console.log( '[ data._update ] data.update START ' );
	const filePath   = `${ lib.baseDir }/${ dirName }/${ fileName }.json`;
	let toReturn     = {};
	// Open the file for writing
	await _fs.truncateAsync( filePath, 0 )
		.then( _fs.writeFileAsync( filePath, await _parseObjectToJson( data ) ) )
		.then( () => toReturn   = _responseTemplate( 201, 'File data has been updated', data ) )
		.catch( error => {
			toReturn = _responseTemplate( 404, '[ data.lib._update ] No such file or directory');
			Promise.reject( 'Required file could not be updated' );
		} );
	return toReturn;
};

// Export the module
module.exports   = lib;
