vm-http-proxy
=============

simple HTTP reverse proxy forwarding requests to local VMs



# About

vm-http-proxy is a very simple HTTP reverse proxy used to forward incoming requests to one of several available
VMs running on same physical host as vm-http-proxy. By intention this is required on physical hosts available 
over single IPv4 address but providing several virtual machines each having its own HTTP providing different 
kind of web application.

## Current Status

This software has been in use on some of our servers for several years now. Nonetheless it is provided as-is and w/o any warranty. __Thus, you may use it at your very own risk.__

Currently, support is limited to LXC containers. It is planned to refactor internal structure for providing 
module-based support for different kinds of virtual machines.

## How is it working?

The proxy is processing all incoming HTTP requests by looking up hostname provided in property `Host:` contained
in header of each request. Looking up hostname is considered to result in a local VM's IP this request is then forwarded to. The response of local VM is passed back to initially requesting HTTP client finally.

### What is meant by "looking up hostname"?

The script is extracting a map of IPv4 and IPv6 addresses from all local LXC containers' configuration files.
Target VM is selected by looking up IPv6 AAAA record of host named in HTTP request. The returned IPv6 address is then looked up in address map extracted before resulting in VM's (obviously local-only) IPv4 address the request is forwarded to, finally.

### Example VM Server Setup

In our blog there is a [tutorial](http://blog.cepharum.de/en/post/lxc-host-featuring-ipv6-connectivity.html) 
describing how to set up a physical host running LXC-based VM containers including support for IPv6 and IPv4. 
The resulting setup is perfectly suitable for running *vm-http-proxy* as we do on our VM servers.



# System Requirements

This software is designed to run under Linux, but may work fine with BSD or similar as well. It's currently tested in combination with Ubuntu Linux, only. You're welcome to test it with other distributions.

The vm-http-proxy is implemented in Javascript. It's using Node.JS and thus you have to install Node.JS to 
be available as /usr/bin/node. Please use latest stable release available at www.nodejs.org.

## Further Prerequisites

Currently the proxy works with LXC, only. It's expecting all LXC containers to be located in /var/lib/lxc. This folder may be adjusted in configuration file `config.js`.



# Installation

1. [Download ZIP](https://github.com/cepharum/vm-http-proxy/archive/master.zip) to your physical host running LXC containers und unzip it into folder of your choice. It's okay to put it under /opt or into subfolder of your unprivileged user's home directory.
2. Copy `config.js.dist` to `config.js`.
3. Adjust configuration in file `config.js`. Basically, adjust the IPv4 address to listen on for incoming requests to be forwarded.
4. Invoke run.sh to instantly test the proxy.

## Install System Service

### Ubuntu Linux

#### Using Upstart (until 14.04 LTS)

In Ubuntu Linux you may install new upstart job like this:

1. Update `vm-http-proxy.conf` to contain proper pathname. Change `/home/myuser/vm-http-proxy` to the pathname of local installation folder of vm-http-proxy.
2. Copy `vm-http-proxy.conf` to `/etc/init`.
3. Start service w/ `start vm-http-proxy`

#### Using systemd (since 16.04 LTS)

When using systemd you may install vm-http-proxy as a service like this:

1. Update `vm-http-proxy.service` to contain proper pathname. Change `/home/myuser/vm-http-proxy` to the pathname of local installation folder of vm-http-proxy.
2. Copy `vm-http-proxy.service` to `/etc/systemd/system`.
3. Let systemd discover this new service by running `systemctl daemon-reload`.
4. Start service w/ `systemctl start vm-http-proxy`.
