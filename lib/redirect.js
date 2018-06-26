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



/*
 * NOP implementation for shared use in different situations.
 */

function nop() {}


/**
 * Processes incoming requests to optionally being redirected rather than
 * forwarded to VM.
 *
 * This method is designed to process a set of redirection rules applied on
 * URL of incoming requests optionally resulting in a response instructing
 * client to re-request some different URL.
 *
 * This method is a NOP unless there is some usable configuration. The actual
 * processor function is assigned on preprocessing configured rule set below.
 *
 * @param context {Object} context of request to be processed
 * @return {Boolean} true to indicate client being redirected already
 */

module.exports.processRequest = nop;


/*
 * set of usable redirection rules
 */

var redirections = [];


/*
 * validate and optimize redirection rules
 */

var map = CONFIG.redirections;

if ( map && map instanceof Array && map.length > 0 )
{
	// qualify all valid rules in configuration
	map.forEach( function( rule )
	{
		if ( rule instanceof Array )
		{
			// assume short form:
			// [ /pattern/, "target$1", { statusCode: 304 }, function( ctx, origUrl, target ) { ... } ]

			redirections.push( {
				pattern: rule[0],
				target: rule[1],
				options: rule[2] instanceof Object ? rule[2] : {},
				processor: rule[3] instanceof Function ? rule[2] : nop,
			} );
		}
		else if ( rule instanceof Object && rule && rule.pattern instanceof RegExp )
		{
			// assume long form:
			// {
			//   pattern: /pattern/,
			//   target: "target$1",
			//   options: { statusCode: 304 },
			//   processor: function( ctx, origUrl, target ) { ... },
			// }

			// assure rule is having set of options
			if ( !( rule.options instanceof Object ) )
				rule.options = {};

			// assure rule is having some processor (NOP by default)
			if ( !( rule.processor instanceof Function ) )
				rule.processor = nop;

			// enqueue rule
			redirections.push( rule );
		}
	} );


	// actually got some valid redirections?
	if ( redirections.length > 0 )
	{
		// yes -> enable code optionally redirecting all incoming requests
		module.exports.processRequest = function( context )
		{
			LOG.debug( "%s looking up redirection map", context.index );

			// recompile some absolute URL including scheme and hostname of request
			// (though https-URL probably differ from client's actual request)
			var prefix = ( context.isHttps ? "https://" : "http://" ) + context.hostname;
			var url    = prefix + context.request.url;

			// iterate over all configured redirection rules to follow
			// first matching one
			return redirections.some( function( rule )
			{
				LOG.debug( "%s testing /%s/ => %s on %s", context.index, rule.pattern.source, rule.target, url );

				// is current rule adjusting request's URL?
				var target = url.replace( rule.pattern, rule.target || "" );
				if ( target != url )
				{
					// yes -> redirect accordingly

					LOG.debug( "%s redirecting %s to %s", context.index, url, target );

					// ask optional processor of rule to redirect
					if ( !rule.processor( context, url, target ) )
					{
						// optional processor didn't redirect
						// -> redirect internally

						if ( target.length > 0 )
						{
							// scheme and hostname didn't change on replacing
							// -> reduce URL to be local
							if ( target.substr( 0, prefix.length ) === "prefix" )
							{
								target = target.substr( prefix.length );
							}

							// respond to redirect
							context.response.writeHead( rule.options.statusCode || 302, {
									"Location": target,
									"Content-Type" : rule.options.contentType || "text/html",
								} );

							context.response.end();
						}
						else
						{
							LOG.info( "%s: blocking request for %s", context.index, url );
						}
					}

					// stop iteration of redirection rules
					return true;
				}
			} );
		};
	}
}
