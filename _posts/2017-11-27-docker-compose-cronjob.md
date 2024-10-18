---
layout: post
title: "Docker &#10005; cron : the struggle of web project"
description: Run cronjob beside classical website with docker-compose
tags: [ Docker, docker-compose, php, cron ]
author: senorihl
gh-repo: senorihl/docker-compose-cronjob
gh-badge: [ star, follow ]
permalink: /:year/:month/struggle-with-cronjob-docker-composer
---

This came accross multiple project :

> **How can I run a command periodically ?** Obviously, on Linux you can use a `crontab`.

But when docker arrives :

> **How can I run a crontab without explicitly redo a Dockerfile ?** And there was too many options.

## Current situation

* A website is built with **ExpressJS** on **node** so we have a process which run the web server.

* A script named `my-awesome-command` in the `bin` directory is executing some process.

* We are in development environment using this `docker-compose` file

  ```yaml
  version: '2'
  services:
      myapp:
          build: .
          volumes:
              - .:/app
              - /app/node_modules
          ports:
              - 3000:3000
  ```

  And Dockerfile for the app :

  ```dockerfile
  FROM node:8

  ADD . app
  WORKDIR app
  RUN npm install
  EXPOSE 3000

  ENTRYPOINT ["npm", "start"]
  ```

  > Sample working repository : [Running express web server][step 1]

## Give it a try

I want to run a job. So in the `Dockerfile` I will add some line to register this cron.

```dockerfile
FROM node:8

ADD . app
WORKDIR app
RUN npm install
EXPOSE 3000

RUN apt-get update && apt-get install -y cron
RUN echo '* * * * * cd /app && .bin/my-awesome-command > /app/logs/crontab.log 2>&1' > /etc/crontab
RUN crontab /etc/crontab

ENTRYPOINT ["npm", "start"]
```

> Sample working repository : [Installing crontab in Dockerfile][step 2]

Now try running `docker-compose up -d --build`, the webpage will be available at http://localhost:3000/, but
`my-awesome-command` should write some things to `crontab.log`, where is this crappy file ?!

Take a look at the output of the docker build :

    Step 7/9 : RUN echo '* * * * * cd /app && .bin/my-awesome-command > /app/logs/crontab.log 2>&1' > /etc/crontab
     ---> Running in eb9ec8fd5200
     ---> bdcebf265736
    Removing intermediate container eb9ec8fd5200
    Step 8/9 : RUN crontab /etc/crontab
     ---> Running in c20b3d7ea6df
     ---> a1926b68ecb2
    Removing intermediate container c20b3d7ea6df

I'm not an expert of Docker but I've found that the fact that `crontab /etc/crontab` is executed inside an
intermediate container totally fucked our crontab ... How can I execute this job ?

## The solution

The solution is to build another image in `docker-compose` with the same configuration as `myapp` except for one thing.
This will not execute the web server this will execute the crontab !

We need to do 2 things :

### Adding a service for `docker-compose`

Just copy the `myapp` service to another service `mycron` :

```yaml
version: '2'
services:
  myapp:
    build: .
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - 3000:3000
  mycron:
    build: .
    volumes:
      - .:/app
      - /app/node_modules
#    we don't need ports with this because it will execute the crontab
#    ports:
#      - 3000:3000
``` 

Now the real solution is overwriting the entrypoint of the `Dockerfile`. In `myapp` it's `npm start` but in `mycron`
this will be a script.

So, add `entrypoint: sh /app/crontab.sh` under `mycron` definition.

### Set up a script

Let's create the `crontab.sh` file.

What will be used for ?

1. Create the log file
2. Registering the command to be executed by the crontab
3. Start the crontab
4. (optionnal) display logs

```bash
#!/usr/bin/env bash

# Ensure the log file exists
touch /app/logs/crontab.log

# Ensure permission on the command
chmod a+x /app/bin/my-awesome-command

# Added a cronjob in a new crontab
echo "* * * * * /usr/local/bin/node /app/bin/my-awesome-command >> /app/logs/crontab.log 2>&1" > /etc/crontab

# Registering the new crontab
crontab /etc/crontab

# Starting the cron
/usr/sbin/service cron start

# Displaying logs
tail -f /app/logs/crontab.log
```

> Sample working repository : [Using an entrypoint script][step 3]

Now build then start, you should have this output :

<video controls class="width-fit">
    <source src="{{ "/img/docker-compose-crontab-demo.webm" | absolute_url }}" type="video/webm">
    <source src="{{ "/img/docker-compose-crontab-demo.mp4" | absolute_url }}" type="video/mp4">
    Sorry, your browser doesn't support embedded videos.
</video>

[step 1]: https://github.com/Senorihl/docker-compose-cronjob/releases/tag/v1.1

[step 2]: https://github.com/Senorihl/docker-compose-cronjob/releases/tag/v2.0

[step 3]: https://github.com/Senorihl/docker-compose-cronjob/releases/tag/v2.1 
