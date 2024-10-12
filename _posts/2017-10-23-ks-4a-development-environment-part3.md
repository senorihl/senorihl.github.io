---
layout: post
title: Development environment on Kimsufi instance, part 3
subtitle: Setting up Ubuntu 16.04 on KS-4A with nginx, PHP & GitLab
description: Setting up Ubuntu 16.04 on Kimsufi KS-4A with nginx, PHP & GitLab
summary: Setting up GitLab behind previously installed nginx
tags: DevOps ubuntu gitlab
author: senorihl
date: 2017-10-22 17:00:00+2000
permalink: /:year/:month/kimsufi-development-environment/part-3/
---

# GitLab-CE Installation

## Prerequisites

Install necessary packages :

```bash
sudo apt-get install -y curl openssh-server ca-certificates
```

And for sending e-mails from GitLab :

```bash
sudo apt-get install -y postfix
```

## `gitlab-ce` package installation

Execute repo configuration from GitLab :

```bash
curl -sS https://packages.gitlab.com/install/repositories/gitlab/gitlab-ce/script.deb.sh | sudo bash
```

Installing GitLab-CE

```bash
sudo EXTERNAL_URL="http://gitlab.example.com" apt-get install gitlab-ce
```

> <i class="material-icons">warning</i> Replace `http://gitlab.example.com` with the (sub)domain you want to.

If you try to access http://gitlab.example.com you will have 404 error cause GitLab's default conf doesn't use nginx

## Configuring GitLab-CE

To make GitLab running behind our nginx installation you need to add some config to disable some GitLab services.
To do so edit the `/etc/gitlab/gitlab.rb` and add the following at the end of the file.

```ruby
nginx['enable'] = false
web_server['external_users'] = ['www-data']
gitlab_rails['trusted_proxies'] = [IPV4, IPV6]
```

> Replace IPV4 & IPV6 by your addresses

And reconfigure GitLab by executing `sudo gitlab-ctl reconfigure`.

## Configuring nginx

You need to add a vhost to nginx who will use GitLab.

```bash
sudo nano /etc/nginx/sites-available/gitlab
```

And insert :

```nginx
upstream gitlab-workhorse {
  server unix:/var/opt/gitlab/gitlab-workhorse/socket;
}

## Normal HTTP host
server {

  ## Replace this with something like gitlab.example.com
  server_name gitlab.example.com;

  ## Don't show the nginx version number, a security best practice
  server_tokens off;

  root /opt/gitlab/embedded/service/gitlab-rails/public;

  ## Individual nginx logs for this GitLab vhost
  access_log  /var/log/nginx/gitlab_access.log;
  error_log   /var/log/nginx/gitlab_error.log;

  location / {
    client_max_body_size 0;
    gzip off;

    proxy_read_timeout      300;
    proxy_connect_timeout   300;
    proxy_redirect          off;

    proxy_http_version 1.1;

    proxy_set_header    Host                $http_host;
    proxy_set_header    X-Real-IP           $remote_addr;
    proxy_set_header    X-Forwarded-For     $proxy_add_x_forwarded_for;
    proxy_set_header    X-Forwarded-Proto   $scheme;

    proxy_pass http://gitlab-workhorse;
  }
}
```

Enable the vhost :

```bash
sudo ln -s /etc/nginx/sites-available/gitlab /etc/nginx/sites-enabled/gitlab
```

Make sure config is good by running

```bash
sudo nginx -t
```

Then

```bash
sudo service nginx reload
```

Finally you can access http://gitlab.example.com where GitLab will invite you to enter root user password
    
----------

That's all folks !

----------

Sources :

* [Installation methods for GitLab : https://about.gitlab.com/installation/#ubuntu](https://about.gitlab.com/installation/#ubuntu)
* [Installing Passenger + Nginx on Ubuntu 16.04 LTS (with APT) : https://www.phusionpassenger.com/library/install/nginx/install/oss/xenial/](https://www.phusionpassenger.com/library/install/nginx/install/oss/xenial/)