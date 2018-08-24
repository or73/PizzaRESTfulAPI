/*
* Request handlers
* */

// Dependencies
// const {
// 	parse,
// 	validate
// }   = require( 'schm' );
const nanoid   = require( 'nanoid');
const {
	config
}              = require( '../config/config' );
const apiKey   = config.mailgun.apiKey;
const domain   = config.mailgun.domain;
const stripe   = require( 'stripe' )( config.stripe.secret );
const mailgun  = require( 'mailgun-js' ) ( { apiKey, domain } );
stripe.setApiVersion= config.stripe.apiVersion;
const {
	_create,
	_delete,
	_read,
	_readAllFilesNamesData,
	_update
}     = require( '../services/data' );
const {
	_createDateFormat,
	_createFileEncrypted,
	_createHash,
	_createHTMLMessage,
	_validateFileDontExist,
	_validateFileExist,
	_responseTemplate,
	_validateBoolean,
	_validateEmail,
	_validateNumber,
	_validateStatusCode,
	_validateString,
	_validateTokenExpires,
	_validateValueInArray,
	_validateValueNotInArray,
	_validateValuesChange,
}               = require( '../services/helpers' );
const {
	_itemSchema,
	_itemShoppingCartSchema,
	_orderSchema,
	_shoppingCartSchema,
	_tokenSchema,
	_userSchema
}               = require( '../models/schemas' );
const colors    = require( 'colors' );

const acceptableMethods   = [ 'delete', 'get', 'post', 'put' ];

// Define the handlers container
let handlers   = {};

/*
* JSON API Handlers*
* */
/*
*                            * * *   MENU HANDLER   * * *
* */
/*
* Menu - Handler
* */
handlers._menus   = {};

/*
* menuItem - DELETE
* Required data: headers → email, token
*                queryStringObject → name
* Optional data: None
* Procedure description:   1. Validates email, name, and token
*                          2. Validates token
*                          3. Delete menu
* */
handlers._menus.delete   = async data => {
	console.log( ' Menu '.bgBlue.black.bold, ' DELETE '.bgCyan.grey.bold );
	
	// Variables and constants
	let queryStringObject, name, toReturn;
	
	queryStringObject   = data.queryStringObject;
	name   = _validateString( queryStringObject.id ) ? queryStringObject.id : false;
	toReturn   = {};
	
	if ( name ) {
		// Validate if the item exists
		await _validateFileExist( 'menus', name )
			.then( async () => {
				return 	await _read( 'menus', name );
			} )
			.then( async readMenuMsg => {
				await _validateStatusCode( readMenuMsg.StatusCode );
				return readMenuMsg.data;
			} )   // Validate readMenuData StatusCode
			.then( () => {
				return _delete( 'menus', name );
			} )
			.then( async delMenuMsg => {
				await _validateStatusCode( delMenuMsg.StatusCode );
				return delMenuMsg.data;
			} )
			.then( delMenuData => {
				toReturn   = _responseTemplate( 200, 'Item deleted successfully', delMenuData );
			} )
			.catch( error => {
				console.log( `ERROR: [ handlers._menu.post ] - Item already exists - ERROR - ${ error.message }` );
				toReturn   = _responseTemplate( 451, `ERROR: [ handlers._menu.get ] - Item does not exist - ERROR - ${ error.message }` )
			} );
	} else {
		toReturn   = _responseTemplate( 404, `ERROR: [ handlers._menu.get ] Missed required fields `, {} );
	}
	return toReturn;
};

/*
* menuItem - GET
* Required data: queryStringObject → name, all
* Optional data: None
* Procedure description:   1. Validates operation, query for one item of menu or list of items in menu
*                          2. Validates if item exist
*                          3. Retrieves menu information or list of items in menu
*
* Two operations are available:
*              1. Get information of one menu   --> retrieves information of provided menu
*              2. Get a list of existing menus  --> retrieves a list of menus
*      Description                              Path
* Get information of one item     http://localhost:3000/menus?name=<validItemName>
* Get a list of existing items    http://localhost:3000/menus?all
* */
handlers._menus.get   = async data => {
	console.log( ' Menu '.bgBlue.black.bold, ' GET '.bgCyan.grey.bold );
	
	// Constants and variables
	let queryStringObject, name, all, toReturn;
	
	queryStringObject   = data.queryStringObject;
	name   = _validateString( queryStringObject.id ) ? queryStringObject.id : false;
	all    = queryStringObject.all !== undefined;
	toReturn   = {};
	
	if ( name && !all ) {
		// Validate if the item exists
		const readMsg   = await _read( 'menus', name );
		await _validateStatusCode( readMsg.StatusCode )
			.then( () => { return _itemSchema( readMsg.data ); } )
			.then( readData => {
				toReturn   = _responseTemplate( 200, 'Item fetched successfully', readData );
			} )
			.catch( error => {
				console.log( `ERROR: [ handlers._menu.post ] - Item already exists - ERROR - ${ error.message }` );
				toReturn   = _responseTemplate( 451, `ERROR: [ handlers._menu.get ] - Item does not exist - ERROR - ${ error.message }` )
			} );
	} else if ( all && !name ) {
		// Retrieve all items from menu
		toReturn   = await _readAllFilesNamesData( 'menus' );
	} else {
		toReturn   = _responseTemplate( 404, `ERROR: [ handlers._menu.get ] Missed required fields `, {} );
	}
	return toReturn;
};

/*
* menuItem  - POST
* Required data: payload → name and price
* Optional data: None
* Procedure description:  1. Validate name and price
*                         2. Validate menu exists
*                         3. Generate item id, randomly
*                         4. Create item object
*                         5. Add item object to menu
* */
handlers._menus.post   = async data => {
	console.log( ' Menu '.bgBlue.black.bold, ' POST '.bgCyan.grey.bold );
	
	// Constants and variables
	let payload, name, price, amount, description, toReturn;
	
	payload   = data.payload;
	name   = _validateString( payload.name ) ? payload.name : false;
	price  = _validateNumber( payload.price ) ? payload.price : false;
	amount = _validateNumber( payload.amount ) ? payload.amount : Number.MAX_VALUE;
	description = _validateString( payload.description ) ? payload.description : false;
	toReturn = {};
	if ( name && price && amount && description ) {
		// Validate if item already exists
		
		const readMenuMsg  = {}; // await _read( 'menus', name );
		const itemObj  = { id : nanoid(), name, price, amount, description, shoppingCartsList : [] };
		await _validateFileDontExist( 'menus', name ) // Validate menu item does not exist
			.then( () => {
				return _itemSchema( itemObj );
			} )
			.then( async itemSchObj => {
				return await _create( 'menus', name, itemSchObj );
			} )
			.then( async createMenuMsg => {
				_validateStatusCode( createMenuMsg.StatusCode );
				return createMenuMsg.data;
			} )
			.then( createData => {
				toReturn   = _responseTemplate( 201, 'Item has added to menu successfully', createData );
			} )
			.catch( error => {
				console.log( `ERROR: [ handlers._menu.post ] - Item already exists - ERROR - ${ error.message }` );
				toReturn   = _responseTemplate( 451, `ERROR: [ handlers._menu.post ] - Item already exists - ERROR - ${ error.message }` );
			} );
	} else {
		toReturn   = _responseTemplate( 404, `ERROR: [ handlers._menu.post ] Missed required fields `, {} );
	}
	return toReturn;
};

/*
* Menu - PUT
* Required data: headers → email, token
*                payload → price
*                queryStringObject → name
* Optional data: None
* Procedure description:   1. Validates itemName, price, and token
*                          2. Validates token
*                          3. Validates menu exists
*                          4. Generate new menu object, with all new values, and previous values, if not updated
*                          5. Update the menu data, with the new object
* */
handlers._menus.put   = async data => {
	console.log( ' Menu '.bgBlue.black.bold, ' PUT '.bgCyan.grey.bold );
	
	// Constants and variables
	let headers, payload, queryStringObject, email, token, name, itemName, price, description, amount, toReturn;
	
	headers   = data.headers;
	payload   = data.payload;
	queryStringObject   = data.queryStringObject;
	toReturn  = {};
	email   = _validateString( headers.email ) && _validateEmail( headers.email ) ? headers.email : false;
	token   = _validateString( headers.token ) ? headers.token : false;
	name    = _validateString( queryStringObject.id ) ? queryStringObject.id : false;
	itemName= _validateString( payload.name ) ? payload.name : false;
	price   = _validateNumber( payload.price ) ? payload.price : false;
	description   = _validateString( payload.description ) ? payload.description : false;
	amount  = _validateNumber( payload.amount ) ? payload.amount : false;
	
	if ( !itemName ) {
		if (price || description || amount) {
			const itemObj = {id: nanoid(), name, price, description, amount, shoppingCartsList: []};
			const hashedEmail   = _createFileEncrypted( email );
			// Validate if item exists
			await _validateFileExist( 'menus', name )
				.then( async () => {
					await _validateFileExist( 'users', hashedEmail );
				} )   // Validate user exist
				.then( async () => {
					await _validateFileExist( 'tokens', token );
				} )   // Validate token file exist
				.then( async () => {
					return await _read('tokens', token);
				})   // Read token, to validate received token
				.then( async readTokenMsg => {
					await _validateStatusCode(readTokenMsg.StatusCode);   // Validate answer received from read operation
					return readTokenMsg.data;
				})
				.then( async readTokenData => {
					await _validateTokenExpires(readTokenData, email);
					return readTokenData;
				})   //  Validate if token is active
				.then(readData => {
					return readData.token === token;
				})   // Compares provided token with user's token
				.then(() => {
					_itemSchema(itemObj);
				})   // Validate provided data format
				.then( async () => {
					return await _read( 'menus', name );
				} )   // Read item from file
				.then( async readMenuMsg => {
					await _validateStatusCode( readMenuMsg.StatusCode );
					return readMenuMsg.data;
				} )   // Validate readMenuMsg StatusCode
				.then( async readMenuMsg => {
					itemObj.id   = false;
					itemObj.name = false;
					itemObj.shoppingCartsList = false;
					return await _validateValuesChange( readMenuMsg, itemObj )
				})   // Compare and modify updated information provided
				.then( async validateMsg => {
					await _validateStatusCode(validateMsg.StatusCode);   // Validates answer received from validateValuesChange
					return validateMsg.data;
				})
				.then( async () => {
					return await _update('menus', name, itemObj );   // Update item data
				})
				.then( async updateMsg => {
					await _validateStatusCode(updateMsg.StatusCode);   // Validates answer received after update operation
					return updateMsg.data;
				})
				.then(updateData => {
					toReturn = _responseTemplate(201, 'Item has been updated successfully', updateData);
				})
				.catch( error => {
					toReturn = _responseTemplate(400, 'ERROR: [ handlers._menus.put ] Item could not be updated');
				});
		} else {
			toReturn = _responseTemplate(404, 'ERROR: [ handlers._menus.put ] None information was provided to be updated');
		}
	} else {
		toReturn   = _responseTemplate( 404, 'ERROR: [ handlers._menus.put  ] Item name cannot be modified' );
	}
	return toReturn;
};



/*
*                            * * *   NOT FOUND HANDLER   * * *
* */
/*
* Not Found handler
* */
handlers._notFound   = data => {
	return _responseTemplate( 404, '[Not Found Handler ] Not Found Handler', data );
};

/*
* Ping handler
* */
handlers._ping   = ( data, callback ) => {
	callback( 200 );
};


/*
*                            * * *   PUBLIC HANDLER   * * *
* */
/*
* Public Handler
* */
handlers._public   = data => {
	if ( _validateValueInArray( data.method, acceptableMethods ) ) {
		return handlers._public[ data.method ]( data );
	} else {
		return false;
	}
};


/*
*                            * * *   PURCHASE ORDER HANDLER   * * *
* */
/*
* purchaseOrder - Handler
* */
handlers._orders   = {};

/*
* Purchase Order - DELETE
* */
handlers._orders.delete   = async data => {
	console.log( ' Purchase Order '.bgYellow.black.bold, ' DELETE '.bgCyan.grey.bold );
	
	// Constants and variables
	let headers, queryStringObject, email, token, toReturn;
	
	headers   = data.headers;
	queryStringObject   = data.queryStringObject;
	
	email   = _validateString( queryStringObject.id ) && _validateEmail( queryStringObject.id ) ? queryStringObject.id : false;
	token   = _validateString( headers.token ) ? headers.token : false;
	toReturn  = {};
	if ( email && token ) {
		const hashedEmail   = _createFileEncrypted( email );
		// Validate if user exist
		await _validateFileExist('users', hashedEmail )
			.then( async () => {
				await _validateFileExist( 'tokens', token );
			} )   // Validate if token exist
			.then( async () => {
				return await  _read( 'tokens', token );
			} )   // Read token file
			.then( async readTokenMsg => {
				await _validateStatusCode( readTokenMsg.StatusCode );
			} )   // Validate readTokenMsg StatusCode
			.then( async () => {
				await handlers._tokens.verifyToken( token, email );
			} )   // Validate if token is valid, is not expired
			.then( async () => {
				await _validateFileExist( 'carts', hashedEmail );
			})   // Validate if shopping Cart exist
			.then( async () => {
				await _validateFileExist( 'orders', hashedEmail );
			} )   // Validate if  Order exist
			.then( async () => {
				return await _delete( 'orders', hashedEmail );
			} )   // Delete Order
			.then( async delOrderMsg => {
				await _validateStatusCode( delOrderMsg.StatusCode );
			} )   // Validate delOrderMsg StatusCode
			.then( () => {
				console.log( '[ handlers.orders.get ] - Order has been deleted successfully', {} );
				toReturn   = _responseTemplate( 201, '[ handlers.orders.get ] - Order has been deleted successfully', {} );
			} )
			.catch( error => {
				console.log( 'ERROR: [ handlers._orders.delete ] - Something wrong order could not exist' );
				toReturn   = _responseTemplate( 404, 'ERROR: [ handlers._orders.delete ] - Something wrong order could not exist - ERROR: ', error );
			} )
	}  else {
		console.log( 'ERROR: [ handlers._orders.delete ] - Missing or invalid required fields' );
		toReturn   = _responseTemplate( 412, 'ERROR: [ handlers._orders.delete ] - Missing or invalid required fields' );
	}
	
	return toReturn;
};

/*
* Purchase Order - GET
* Required data: headers → token, email
* Optional data: None
* Procedure description:    1. Validate tokenId and email are valid strings
*                           2. Validate user exists
*                           3. Validate token is valid
*                           4. Read and Validate Purchase Order
* */
handlers._orders.get   = async data => {
	console.log(' Purchase Order '.bgYellow.black.bold, ' GET '.bgCyan.grey.bold);
	
	// Constants and variables
	let headers, queryStringObject, email, token, toReturn;
	
	headers   = data.headers;
	queryStringObject   = data.queryStringObject;
	
	email   = _validateString( queryStringObject.id ) && _validateEmail( queryStringObject.id ) ? queryStringObject.id : false;
	token   = _validateString( headers.token ) ? headers.token : false;
	toReturn  = {};
	if ( email && token ) {
		const hashedEmail   = _createFileEncrypted( email );
		await _validateFileExist( 'users', hashedEmail)   // Validate if user exist
			.then( async () => {
				await _validateFileExist( 'tokens', token );
			} )   // Validate if token exist
			.then( async () => {
				return await _read( 'tokens', token );
			} )   // Read token file
			.then( async readTokenMsg => {
				await _validateStatusCode( readTokenMsg.StatusCode );
				return readTokenMsg.data;
			} )   // Validate tokenExistMsg StatusCode
			.then( async readTokenData => {
				await handlers._tokens.verifyToken( readTokenData, email );
			} )   // Validate if token is valid, is not expired
			.then( async () => {
				await _validateFileExist( 'carts', hashedEmail );
			} )   // Validate if shopping Cart exist
			.then( async () => {
				await _validateFileExist( 'orders', hashedEmail );
			} )   // Validate Order file exist
			.then( async () => {
				return await _read( 'orders', hashedEmail );
			} )   // Read order file
			.then( async readOrderMsg => {
				await _validateStatusCode( readOrderMsg.StatusCode );
				return readOrderMsg.data;
			} )   // Validate readOrderMsg StatusCode
			.then( readOrderData => {
				toReturn   = _responseTemplate( 200, 'Order retrieved successfully', readOrderData );
			} )   // Retrieve Order
			.catch( error => {
				console.log( 'ERROR: [ handlers._orders.get ] - Something wrong retrieving required order' );
				toReturn   = _responseTemplate( 412, '[ handlers._orders.get ] - Something wrong retrieving required order' );
			}	);
	} else {
		console.log( 'ERROR: [ handlers._orders.get ] - Missing or invalid required fields' );
		toReturn   = _responseTemplate( 412, 'ERROR: [ handlers._orders.get ] - Missing or invalid required fields' );
	}
	return toReturn;
};

/*
* Purchase Order - POST
* Required data: headers → token
 *               queryStringObject → email
* Optional data: None
* Procedure description:    1. Validate tokenId and email are valid strings
*                           2. Validate user exists
*                           3. Validate token is valid
*                           4. Validates if shoppingCard has an item list
*                           5. Validate payment with 'Stripe'
*                           6. Create order object
*                           7. Send email with order's details
*                           8. Stores order object
* */
handlers._orders.post   = async data => {
	console.log( ' Purchase Order '.bgYellow.black.bold, ' POST '.bgCyan.grey.bold );
	
	// Constants and variables
	let headers, queryStringObject, email, token, order, toReturn;
	
	headers   = data.headers;
	queryStringObject   = data.queryStringObject;
	
	email   = _validateString( queryStringObject.id ) && _validateEmail( queryStringObject.id ) ? queryStringObject.id : false;
	token   = _validateString( headers.token ) ? headers.token : false;
	order   = _validateString( queryStringObject.accept ) ? queryStringObject.accept : false;
	toReturn  = {};
	if ( email && token ) {
		const hashedEmail = _createFileEncrypted(email);
		let userData   = {};
		let orderObj   = {};
		
		await _validateFileExist( 'users', hashedEmail)   // Validate if user file exist
			.then( async () => {
				return await _read( 'users', hashedEmail );
			} )   // Read user file
			.then( async readUserMsg => {
				await _validateStatusCode( readUserMsg.StatusCode );
				userData   = readUserMsg.data;
			} )  // Validate readUserMsg StatusCode
			.then( async () => {
				await _validateFileExist( 'tokens', token );
			} )   // Validate if token file exist
			.then( async () => {
				return await _read( 'tokens', token );
			} )   // Validate if token exist
			.then( async readTokenMsg => {
				await _validateStatusCode( readTokenMsg.StatusCode );
				return readTokenMsg.data;
			} )   // Validate tokenExistMsg StatusCode
			.then( async readTokenData => {
				await _validateTokenExpires( readTokenData, email );
			} )   // Validate if token is valid, is not expired
			.then( async () => {
				await _validateFileExist( 'carts', hashedEmail );
			} )   // Validate Shopping Cart file exist
			.then( async () => {
				return await _read( 'carts', hashedEmail)
			} )   // Validate if shopping Cart exist
			.then( async readCartsMsg => {
				await _validateStatusCode( readCartsMsg.StatusCode );
				return readCartsMsg.data;
			} )   // Validate cartMsg StatusCode
			.then( readCartData => {
				orderObj = {
					id: nanoid(),
					country: 'US',
					customer: 'testName',
					email: 'test@email.com',
					currency: 'usd',
					total: readCartData.total,
					last4: 0,
					items: readCartData.items,
					paymentMethod: 'XX',
					authorization: true,
					shoppingCartId: readCartData.id,
					authorizationDate: _createDateFormat(new Date()),
				};
				if ( order ) {
					orderObj.customer   = userData.name;
					orderObj.email      = userData.email;
				}
				_orderSchema( orderObj );   // Validate orderObj with orderSchema
			} )   // Create OrderObj
			.then( async () => {
				console.log('[ handlers._orders.post ] - stripe - START ');
				if ( order )   return await stripe.customers.create({email});
			} )   // stripe - customer create
			.then( async customerData => {
				if ( order )   return await stripe.customers.createSource(customerData.id, {source: 'tok_visa'});
			} )
			.then( async sourceData => {
				if ( order ) {
					return stripe.charges.create({
						amount: parseInt(orderObj.total),
						currency: orderObj.currency,
						description: `Customer name: ${ orderObj.name } with email: ${ orderObj.email }`,
						customer: sourceData.customer
					});
				}
			} )
			.then( async chargeData => {
				if ( order ) {
					console.log('[ handlers._orders.post ] - chargeData: ', chargeData);
					orderObj.country = chargeData.source.country;
					orderObj.paymentMethod = chargeData.source.brand;
					orderObj.last4 = chargeData.source.last4;
					orderObj.object = chargeData.source.object;
					console.log('[ handlers._orders.post ] - orderObj: ', orderObj);
				}
				console.log('[ handlers._orders.post ] - stripe - END ');
			} )   // stripe - Update purchase order data
			.then( () => {
				console.log('[ handlers._orders.post ] - mailgun - START ');
				if ( order ) {
					return {
						from   : config.mailgun.emailFrom,
						to     : config.mailgun.emailTo,
						subject: config.mailgun.emailSubject,
						html   : _createHTMLMessage(orderObj)
					}
				}
			} ) // mailgun - create email
			.then( emailMsg => {
				if ( order ) {
					console.log('[ handlers._orders.post ] - mailgun - sending e-mail message ');
					// mailgun.messages().send( emailMsg, async );
					mailgun.messages().send(emailMsg, async (err, body) => {
						if (err) {
							return Promise.reject(' Something wrong with Purchase Order [ purchaseOrder.orderPost]');
						} else {
							console.log('[ purchaseOrders.purchaseOrderPost ] - body: ', body);
						}
					});
				}
				console.log('[ handlers._orders.post ] - mailgun - END ');
			} ) // mailgun - send message
			.then( async () => {
				return await _create( 'orders', hashedEmail, orderObj );
			} )   // Create Order
			.then( async createOrderMsg => {
				await _validateStatusCode( createOrderMsg.StatusCode );
				return createOrderMsg.data;
			} )   // Validate Status Code createOrderMsg
			.then( () => {
				toReturn   = _responseTemplate( 201, 'Purchase Order created successffully', orderObj );
			} )
			.catch( error => {
				console.log( 'ERROR: [ handlers._orders.put ] - Something wrong creating order' );
				toReturn   = _responseTemplate( 404, 'ERROR: [ handlers._orders.put ] - Something wrong creating order - ERROR: ', error );
			} )
	} else {
		console.log( 'ERROR: [ handlers._orders.put ] - Missing or invalid required fields' );
		toReturn   = _responseTemplate( 412, 'ERROR: [ handlers._orders.put ] - Missing or invalid required fields' );
	}
	return toReturn;
};


/*
*                            * * *   SHOPPING CART HANDLER   * * *
* */
/*
* shoppingCart - Handler
* */
handlers._carts   = {};

/*
* ShoppingCart  - DELETE
* Required data: headers → email, token
*                payload → items
*                queryStringObject → id
* Optional data: None
* Procedure description:   1. Validate email, token, shoppingCartId, items
*                          2. Validate token
*                          3. Validate shoppingCartId exists
*                             If shoppingCardId && !items           If shoppingCartId && items
*                          3. Delete shoppingCart                   3. Delete each item (by qtty), from shopping Cart
*
* Description                                            Path
* Delete a Shopping List                                http://localhost:3000?id=<shoppingCartId>
* Delete an item or a list of items from Shopping List  http://localhost:3000?id=<shoppingCartId>
* */
handlers._carts.delete   = async data => {
	console.log( ' Shopping Cart '.bgYellow.black.bold, ' DELETE '.bgCyan.grey.bold );
	
	// Constants and variables
	let headers, queryStringObject, email, token, toReturn;
	
	headers   = data.headers;
	queryStringObject   = data.queryStringObject;
	email   = _validateString( queryStringObject.id ) && _validateEmail( queryStringObject.id ) ? queryStringObject.id : false;
	token   = _validateString( headers.token ) ? headers.token : false;
	toReturn  = {};
	
	if ( email && token ) {
		const hashedEmail   = _createFileEncrypted( email );
		// Validate if user exists
		const readMsg   = await _read( 'users', hashedEmail );
		await _validateStatusCode( readMsg.StatusCode )
			.then( async () => {
				return await _read( 'tokens', token )
			} )  // Validate token exists
			.then( async readTokenMsg => {
				await _validateStatusCode( readTokenMsg.StatusCode );
				return readTokenMsg.data;
			} )   // Validate StatusCode token message
			.then( async readTokenData => {
				await _validateTokenExpires( readTokenData, email );
			} )   // Validate token is valid and it does not expired
			.then( async () => {
				return await _delete( 'carts', hashedEmail );
			} )   // Validate if shopping cart exist
			.then( async deleteCartsMsg => {
				await _validateStatusCode( deleteCartsMsg.StatusCode );
				return deleteCartsMsg.data;
			} )   // Validate readCartsMsg StatusCode
			.then( readCartData => {
				toReturn   = _responseTemplate( 200, 'Shopping Cart has been deleted successfully', readCartData );
			} )
			.catch( error => {
				toReturn   = _responseTemplate( 404, `ERROR: [ handlers._carts.delete ] Something wrong, user or token could not exist`, error );
			} );
	} else {
		console.log( 'ERROR: [ handlers._carts.get ] - Missing or invalid required fields' );
		toReturn   = _responseTemplate( 412, 'ERROR: [ handlers._carts.delete ] - Missing or invalid required fields' );
	}
	return toReturn;
};

/*
* ShoppingCart  - GET
* Required data: headers → email, token
*                queryStringObject → all
* Optional data: None
* Procedure description:   1. Validate email, token
*                          2. Validate token
*                                      If all                                   If !all
*                          3. Validate if Shopping Cart exists       3. Validate Shopping Cart exists
*                          4. Fetch list of Shopping Carts           4. Fetch Shopping Cart
*
* Description                    Path
* Fetch a Shopping Cart                          http://localhost:3000?id=<shoppingCartId>
* Fetch list of  all available Shopping Carts    http://localhost:3000?all
* */
handlers._carts.get   = async data => {
	console.log( ' Shopping Cart '.bgYellow.black.bold, ' GET '.bgCyan.grey.bold );
	
	// Constants and variables
	let headers, queryStringObject, email, token, toReturn;
	
	headers   = data.headers;
	queryStringObject   = data.queryStringObject;
	email   = _validateString( queryStringObject.id ) && _validateEmail( queryStringObject.id ) ? queryStringObject.id : false;
	token   = _validateString( headers.token ) ? headers.token : false;
	toReturn  = {};
	
	if ( email && token ) {
		const hashedEmail   = _createFileEncrypted( email );
		// Validate if user exists
		const readMsg   = await _read( 'users', hashedEmail );
		await _validateStatusCode( readMsg.StatusCode )
			.then( async () => {
				return await _read( 'tokens', token )
			} )  // Validate token exists
			.then( async readTokenMsg => {
				await _validateStatusCode( readTokenMsg.StatusCode );
				return readTokenMsg.data;
			} )   // Validate StatusCode token message
			.then( async readTokenData => {
				await _validateTokenExpires( readTokenData, email );
			} )   // Validate token is valid and it does not expired
			.then( async () => {
				return await _read( 'carts', hashedEmail );
			} )   // Validate if shopping cart exist
			.then( async readCartsMsg => {
				await _validateStatusCode( readCartsMsg.StatusCode );
				return readCartsMsg.data;
			} )   // Validate readCartsMsg StatusCode
			.then( readCartData => {
				toReturn   = _responseTemplate( 200, 'Shopping Cart retrieved successfully', readCartData );
			} )
			.catch( error => {
				toReturn   = _responseTemplate( 404, `ERROR: [ handlers._carts.get ] Something wrong, user or token could not exist`, error );
			} );
	} else {
		console.log( 'ERROR: [ handlers._carts.get ] - Missing or invalid required fields' );
		toReturn   = _responseTemplate( 412, 'ERROR: [ handlers._carts.get ] - Missing or invalid required fields' );
	}
	return toReturn;
};

/*
* ShoppingCart  - POST
* Required data: headers → email, token
*                queryStringObject → item, qtty
* Optional data: None
* Procedure description:   1. Validate email, token, item, qtty
*                          2. Validate token
*                               If item && qtty                         If !item && !qtty
*                          3. Validate if item exists in menu        3. Validate Shopping Cart  exists
*                          4. Create new item object                 4. Create new Shopping Cart object
*                          5. Add new item object to Shopping Cart   5. Create new Shopping Cart
*
* Description                    Path
* Create a Shopping Cart         http://localhost:3000/shoppingCart
* Add an item to Shopping Cart   http://localhost:3000/shoppingCart?item=<itemName>&qtty=<itemQuantity>
* */
handlers._carts.post   = async data => {
	console.log( ' Shopping Cart '.bgYellow.black.bold, ' POST '.bgCyan.grey.bold );
	console.log( '[ handlers._carts.post ] - handlers._carts POST START ' );
	
	// Constants and variables
	let headers, queryStringObject, email, token, item, amount, create, toReturn;
	
	headers   = data.headers;
	queryStringObject   = data.queryStringObject;
	
	email   = _validateString( headers.email ) && _validateEmail( headers.email ) ? headers.email : false;
	token   = _validateString( headers.token ) && headers.token.length === 21 ? headers.token : false;
	item    = _validateString( queryStringObject.item ) ? queryStringObject.item : false;
	amount  = _validateString( queryStringObject.amount ) ? parseFloat( queryStringObject.amount ) : false;
	create  = _validateString( queryStringObject.create ) ? queryStringObject.create : false;
	toReturn= {};
	
	// Validate email & token
	if ( email && token ) {
		const hashedEmail   = _createFileEncrypted( email );
		const shoppingCartObj   = {	id   : nanoid(), total: 0, items: [] };
		if ( create ) { // The create a new shopping cart
			// Validate if exist a shopping cart with hashed email as name
			await _validateFileDontExist( 'carts',  hashedEmail )
				.then( () => {
					_shoppingCartSchema( shoppingCartObj );
				} )   // Create new shopping cart object
				.then( async ()  => {
					return await _create( 'carts', hashedEmail, shoppingCartObj );
				} )   // Create new shopping cart
				.then( async createMsg => {
					await _validateStatusCode( createMsg.StatusCode );
					return createMsg.data;
				} )   // Validate createMsg status
				.then( shoppingCart => {
					toReturn   = _responseTemplate( 201, 'Shopping cart has been created successfully', shoppingCart );
				} )
				.catch( error => {
					console.log( 'ERROR: [ handlers._carts.post ] Shopping cart already exist ' );
					toReturn   = _responseTemplate( 451, 'ERROR: [ handlers._carts.post ] Shopping cart already exist' );
				} );
		} else {  // Use provided shopping cart id
			let readCartData   = {};
			await _validateFileExist( 'carts', hashedEmail) // Validate shopping cart file exist
				.then( async () => {
					return await _read('carts', hashedEmail);
				} )   // Read Shopping Cart
				.then( async readCartMsg => {
					await _validateStatusCode( readCartMsg.StatusCode );
					readCartData   = readCartMsg.data;
				} )   // Validate readCartMsg StatusCode
				.then( async () => {
					await _validateFileExist( 'tokens', token );
				} )   // Validate if token file exist
				.then( async () => {
					return await _read('tokens', token);
				} )   // Validate if shopping cart exist
				.then( async readTokenMsg => {
					await _validateStatusCode(readTokenMsg.StatusCode);
					return readTokenMsg.data;
				} )   // Validates status code of token read message
				.then(async readTokenData => {
					await _validateTokenExpires(readTokenData, email)
				})  // Validate token and email
				.then( async () => {
					await _validateFileExist( 'users', hashedEmail )
				} )   // Validate if user file exist
				.then(async () => {
					return await _read('users', hashedEmail)
				})  // Validate if user exist
				.then(async readUserMsg => {
					await _validateStatusCode(readUserMsg.StatusCode);
					return readUserMsg.data;
				})
				.then(readUserData => {
					return readUserData.token === token;
				})   // Validate provided token equal to provided email user token
				.then( async () => {
					const itemsInCart   = readCartData.items.map( req => req.name );
					return await _validateValueNotInArray( item, itemsInCart );
				} )   // Validate if item already exist in shopping cart
				.then(async () => {
					return await _read('menus', item)
				})   // Validate item exist
				.then(async readMenuMsg => {
					await _validateStatusCode(readMenuMsg.StatusCode);
					return readMenuMsg.data;
				})  // Validates read menus message
				.then(readMenuData => {
					_itemSchema(readMenuData);
					return readMenuData;
				})   // Validate read data with item schema
				.then(readMenuData => {
					const itemToAdd = {
						id: readMenuData.id,
						name: readMenuData.name,
						price: parseFloat( readMenuData.price ),
						amount,
						totalItem: parseFloat( amount * readMenuData.price )
					};
					return _itemShoppingCartSchema( itemToAdd );
				})   // Create new itemObj to add to Shopping Cart
				.then( itemToAdd => {
					readCartData.items.push( itemToAdd );
					readCartData.total += parseFloat( itemToAdd.totalItem );
					return readCartData;
				} )   // Add new item to Shopping Cart
				.then( async readCartData => {
					return await _update( 'carts', hashedEmail, readCartData );
				} )   // Update shopping cart with new item added
				.then( async updateMsg => {
					await _validateStatusCode( updateMsg.StatusCode );
					return updateMsg.data;
				})   // Validate update cart message
				.then( updateData => {
					toReturn   = _responseTemplate( 201, 'New Item added to Shopping Cart successfully', updateData );
				} )
				.catch(error => {
					console.log( `ERROR: [ handlers._carts.post ] Shopping Cart does not exist or item already exist in shopping cart - ERROR: `, error );
					toReturn = _responseTemplate(404, 'ERROR: [ handlers._carts.post ] Shopping Cart does not exist or item already exist in shopping cart');
				});
		}
	} else {
		console.log( 'ERROR: [ handlers._carts.post ] Missing or invalid required fields' );
		toReturn   = _responseTemplate( 412, 'ERROR: [ handlers._carts.post ] Missing or invalid required fields' );
	}
	return toReturn;
};

/*
* ShoppingCart  - PUT
* Required data: headers → email, token
*                payload → items
*                queryStringObject → id
* Optional data: None
* Procedure description:   1. Validate email, token, shoppingCartId, items
*                          2. Validate token
*                          3. Validate if ShoppingCartId exists
*                          4. Update each item in Shopping Cart
*
* Description                                            Path
* Update an item or a list of items from Shopping List   http://localhost:3000?id=<shoppingCartId>
* */
handlers._carts.put   = async data => {
	console.log( ' Shopping Cart '.bgYellow.black.bold, ' PUT '.bgCyan.grey.bold );
	
	// Constants and variables
	let headers, payload, queryStringObject, email, token, item, amount, toReturn;
	
	headers   = data.headers;
	payload   = data.payload;
	queryStringObject   = data.queryStringObject;
	
	email   = _validateString( queryStringObject.id ) && _validateEmail( queryStringObject.id ) ? queryStringObject.id : false;
	token   = _validateString( headers.token ) ? headers.token : false;
	
	// Only can modify the amount of required items
	item    = _validateString( payload.name ) ? payload.name : false;
	amount  = _validateNumber( payload.amount ) ? payload.amount : false;
	toReturn   = {};
	
	if ( email && token ) {
		const hashedEmail   = _createFileEncrypted( email );
		await _validateFileExist( 'users', hashedEmail ) // Validate if user file exist
			.then( async () => {
				return await _read( 'users', hashedEmail );
			} )
			.then( async readUserMsg => {
				await _validateStatusCode( readUserMsg.StatusCode );
			} )   // Validate readMsg StatusCode
			.then( async () => {
				await _validateFileExist( 'tokens', token );
			} )   // validate token file exist
			.then( async () => {
				return await _read( 'tokens', token );
			} )   // Validate if token exist
			.then( async tokenReadMsg => {
				await _validateStatusCode( tokenReadMsg.StatusCode );
				return tokenReadMsg.data;
			} )   // Validate statusCode of tokenReadMsg
			.then( async tokenReadData => {
				await _validateTokenExpires( tokenReadData, email );
			} )   // Validate token, not expired
			.then( async () => {
				await _validateFileExist( 'carts', hashedEmail );
			} )   // Validate cart file exist
			.then( async () => {
				return await _read( 'carts', hashedEmail );
			} )   // Validate shopping cart exist
			.then( async readCartMsg => {
				await _validateStatusCode( readCartMsg.StatusCode );
				return readCartMsg.data;
			} )   // Validate readCartsMsg StatusCode
			.then( async readCartData => {
				const itemsList   = readCartData.items.map( req => req.name );
				await _validateValueInArray( item, itemsList );
				return readCartData;
			} )   // Validate item exist in shopping cart
			.then( async readCartData => {
				for ( let counter = 0; counter < readCartData.items.length; counter++ ) {
					if ( readCartData.items[ counter ].name === item ) {
						readCartData.total   -= readCartData.items[ counter ].totalItem;
						readCartData.items[ counter ].amount   = amount;
						readCartData.items[ counter ].totalItem   = readCartData.items[ counter ].price * amount;
						readCartData.total   += readCartData.items[ counter ].totalItem;
						break;
					}
				}
				return await _update( 'carts', hashedEmail, readCartData );
			} )   // Update item amount
			.then(async updateMsg => {
				await _validateStatusCode( updateMsg.StatusCode );
				return updateMsg.data;
			} )   // Validate Status Code of updateMsg
			.then( cartData => {
				toReturn   = _responseTemplate( 201, 'Item amount has been updated in shopping Cart', cartData)
			} )
			.catch( error => {
				toReturn   = _responseTemplate( 404, 'User does not exist or invalid token' );
			} );
	} else {
		console.log( 'ERROR: [ handlers._carts.put ] - Missing or invalid required fields' );
		toReturn   = _responseTemplate( 412, 'ERROR: [ handlers._carts.put ] - Missing or invalid required fields' );
	}
	
	return toReturn;
};

/*
*                            * * *   TOKENS HANDLER   * * *
* */
/*
* Tokens - Handler
* */
handlers._tokens   = {};

/*
* Tokens - DELETE
*  Required data: queryStringObject → token
* Optional data: None
* Procedure description:   1. Validate if token exist
*                          2. Delete token
* */
handlers._tokens.delete   = async ( data ) => {
	console.log( ' Tokens '.bgGreen.black.bold, ' DELETE '.bgCyan.grey.bold );
	console.log( '[ handlers._tokens.delete ] - Tokens DELETE START');
	
	// Constants and variables
	let queryStringObject, tokenId, toReturn, tokenData;
	
	queryStringObject   = data.queryStringObject;
	tokenId   = _validateString( queryStringObject.id ) && queryStringObject.id.trim().length === 21 ? queryStringObject.id.trim() : false;
	toReturn  = {};
	tokenData = {};
	
	if ( tokenId ) {
		await _validateFileExist( 'tokens', tokenId )   // Validates if provided token exists
			.then( () => {
				return _read( 'tokens', tokenId );
			} )   // read token file
			.then( async readTokenMsg => {
				await _validateStatusCode( readTokenMsg.StatusCode );
				tokenData = readTokenMsg.data;
				return tokenData;
			} )   // Validate StatusCode readTokenMsg
			.then( async readTokenData => {
				await _validateFileExist( 'users', _createFileEncrypted( readTokenData.email ) );
				return readTokenData;
			} )   // Validate if user file exist
			.then( async readTokenData => {
				return await _read( 'users', _createFileEncrypted( readTokenData.email ) );
			} )   // Validate if user exists
			.then( async readUserMsg => {
				await _validateStatusCode( readUserMsg.StatusCode );
				return readUserMsg.data;
			} )   // Validate user's read message
			.then( async readUserData => {
				if ( readUserData.token === tokenData.id ) {
					readUserData.token   = '';
					return readUserData;
				} else {
					return false;
			} } )   // Validates if provided token is the same in User's token data, if yes, the it is deleted
			.then( async readUserData => {
				return await _update( 'users', _createFileEncrypted( tokenData.email ), readUserData );
			} )   // Update user's data, with an empty value in token
			.then( async  userUpdateMsg => {
				await _validateStatusCode( userUpdateMsg.StatusCode );
			} )   // Validate StatusCode userUpdateMsg
			.then( async () => {
				return await _delete( 'tokens', tokenId );
			} )   // Delete token provided
			.then( async deleteTokenMsg => {
				await _validateStatusCode( deleteTokenMsg.StatusCode );
			} )   // Validate token delete message
			.then( () => {
				toReturn   = _responseTemplate( 201, `Token has been deleted successfully`, {} );
			} )
			.catch( error => {
				toReturn   = _responseTemplate( 400, `ERROR:  [ handlers._tokens.delete ] Token could not be deleted - ERROR - ${ error.message }` );
			} );
	} else {
		toReturn   = _responseTemplate( 400, 'ERROR: [ handlers._tokens.delete] Missing required field (email) [ handlers._users.delete ]' );
	}
	return toReturn;
};

/*
* Tokens - GET
* Required data: queryStringObject → token
* Optional data: None
* Procedure description:  1. Validate token exists
*                         2. Retrieves token information or tokens list
* Two operations are available:
*     1. Get information of one token
*     2. Get a list of existing tokens
*
*      Description                    Path
* Get information of one token    http://localhost:3000/tokens?id=<validTokenId>
* Get a list of existing tokens   http://localhost:3000/tokens?all
* */
handlers._tokens.get   = async  data => {
	console.log( ' Tokens '.bgGreen.black.bold, ' GET '.bgCyan.grey.bold );
	console.log( '[ handlers._tokens.get ] - Tokens GET START');
	
	// Constants and variables
	let queryStringObject, tokenId, toReturn;
	
	queryStringObject   = data.queryStringObject;
	// Check that the ide provided is valid
	tokenId   = _validateString( queryStringObject.id ) && queryStringObject.id.trim().length === 21 ? queryStringObject.id.trim() : false;
	toReturn  = {};
	
	if ( tokenId ) {
		// Lookup the token
		// Validate token file exist
		await _validateFileExist( 'tokens', tokenId )
			.then( async () => {
				return await _read( 'tokens', tokenId );
			} )   // read token file
			.then( async readTokenMsg => {
				await _validateStatusCode( readTokenMsg.StatusCode )
				return readTokenMsg.data;
			} )   // validate StatusCode of readTokenMsg
			.then( async readTokenData => {
				_tokenSchema( readTokenData );
				return readTokenData;
			} )   // Validate token with tokenSchema
			.then( readTokenData => {
				readTokenData.expires   = _createDateFormat( readTokenData.expires );
				toReturn  = _responseTemplate( 200, 'Token fetched successfully', readTokenData );
			} )   // Return required token
			.catch( error =>  toReturn = _responseTemplate( 404, `ERROR: [ handlers._tokens.get ] - Invalid Token - ERROR: ${ error.message }` ) );
	} else {
		toReturn =   _responseTemplate( 400, 'ERROR: [ handlers._tokens.get ] Missing required field (id) ' );
	}
	return toReturn;
};

/*
* Tokens - POST
* Required data: payload → email, password
* Optional data: None
* Procedure description:  1. Validate user exists
*                         2. Create token object
*                         3. Stores token object
* */
handlers._tokens.post   = async data => {
	console.log( ' Tokens '.bgGreen.black.bold, ' POST '.bgCyan.grey.bold );
	console.log( '[ handlers._tokens.post ] - Tokens POST START');
	
	// Constants and variables
	let queryStringObject, email, hashedEmail, userData, toReturn;
	
	queryStringObject   = data.queryStringObject;
	email     = _validateString( queryStringObject.id ) && _validateEmail( queryStringObject.id ) ? queryStringObject.id : false;
	
	toReturn   = {};
	// Validate if all fields were provided
	if ( email) {
		// Validates if user exists
		hashedEmail   = _createFileEncrypted( email );
		userData   = {};
		await _validateFileExist( 'users', hashedEmail )
			.then( async () => {
				return await _read( 'users', hashedEmail );
			} )   // Read user file
			.then( async readUserMsg => {
				await _validateStatusCode( readUserMsg.StatusCode );
				userData   = readUserMsg.data;
			} )   // Validate readUserMsg StatusCode
			.then( async () => {
				return {
					email,
					id: nanoid(),
					expires: Date.now() + 1000 * 60 * 60 * 24
				};
			} )   // Create new tokenObj
			.then( tokenObj => {
				return _tokenSchema( tokenObj );
			} )   // Create new token object, validates it with token schema, and return new token object
			.then( async tokenObj => {
				return await _create('tokens', tokenObj.id, tokenObj);
			} )   // Create new token
			.then( async createTokenMsg => {
				await _validateStatusCode( createTokenMsg.StatusCode );
				return createTokenMsg.data;
			} )   // Validate token create message
			.then( async createTokenData => {
				if (_validateString( userData.token ) ) {
					const delMsg = await _delete('tokens', userData.token);
					await _validateStatusCode( delMsg.StatusCode );
				}
				return createTokenData;
			})   // If exist a previous token for this user, then it is deleted
			.then( async createTokenData => {
				userData.token   = createTokenData.id;
				await _update( 'users', hashedEmail, userData );
				return createTokenData;
			})   // User is updated with new token Id
			.then( createTokenData => {
				createTokenData.expires   = _createDateFormat( createTokenData.expires );
				toReturn   = _responseTemplate( 201, 'Token has been created successfully', createTokenData );
			} )
			.catch( toReturn   = _responseTemplate( 404, `ERROR: [ handlers._tokens ] Invalid provided data, user does not exist, or token already exists`, {} ) );
	} else {
		console.log( '[ handlers._tokens.post ] - ERROR: Missing required fields ' );
		toReturn   = _responseTemplate( 404, `ERROR: [ handlers._tokens ] Missed required fields `, {} );
	}
	return toReturn;
};

/*
* Tokens - PUT
* Required data: queryStringObject → token
* Optional data: None
* Procedure description:   1. Validate if token exists
*                          2. Reset token timer
*                          3. Update token data
* */
handlers._tokens.put   = async data => {
	console.log( ' Tokens '.bgGreen.black.bold, ' PUT '.bgCyan.grey.bold );
	console.log( '[ handlers._tokens.put ] - Tokens PUT START');
	
	// Constants and variables
	let payload, tokenId, extend,  toReturn;
	
	payload   = data.payload;
	tokenId   = _validateString( payload.id ) ? payload.id : false;
	extend    = _validateBoolean( payload.extend ) ? payload.extend : false;
	toReturn    = {};
	if ( tokenId && extend ) {
		// Lookup the token
		// Validate if token file exist
		await _validateFileExist( 'tokens', tokenId )
			.then( async () => {
				return await _read( 'tokens', tokenId );
			} )   // read token file
			.then( async readTokenMsg => {
				await _validateStatusCode( readTokenMsg.StatusCode )
				return readTokenMsg.data;
			} ) // Validate StatusCode token read message
			.then( readTokenData => {
				if ( readTokenData.expires > Date.now() )
					readTokenData.expires   = Date.now() + 1000 * 60 * 60 * 24;
				return readTokenData;
			} )  // Update token expires
			.then( async readTokenData => {
				_tokenSchema( readTokenData );
				return readTokenData;
			} )   // Validate token read with token Schema
			.then( async readTokenData => {
				return await _update( 'tokens', tokenId, readTokenData );
			} )   // Update token data
			.then( async updateTokenMsg => {
				await _validateStatusCode( updateTokenMsg.StatusCode );
				return updateTokenMsg.data;
			} )   // Validate update message
			.then( updateTokenData =>  {
				updateTokenData.expires   = _createDateFormat( updateTokenData.expires );
				toReturn    = _responseTemplate( 201, 'Token time has been restarted', updateTokenData );
			} )
			.catch( error => {
				toReturn = _responseTemplate(400, 'ERROR: [ handlers._tokens.put ] Specified token does not exist or it is expired ');
			} );
	} else {
		toReturn   = _responseTemplate( 400, 'ERROR: [ handlers._tokens.put ] Missing required field(s) or field(s) is/are invalid ' );
	}
	return toReturn;
};

/*
* Tokens - Verify token
* */
handlers._tokens.verifyToken   = async ( tokenId, email ) => {
	console.log( '[ handlers._tokes.verifyToken ] - verifyToken STARTS' );
	// Lookup the token
	// Constants and variables
	let toReturn;
	toReturn    = {};
	await _validateFileExist( 'tokens', tokenId )   // Validate if token file exists
		.then( async () => {
			console.log( '[ handlers._tokes.verifyToken ] - Token exist' );
			return await _read( 'tokens', tokenId );
		} )   // Read token file
		.then( async readTokenMsg => {
			console.log( '[ handlers._tokes.verifyToken ] - readTokenMsg: ', readTokenMsg );
			await _validateStatusCode( readTokenMsg.StatusCode );
			return readTokenMsg;
		} )   // Validate tokenMsg
		.then( async readTokenMsg => {
			await _validateTokenExpires( readTokenMsg.data, email );
			return readTokenMsg;
		} )   // Validate if token is not expired
		.then( readTokenMsg => {
			toReturn    = _responseTemplate( 200, 'Valid Token', readTokenMsg.data );
		} )
		.catch( error => {
			toReturn   = _responseTemplate( 412, `[ handlers._tokens.verifyToken ] - Invalid token or token expired - ERROR: ${ error.message }` );
		} );
	return toReturn;
};



/*
*                            * * *   USERS HANDLER   * * *
* */
/*
* Users - Handler
* */
handlers._users   = {};

/*
* Users - DELETE
* Required data: queryStringObject → email
*                headers → token
* Optional data: None
* Procedure description:  1. Validate token
*                         2. Validate user exists
*                         3. Delete token, delete shoppingCart (if exists in user), delete user
* */
handlers._users.delete   = async data => {
	console.log( ' Users '.bgBlack.red.bold, ' DELETE '.bgCyan.grey.bold );
	console.log( '[ handlers._users.delete ] users DELETE START' );
	
	// Constants and variables
	let queryStringObject, headers, email, hashedEmail, token, toReturn;
	
	queryStringObject   = data.queryStringObject || false;
	headers   = data.headers || false;
	// Check that the email was provided and it is valid
	email   = _validateEmail( queryStringObject.id ) && _validateString( queryStringObject.id ) ?  queryStringObject.id : false;
	token   = _validateString( headers.token ) ? headers.token : false;
	toReturn  = {};
	
	if ( email && token ) {
		hashedEmail    = _createFileEncrypted( email );
		// Validates if provided user exist
		await _validateFileExist( 'users', hashedEmail )
			.then( async () => {
				await _validateFileExist( 'tokens', token );
			} )   // Validate if provided token exist
			.then( async () => {
				return await _read( 'users', hashedEmail );
			} )
			.then( async readUserMsg => {
				await _validateStatusCode( readUserMsg.StatusCode );
			} )   // Validate user read message
			.then( async () => { return await handlers._tokens.verifyToken( token, email ); } )   // Validates token
			.then( async verifyTokenMsg => { await _validateStatusCode( verifyTokenMsg.StatusCode ) } )   // Validate verifyToken message
			.then( async () => { await _delete( 'users', hashedEmail ) } )   // Delete user provided
			.then( async () => { await _delete( 'tokens', token ) } )   // Delete token assigned to deleted user
			.then( async () => toReturn   = _responseTemplate( 201, `${ email } user has been deleted successfully`, {} ) )
			.catch( error => { toReturn   = _responseTemplate( 400, `ERROR: [ handlers._users.delete ] Invalid userId - ERROR: ${ error.message }`); }  );
	} else {
		toReturn   = _responseTemplate( 400, 'ERROR: Missing required field (email) [ handlers._users.delete ]' );
	}
	return toReturn;
};

/*
* Users - GET
Required data: queryStringObject → email
*                headers → token
* Optional data: None
* Description:  1. Validate email and token
*               2. Validate token
*               3. Validates user exists
*               4. Return user object or Error message
*
* Two operations are available:
*              1. Get information of one user   --> retrieves information of provided mail's user
*              2. Get a list of existing users  --> retrieves a list of users
*
*      Description                            Path
* Get information of one user    http://localhost:3000/users?valid@email.com
* Get a list of existing users   http://localhost:3000/users?all
* */
handlers._users.get   = async data => {
	console.log( ' Users '.bgBlack.red.bold, ' GET '.bgCyan.grey.bold );
	console.log( '[ handlers._users.get ] users GET START' );
	
	// Constants and variables
	let headers, queryStringObject, email, hashedEmail, token, toReturn;
	
	headers   = data.headers || false;
	queryStringObject   = data.queryStringObject || false;
	// Check that the email provided is valid
	email   = _validateString( queryStringObject.id ) && _validateEmail( queryStringObject.id ) ? queryStringObject.id : false;
	token   = _validateString( headers.token ) ? headers.token : false;
	hashedEmail   = _createFileEncrypted( email );
	toReturn   = {};
	// Verify that given token is valid for the email
	if ( email ) {
		// Verify that the given token is valid for the email
		const verifyTokenMsg   = await handlers._tokens.verifyToken( token, email );   // Validate token and email
		await _validateStatusCode ( verifyTokenMsg.StatusCode )   // Validate verifyToken message
			.then( async () => {
				await _validateFileExist( 'users', hashedEmail );
			} )   // Validate if user file exist
			.then( async () => {
				return await _read('users', hashedEmail );
			} )   // Read user file
			.then( async readUserMsg => {
				console.log( '[ handlers._users.get ] - : ',  );
				await _validateStatusCode( readUserMsg.StatusCode );
				return readUserMsg.data;
			} )  // Validate user read message
			.then( readUserData => {
				_userSchema( readUserData );
				return readUserData;
			} )   // Validate read data with schema
			.then( readUserData => {
				delete readUserData.password;
				toReturn   = _responseTemplate( 200, 'User fetched successfully', readUserData );
			})
			.catch( error => {
				toReturn   = _responseTemplate( 403, `ERROR: [ handlers._users.get ] Missed required header field, or token is invalid - ERROR: ${ error.message }` );
			} );
	} else {
		toReturn   = _responseTemplate( 400, 'ERROR: [ handlers._users.get ] Missing required field (email) ' );
	}
	return toReturn;
};

/*
* Users - POST
* Required data: payload → email, address, password, name
* Optional data: None
* Description:  1. Validates email, password, address and name
*               2. Creates user object
*               3. Generate tokenId
*               4. Generate token timer
*               5. Validates user exists
*               6. Create user and token
*
* * All data is required to create the user, and two more fields are filled automatically:
*        shoppingCartId: false   --> is a boolean, is true if the user has a shoppingCart
*        ordersBckp: []          --> will contain all the purchase purchaseOrders made by the user
* */
handlers._users.post   = async data => {
	console.log( ' Users '.bgBlack.red.bold, ' POST '.bgCyan.grey.bold );
	console.log( '[ handlers._users.post ] users POST START' );
	
	// Constants and variables
	let payload, email, hashedEmail, address, password, name, tosAgreement, toReturn;
	
	payload   = data.payload;
	email     = ( _validateString( payload.email ) && _validateEmail( payload.email ) ) ? payload.email : false;
	address   = _validateString( payload.address ) ? payload.address : false;
	password  = _validateString( payload.password ) ? _createHash( payload.password ) : false;
	name      = _validateString( payload.name ) ? payload.name : false;
	tosAgreement   = _validateBoolean( payload.tosAgreement) ? payload.tosAgreement : false;
	toReturn   = {};
	// Validate if all fields were provided
	if ( email && address && name && password ) {
		hashedEmail   = await _createFileEncrypted( email );
		await _validateFileDontExist( 'users', hashedEmail )
			.then( value => {
				console.log( '[ handlers._users.post ] - value: ', value );
				return {
					id : nanoid(),
					address,
					email,
					name,
					password,
					token : '',
					tosAgreement
				}
			} )
			.then( async userObj => {
				return await _create( 'users', hashedEmail, userObj );
			} )
			.then( userObj => {
				toReturn   = _responseTemplate( 201, 'User has been created successfully', userObj.data )
			} )
			.catch( error => {
				toReturn = _responseTemplate(400, `[ handlers._users.post ] - User could not be created, it could already exists - ERROR: ${ error.message }` );
			} );
	} else {
		console.log( '[ handlers._users.post ] - ERROR: ERROR - ERROR - ERROR' );
		return _responseTemplate( 400, 'ERROR: [ handlers._users.post ] Missing data ', {} );
	}
		return toReturn;
	
	
};

/*
* Users - PUT
* Required data: payload → address, password, name
*                queryStringObject → email
*                headers → token
* Optional data: None
* Procedure description:  1. Validate token
*                         2. Validate if user exists in database/file
*                         3. Update user data
*
* email cannot be updated, because it is used as id in several parts of the application
* */
handlers._users.put   = async data => {
	console.log( ' Users '.bgBlack.red.bold, ' PUT '.bgCyan.grey.bold );
	console.log( '[ handlers._users.put ] users PUT START' );
	
	// Constants and variables
	let headers, payload, queryStringObject, email, hashedEmail, address, password, name, tosAgreement, token, newDataValues, toReturn;
	
	headers   = data.headers;
	payload   = data.payload;
	queryStringObject   = data.queryStringObject;
	email     = ( _validateString( queryStringObject.id ) && _validateEmail( queryStringObject.id ) ) ? queryStringObject.id : false;
	address   = _validateString( payload.address ) ? payload.address : false;
	password  = _validateString( payload.password ) ? _createHash( payload.password ) : 'fakePassword';
	name      = _validateString( payload.name ) ? payload.name : false;
	tosAgreement   = _validateBoolean( payload.tosAgreement) ? payload.tosAgreement : false;
	token     = _validateString( headers.token ) ? headers.token : false;
	toReturn    = {};
	
	if ( _validateString( payload.email ) ) {
		console.log( '[ handler._users.put ] - email cannot be updated ' );
		toReturn = _responseTemplate( 400, `ERROR:  [ handlers._users.put ] email cannot be updated, it is a key value` );
	} else {
		if (email) {
			if (address || password || name || tosAgreement) {
				newDataValues   = { id: 'fakeidfakeidfakeidfak', address, email, name, password, token : 'faketokenfaketokenfak', tosAgreement };   // Create new user, with provided data and some fake data, for schema validation
				hashedEmail   = _createFileEncrypted( email );
				// Validate token
				// const verTokenMsg = await handlers._tokens.verifyToken(token, email);
				await _validateFileExist( 'users', hashedEmail )   // Validate if user file exist
					.then( async () => {
						console.log( '[ handler._users.put ] - User exist ' );
						await _validateFileExist( 'tokens', token )
					} )   // Validate if token file exist
					.then( async () => {
						console.log( '[ handler._users.put ] - Token exist ' );
						return await handlers._tokens.verifyToken(token, email)
					} ) // Validate if token is valid
					.then( async verTokenMsg => {
						console.log( '[ handler._users.put ] - verTokenMsg: ', verTokenMsg );
						await _validateStatusCode(verTokenMsg.StatusCode);
					} )   // Validate verifyToken message
					.then(async () => {
						console.log( '[ handler._users.put ] - reading user ' );
						return await _read('users', hashedEmail)
					})   // Read user file
					.then(async readMsg => {
						console.log( '[ handler._users.put ] - readMsg: ', readMsg );
						await _validateStatusCode(readMsg.StatusCode);
						return readMsg.data;
					})   // Validate user read message
					.then( async readData => {
						console.log( '[ handler._users.put ] - readData1: ', readData );
						await _userSchema( newDataValues );
						return readData;
					} )
					.then(async readData => {
						newDataValues.id   = false;
						newDataValues.token= false;
						if ( newDataValues.password === 'fakePassword' ) newDataValues.password = false;
						console.log( '[ handler._users.put ] - readData2: ', readData );
						return await _validateValuesChange( readData, newDataValues );
					})   // Validate if some new information has been provided
					.then( valChangeMsg => {
						_validateStatusCode( valChangeMsg.StatusCode  );
						return valChangeMsg.data;
					} )   // Validate validateValuesChange message
					.then(async newData => {
						return await _update('users', hashedEmail, newData );
					})   // Update user with new provided data
					.then( async updateMsg => {
						await _validateStatusCode(updateMsg.StatusCode);
						delete updateMsg.data.password;
						return updateMsg.data;
					})   // Validate update user message
					.then( updateMsg => {
						toReturn = _responseTemplate(201, 'Fields have been updated successfully', updateMsg );
					})
					.catch( error => {
						toReturn = _responseTemplate(400, `ERROR: [ handlers._users.put ] Invalid token provided - ERROR: ${ error.message }` );
					} );
			} else {
				toReturn = _responseTemplate(400, 'ERROR: None field was provided to update [ handlers._user.put ]');
			}
		} else {
			toReturn = _responseTemplate(400, 'ERROR: Missing required field (email) [ handlers._users.put ]');
		}
	}
	return toReturn;
};


module.exports   = handlers;
