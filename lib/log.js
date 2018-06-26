/**
 * This file is part of cepharum's vm-http-proxy.
 *
 * vm-http-proxy - http proxy routing incoming requests to LXC vm instances
 *
 * Copyright (C) 2014 cepharum GmbH, Berlin
 *
 * vm-http-proxy is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * vm-http-proxy is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see http://www.gnu.org/licenses/.
 */

/**
 * Configurable Logging Facility
 *
 * This module exports a method for every log level declared in supportedLevels
 * below. Every declared method is taking arbitrary number of arguments to be
 * forwarded to util.format() to build the message to be logged finally.
 *
 * In configuration minLogLevel may be set to one of the supportedLevels. The
 * default is "info". Any level preceding that on in supportedLevels won't be
 * logged, resulting in NOP methods exported actually.
 *
 * @author Thomas Urban <thomas.urban@cepharum.de>
 * @package vm-http-proxy
 * @license GPLv3
 */

// ----------------------------------------------------------------------------

var supportedLevels = [ "debug", "info", "error" ];

// ----------------------------------------------------------------------------

var UTIL   = require( "util" );

var CONFIG = require( "../config" );

// ----------------------------------------------------------------------------

function nop() {}

var minLevel = supportedLevels.indexOf( ( CONFIG.minLogLevel || "info" ).toLowerCase() );

supportedLevels.forEach( function( name, index )
{
	if ( index >= minLevel )
	{
		var levelName = " [" + name.toUpperCase() + "] ";

		module.exports[name] = function()
		{
			console.error( new Date().toString() + levelName + UTIL.format.apply( this, arguments ) );
		};
	}
	else
	{
		module.exports[name] = nop;
	}
} );
