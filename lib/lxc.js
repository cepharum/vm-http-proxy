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

var FS   = require( "fs" );
var PATH = require( "path" );

module.exports.getAvailableContainers = function()
{
	var rootFolder = require( "../config" ).lxcRootFolder;

	var lxcFolders = FS.readdirSync( rootFolder );
	if ( !lxcFolders )
		return "failed to enumerate existing LXC instances";


	var map = {};
	var ptnAddresses = /^\s*lxc\.network\.(?:ipv4\s*=\s*((?:\d+\.)+\d+)|ipv6\s*=\s*((?:[\da-fA-F]+::?)+[\da-fA-F]+))/gm;

	lxcFolders.forEach( function( lxcName ) {
		var lxcFolder = PATH.join( rootFolder, lxcName );

		if ( FS.statSync( lxcFolder ).isDirectory() ) {
			var configName = PATH.join( lxcFolder, "config" );

			if ( FS.statSync( configName ).isFile() ) {
				var config = FS.readFileSync( configName, { encoding: "utf-8" } );
				if ( typeof config == "string" ) {

					var info = { 
								ipv4: [], 
								ipv6: [], 
								name: lxcName, 
								folder: lxcFolder,
								};

					while ( match = ptnAddresses.exec( config ) ) {
						if ( match[1] ) {
							info.ipv4.push( match[1] );
						} else {
							info.ipv6.push( match[2] );
						}
					}

					map[lxcName] = info;
				}
			}
		}
	} );

	
	module.exports.getAvailableContainers = function() {
		return map;
	};

	return map;
};
