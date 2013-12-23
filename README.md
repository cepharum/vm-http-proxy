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

# System Requirements

This software is designed to run under Linux, but may work fine with BSD or similar as well. It's tested in 
combination with Ubuntu Linux.

The vm-http-proxy is implemented in Javascript. It's using Node.JS and thus you have to install Node.JS to 
be available as /usr/bin/node. Please use latest stable release available at nodejs.org.
