// Dependencies
const { superstruct } = require( 'superstruct' );
const {
	_validateArray,
	_validateDate,
	_validateEmail,
	_validateFloatNumber,
	_validateNumber,
	_validateString
} = require( '../services/helpers' );


const struct   = superstruct( {
	types: {
		amount   : value => _validateNumber( value ),
		amountFloat : value => _validateFloatNumber( value ),
		date     : value => _validateDate( new Date( value ) ),
		email    : value => _validateString( value ) && _validateEmail( value ),
		item     : value => _validateString( value.id ) && value.id.length === 21
			             && _validateString( value.name ) && _validateNumber( value.price )
		                 && _validateString( value.description ) && _validateNumber( value.amount )
		                 && _validateArray( value.shoppingCartsList ),
		stringValue  : value => _validateString( value ),
		stringHashedValue : value => _validateString( value ) && value.length === 21,
		
	}
} );

const _userSchema   = struct( {
	id             : 'stringHashedValue',    // user id, random generated
	email          : 'email',                // user email, must be a valid e-mail address format
	address        : 'stringValue',          // user address
	name           : 'stringValue',          // user name
	password       : 'stringValue',          // user password
	token          : 'stringHashedValue',    // linked token
	tosAgreement   : 'boolean',              // tos agreement (true/false)
} );

const _tokenSchema  = struct( {
	id      : 'stringHashedValue',   // token id, random generated
	email   : 'email',               // user email, must be a valid e-mail address format
	expires : 'date',                // token time-to-live
} );

const _itemSchema   = struct( {
	id                  : 'stringHashedValue',   // item id, random generated
	name                : 'stringValue',         // item name
	price               : 'amountFloat',              // item price
	description         : 'stringValue',         // item description
	amount              : 'amount',              // item amount, available quantity of items
	shoppingCartsList   : 'array',               // linked shopping Carts
} );

const _itemShoppingCartSchema   = struct( {
	id          : 'stringHashedValue',   // item id, random generated
	name        : 'stringValue',         // item name
	price       : 'amountFloat',              // item price
	amount      : 'amount',              // item amount required
	totalItem   : 'amountFloat',              // total amount in shopping cart
} );

const _menuSchema   = struct( {
	id    : 'stringValue',   // menu id, random generated
    items : 'array'          // array of item object
} );

const _shoppingCartSchema   = struct( {
	id   : 'stringHashedValue',   // shopping cart id, random generated
	total: 'amount',              // total value of the sum of values and quantities of items
	items: 'array'                // array of added items ( itemShoppingCartSchema ), including description and price
} );

const _orderSchema   = struct( {
	id   : 'stringHashedValue',  // order id, random generated
	country  : 'stringValue',    // country of payment method origin
	customer : 'stringValue',    // customer name
	email    : 'stringValue',    // customer email
	currency : 'stringValue',    // currency of payment
	total    : 'amountFloat',         // total amount of the PO
	last4    : 'amount',           // last four digits of Credit Card
	items    : 'array',       // all items of PO, including unit price and required quantity
	paymentMethod : 'stringValue', // payment Method ( Credit Card, Cash, Transfer, ... )
	authorization : 'boolean',     // boolean, true/false for authorization to emmit order
	shoppingCartId: 'stringHashedValue', // shopping cart id
	authorizationDate : 'date',     // Date of authorization
} );


module.exports   = {
	_itemSchema,
	_itemShoppingCartSchema,
	_menuSchema,
	_orderSchema,
	_shoppingCartSchema,
	_tokenSchema,
	_userSchema
};
