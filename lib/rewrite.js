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

/*
 * early redirection support
 *
 * This module implements processor for optionally redirecting requests using
 * HTTP Moved responses rather than transparently forwarding to VM.
 *
 * @author Thomas Urban <thomas.urban@cepharum.de>
 * @package vm-http-proxy
 * @license GPLv3
 */

var CONFIG = require( "../config" );

var LOG    = require( "./log" );


module.exports.processRequest = function() {};

if ( Array.isArray( CONFIG.rewrites ) ) {
	var rewrites = CONFIG.rewrites.filter( function( rewrite ) {
		return rewrite && typeof rewrite === "object" && 
		       rewrite.hasOwnProperty( "from" ) && 
		       rewrite.hasOwnProperty( "to" );
	} );

	if ( rewrites.length ) {
		module.exports.processRequest = function( ctx ) {
			var rewritten = false;

			rewrites.forEach( function( rewrite ) {
				if ( rewrite.from instanceof RegExp ) {
					ctx.hostname = String( ctx.hostname ).replace( rewrite.from, rewrite.to );
					rewritten = true;
					LOG.debug( "%s: rewriting hostname to %s", ctx.index, ctx.hostname );
				} else if ( rewrite.from === ctx.hostname ) {
					ctx.hostname = String( rewrite.to );
					rewritten = true;
					LOG.debug( "%s: rewriting hostname to %s", ctx.index, ctx.hostname );
				}
			} );

			return rewritten;
		};
	}
}
