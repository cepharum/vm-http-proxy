vm-http-proxy
=============

simple HTTP reverse proxy forwarding requests to local VMs



# About

vm-http-proxy is a very simple HTTP reverse proxy used to forward incoming requests to one of several available
VMs running on same physical host as vm-http-proxy. By intention this is required on physical hosts available 
over single IPv4 address but providing several virtual machines each having its own HTTP providing different 
kind of web application.

## Current Status

This software is in a very early state of development currently. __Thus, you may use it at your very own risk.__

Currently, support is limited to LXC containers. It is planned to refactor internal structure for providing 
module-based support for different kinds of virtual machines.

## How is it working?

The proxy is processing all incoming HTTP requests by looking up hostname provided in property `Host:` contained
in header of each request. Looking up hostname is considered to result in a local VM's IP this request is then forwarded to. The response of local VM is passed back to initially requesting HTTP client finally.

### What is meant by "looking up hostname"?

The script is extracting a map of IPv4 and IPv6 addresses from all local LXC containers' configuration files.
Target VM is selected by looking up IPv6 AAAA record of host named in HTTP request. The returned IPv6 address is then looked up in address map extracted before resulting in VM's (obviously local-only) IPv4 address the request is forwarded to, finally.



# System Requirements

This software is designed to run under Linux, but may work fine with BSD or similar as well. It's currently tested in combination with Ubuntu Linux, only. You're welcome to test it with other distributions.

The vm-http-proxy is implemented in Javascript. It's using Node.JS and thus you have to install Node.JS to 
be available as /usr/bin/node. Please use latest stable release available at www.nodejs.org.

## Further Prerequisites

Currently the proxy works with LXC, only. It's expecting all LXC containers to be located in /var/lib/lxc, even though you might choose differently folder in configuration file `node_modules/config.js`.



# Installation

1. [Download ZIP](https://github.com/cepharum/vm-http-proxy/archive/master.zip) to your physical host running LXC containers und unzip it into folder of your choice. It's okay to put it under /opt or into subfolder of your unprivileged user's home directory.
2. Adjust configuration in file `node_modules/config.js`. Basically, adjust the IPv4 address to listen on for incoming requests to be forwarded.
3. Invoke run.sh to instantly test the proxy.

## Install System Service

### Ubuntu Linux

In Ubuntu Linux you may install new upstart job like this:

1. Update `http-proxy.conf` to contain proper pathname of run.sh.
2. Copy `http-proxy.conf` to `/etc/init`.