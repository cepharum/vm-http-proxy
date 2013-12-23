var HTTP    = require( "http" );

var VM      = require( "lxc" );
var NETWORK = require( "network" );
var CONFIG  = require( "config" );
var LOG     = require( "log" );


NETWORK.initializeAdressMap( VM.getAvailableContainers() );

var requestId = 0;

function http_listener( request, response ) {

	/*
	 * create some passable context of current request to be responded
	 */
	
	var ctx = {

		// unique index/ID of current request (e.g. to use in related log entries)
		index : ( "00000000" + String( ++requestId ) ).substr( -8 ),

		// request to process
		request  : request,

		// response to provide
		response : response,

		// convenience method for rendering gateway/proxy error document
		renderException : function( exception ) {
			var code  = exception.status || 500;
			var title = exception.title || "Request Failed";
			var text  = exception.text || exception || "The server encountered malfunction on processing your request.";

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

	
	/*
	 * extract name of host this request is actually targeting at
	 */

	var hostname = request.headers.host;
	if ( !hostname )
		ctx.renderException( { 
			status: 400, 
			title: "Missing Hostname", 
			text: "Your request is missing name of target host."
			} );
	else
	{
		/*
		 * try to get private IP address of VM this request is actually targeting at
		 */

		NETWORK.nameToAddress( ctx, hostname, function( ctx, ipv4 ) {

			/*
			 * forward request to found VM's web service
			 */

			// log request
			LOG.info( "%s: %s %s %s", ctx.index, request.method, request.headers.host, request.url );
			
			// extend headers to include X-Forwarded-For
			var headers = request.headers;

			if ( "x-forwarded-for" in headers )
				headers["x-forwarded-for"] += ", " + request.socket.remoteAddress;
			else
				headers["x-forwarded-for"] = request.socket.remoteAddress;

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

HTTP.createServer( http_listener ).listen( 80, CONFIG.ipAddress );
