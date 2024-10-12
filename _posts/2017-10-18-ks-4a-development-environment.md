---
layout: post
title: Development environment on Kimsufi instance, part 1
subtitle: Setting up Ubuntu 16.04 on KS-4A with nginx, PHP & GitLab
description: Setting up Ubuntu 16.04 on Kimsufi KS-4A with nginx, PHP & GitLab
summary: Setting up Ubuntu 16.04 with basic nginx
tags: [ DevOps, ubuntu, nginx ]
author: senorihl
date: 2017-10-18 13:00:00+2000
permalink: /:year/:month/kimsufi-development-environment/part-1/
group: ks-4a-development-environment
---

# Setting up *Ubuntu 16.04* (~~Ubuntu 17.04~~)

## Previous step

Configure your instance to have Ubuntu 16.04 **fresh** installed.
Then connect through SSH to your instance (credentials given by mail after OS installation.)

## Adding a sudo-able user

1. Create the new user by executing and fill the configuration :

   ```
   root@your-instance:~# adduser username
   ```

2. Add the user to the `sudoers` :

   ```
   root@your-instance:~# adduser username sudo
   ```

3. *(optionnal)* Prevent the new user to type his email when he wants to switch to `root`

   	root@your-instance:~# echo 'username ALL=NOPASSWD: ALL' >> /etc/sudoers

4. Try to connect with your username then try to switch to `root`

   	username@your-instance:~$ sudo su -
   	# Type your password if you need to (if you pass step 3)
   	# You should see
   	root@your-instance:~#

Next steps will use SSH through `username`.

# Packages installation

Keep yourself updated : `sudo apt-get update` and `sudo apt-get upgrade` *(you should see nothing because fresh install
keeps updated)*.

## ufw (Uncomplicated Firewall)

1. Install package : `sudo apt-get install ufw`
2. Check available connections : `sudo ufw app list`, which should render :

   	Available applications:
   	  Bind9
   	  OpenSSH

3. Add OpenSSH (obviously) by executing `sudo ufw allow OpenSSH`
4. Enable the firewall `sudo ufw enable`
5. Check configuration `sudo ufw status`, which should render :

   	Status: active
   	
   	To                         Action      From
   	--                         ------      ----
   	OpenSSH                    ALLOW       Anywhere
   	OpenSSH (v6)               ALLOW       Anywhere (v6)

## Install nginx

1. Install packages :

   ```bash
   sudo apt-get install nginx
   ```

2. Allow connection with **ufw** (nginx expose 3 services to ufw : HTTP, HTTPS, both) : `sudo ufw allow "Nginx HTTP"`
3. Reload the firewall : `sudo ufw reload`
4. Check the status : `sudo ufw status` which should render :

   	Status: active
   	
   	To                         Action      From
   	--                         ------      ----
   	OpenSSH                    ALLOW       Anywhere
   	Nginx HTTP                 ALLOW       Anywhere
   	OpenSSH (v6)               ALLOW       Anywhere (v6)
   	Nginx HTTP (v6)            ALLOW       Anywhere (v6)

5. Access your web server with your favorite browser : [http://your-instance/](http://your-instance/), which should
   render :

   <img class="width-fit" src="/img/nginx.png">
