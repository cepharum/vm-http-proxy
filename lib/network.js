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

var DNS = require( "dns" );

var LOG = require( "./log" );



var dnsCache = {};
var map6To4 = {};


module.exports.initializeAdressMap = function( objContainers ) {
	Object.keys( objContainers ).forEach( function( vmName ) {
		var info = objContainers[vmName];

		if ( info.ipv4.length > 0 && info.ipv6.length > 0 ) {
			var ipv4 = info.ipv4[0];

			info.ipv6.forEach( function( ipv6 ) {
				map6To4[ipv6] = ipv4;
			} );
		}
	} );
};

module.exports.nameToAddress = function( requestContext, hostname, fncCallback ) {
	LOG.debug( "RESOLV hostname=%s", hostname );
	if ( hostname in dnsCache ) {
		LOG.debug( "RESOLV cache-hit hostname=%s ipv4=%s", hostname, dnsCache[hostname] );
		fncCallback( requestContext, dnsCache[hostname] );
	}
	else {
		LOG.debug( "RESOLV cache-miss hostname=%s", hostname );
		DNS.resolve6( hostname, function( error, addresses ) {
			if ( error )
				return requestContext.renderException( { 
					status: 404, 
					title: "Unknown Hostname", 
					text: "Failed to resolve name of requested target host." 
					} );

			if ( !addresses.some( function( address ) {
				if ( address in map6To4 ) {
					LOG.debug( "RESOLV cache-miss resolved hostname=%s ipv6=%s ipv4=%s", hostname, address, map6To4[address] );
					dnsCache[hostname] = address = map6To4[address];

					fncCallback( requestContext, address );

					return true;
				}
			} ) )
				return requestContext.renderException( { 
					status: 404, 
					title: "Unknown Hostname", 
					text: "Requested target host does not exist."
					} );
		} );
	}
};
