---
layout: post
title: Development environment on Kimsufi instance, part 2
subtitle: Setting up Ubuntu 16.04 on KS-4A with nginx, PHP & GitLab
description: Setting up Ubuntu 16.04 on Kimsufi KS-4A with nginx, PHP & GitLab
summary: Setting up nginx with php
tags: DevOps ubuntu php
author: senorihl
date: 2017-10-22 17:00:00+2000
permalink: /:year/:month/kimsufi-development-environment/part-2/
---

# Installing PHP

## Previous step

Now we are up with `nginx` we will need to install `php` on our web server.
For this step we will use `php-fpm`.

## Installing `php-fpm`

I will not use `mysql` for the example only the basic `php`.

```bash
sudo apt-get install apt-transport-https lsb-release ca-certificates
sudo apt-get install php-fpm
```

## Configuring `php-fpm`

Open the main config file :

```bash
sudo nano /etc/php/7.0/fpm/php.ini
```

Then change this line :

```ini
;cgi.fix_pathinfo=1
```

To :

```ini
cgi.fix_pathinfo = 0
```

> This config, if enabled, will try to "fix" file path of script to find the closest one.
> For security option we will work with exact file names.

Then restart the deamon :

```bash
sudo systemctl restart php7.0-fpm
```

## Configure `nginx` to works with `php-fpm`

`php-fpm` expose a socket on which php scripts will be executed and rendered, thanks to `nginx` we can configure
incoming request to be mapped with php socket.

### Example site

```bash
sudo nano /etc/nginx/sites-available/default
```

In this file you will find the following config :

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;

    server_name _;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

> This means `nginx` will listen on port 80 and if address is `default_server` (which is an alias for all incoming url)
> it will try to read files from directory `/var/www/html` and if no file specified it will fallback to
> `index.html` or `index.htm` or `index.nginx-debian.html` (in this order).
> `location /` means the root URL (such as http://example.com/) and try file will try to match given name
> with existing file in the root dir or fallback to a 404 error.

Now we'll modify it as follow :

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.php index.html index.htm index.nginx-debian.html;

    server_name server_domain_or_IP;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php7.0-fpm.sock;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

> Changes :
>
> 1. `index index.php` : This mean the first fallback if no file specified will be `index.php`
> 2. `server_name server_domain_or_IP` : To map with the domain specified in requests, replace `server_domain_or_IP` by
     your IP address or domain
> 3. block `location ~ \.php$` (regex) : All files that finish with `.php` will be using the `php-fpm` socket
     > and an additional conf file will be used by `nginx`
> 4. block `location ~ /\.ht` (regex) : All files that start with `.ht` won't be visible by clients, to no see our
     .htaccess config

Now test your configuration with :

```bash
sudo nginx -t
```

If it's OK then reload `nginx` :

```bash
sudo systemctl reload nginx
```

### Test with real file

We will expose `phpinfo` by creating a new PHP file :

```bash
sudo nano /var/www/html/info.php
```

And inside :

```php
<?php
phpinfo();
```

And now test your config and file by accessing `http://server_domain_or_IP/info.php` from your favorite browser.

<img class="width-fit" src="/img/phpinfo.png">

For security reasons you can remove the `/var/www/html/info.php` file.
