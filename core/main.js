var HTTP     = require( "http" );
var HTTPS    = require( "https" );
var FS       = require( "fs" );
var URL      = require( "url" );

var CONFIG   = require( "config" );
var REDIRECT = require( "redirect" );
var NETWORK  = require( "network" );
var LOG      = require( "log" );



NETWORK.initializeAdressMap( CONFIG.vmPlugin.getAvailableContainers() );

var requestId = 0;

function http_listener( request, response, blnSecure ) {

	/*
	 * create some passable context of current request to be answered
	 */

	var ctx = {

		// unique index/ID of current request (e.g. to use in related log entries)
		index : ( "00000000" + String( ++requestId ) ).substr( -8 ),

		// hostname selected in request
		hostname : null,

		// original URL
		originalUrl : null,

		// request to process
		request  : request,

		// response to provide
		response : response,

		// mark if request is using secure connection
		isHttps : ( blnSecure === true ),

		// convenience method for rendering gateway/proxy error document
		renderException : function( exception ) {
			var code  = exception.status || 500;
			var title = exception.title  || "Request Failed";
			var text  = exception.text   || exception || "The server encountered malfunction on processing your request.";

			LOG.error( "%s: %d: %s - %s (%s //%s%s)", ctx.index, code, title, text, request.method, request.headers.host, request.url );

			response.writeHead( code, { "Content-Type": "text/html" } );
			response.end( [
			    "<html>",
			    "<head>",
			    "<title>",
			    title,
			    "</title>",
			    "</head>",
			    "<body>",
			    "<h1>",
			    title,
			    "</h1>",
			    "<p>",
			    text,
			    "</p>",
			    "</body>",
			    "</html>",
			].join( "\n" ) );
		},
	};


	// log request
	LOG.info( "%s: %s %s %s%s", ctx.index, request.method, request.headers.host, request.url, ctx.isHttps ? " (https)" : "" );



	// save originally requested URL for it's adjusted next
	ctx.originalUrl = ( ctx.isHttps ? "https://" : "http://" ) + ctx.request.headers.host + ctx.request.url;

	/*
	 * extract name of host this request is actually targeting at
	 */

	if ( ctx.isHttps && ( !CONFIG.sslHostname || request.headers.host == CONFIG.sslHostname ) ) {
		// HTTPS: extract first part of pathname to select host

		// extract pathname from request URL and split into pieces
		var url  = URL.parse( request.url );
		var path = url.pathname.split( "/" );

		path.shift();	// first piece is empty due to leading slash in pathname

		// second piece is considered to contain hostname to use
		ctx.hostname = path.shift();

		// recompile adjusted URL after extracting hostname from URL
		url.pathname = "/" + path.join( "/" );
		request.url  = URL.format( url );
	} else {
		// HTTP: hostname is selected in header field "Host"
		ctx.hostname = request.headers.host;
	}

	if ( !ctx.hostname )
		ctx.renderException( {
			status: 400,
			title: "Missing Hostname",
			text: "Your request is missing name of target host."
			} );
	else if ( !REDIRECT.processRequest( ctx ) )
	{
		/*
		 * try to get private IP address of VM this request is actually targeting at
		 */

		NETWORK.nameToAddress( ctx, ctx.hostname, function( ctx, ipv4 ) {

			/*
			 * forward request to found VM's web service
			 */

			// extend headers to include X-Forwarded-For
			var headers = request.headers;

			if ( "x-forwarded-for" in headers )
				headers["x-forwarded-for"] += ", " + request.socket.remoteAddress;
			else
				headers["x-forwarded-for"] = request.socket.remoteAddress;

			headers["x-https"] = ctx.isHttps ? "1" : "";
			headers["x-original-url"] = ctx.originalUrl;

//			delete headers.connection;

			var bytesReturned = 0;
			var bytesReceived = 0;

			// create subrequest
			var subrequest = HTTP.request( {
				hostname: ipv4,
				port: 80,
				path: request.url,
				method: request.method,
				headers: headers,
			}, function( subresponse ) {
				// ensure to log again after response has been passed completely

				var headerPass = function()
				{
					response.writeHead( subresponse.statusCode, subresponse.headers );
					headerPass = function(){};
				};

				subresponse.on( "end", function() {
					headerPass();

					LOG.info( "%s: %d %s %d %d", ctx.index, subresponse.statusCode, subresponse.headers["content-type"] || "-", bytesReceived, bytesReturned );
				} );

				// pass response headers prior to first data is passed back from subresponse
				subresponse.on( "data", function( chunk ) {
					headerPass();

					// count bytes returned and passed in response
					bytesReturned += chunk.length;
				} );

				// pass all subresponse data in response to incoming request
				subresponse.pipe( response );
			} );

			// ensure to provide response in case of subrequest fails
			subrequest.on( "error", function( error ) {
				LOG.error( "%s: subrequest failed: %s", ctx.index, error );

				ctx.renderException( {
					status: 502,
					title: "Target Offline",
					text: "Requested website is (temporarily) offline."
				} );
			} );

			// count bytes received and passed in request
			subrequest.on( "data", function( chunk ) {
				bytesReceived += chunk.length;
			} );

			// pass all data of incoming request into subrequest
			request.pipe( subrequest );
		} );
	}
}

// create HTTP listener
HTTP.createServer( http_listener ).listen( 80, CONFIG.ipAddress );


if ( CONFIG.enableHttps ) {
	// use wrapper on HTTPS request for adjusting context of shared HTTP listener
	function https_listener( request, response ) {
		return http_listener( request, response, true );
	}

	// create HTTPS listener
	HTTPS.createServer( {
		key: CONFIG.certificateKey || FS.readFileSync( CONFIG.certificateKeyFilename ),
		cert: CONFIG.certificate || FS.readFileSync( CONFIG.certificateFilename )
	}, https_listener ).listen( 443, CONFIG.ipAddress );
}
