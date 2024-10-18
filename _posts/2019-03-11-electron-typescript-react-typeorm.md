---
layout: post
title: Electron × TypeScript × React × TypeORM
description: Be my guest at the Electron table, take a seat and order your dishes, I'll be pleased to serve you 🍽️
tags: [ Electron, Webpack, React, TypeORM, TypeScript ]
author: senorihl
gh-repo: senorihl/demo-electron-typescript-react-typeorm
gh-badge: [ star, fork, follow ]
---

At first I had an idea, since I love papertable RPG I would like to build a desktop app built
with [electron](https://electronjs.org/) which players can join a game room and follow game activity (such as life
points, currency, possessions...) So,let's get using **electron**.

Then I thought about the language I wanted to use and my preference for front-end project is **Typescript** since it's
built with hard types.

At this point I was thinking about how the data of the different clients can besaved and syncronized easily. I recently
started to use [TypeORM](https://typeorm.io/) and I found it powerful, easily configurable and it reminds me about
Doctrine and Hibernate.

Finally, for the front-end capabilities I choose React (since it's the trendy one I know) with webpack and HMR.

## Starter

The first thing we need to do is configure every component to work isolately then with all others.

### Webpack

```javascript
const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    // a simple entry point
    entry: ["./src/index.tsx"],
    // configuration for HMR
    devServer: {
        contentBase: path.join(__dirname, "dist"),
        compress: true,
        port: 9000,
    },
    // needed to run correctly all JavaScript especially TypeORM
    target: "electron-renderer",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
    },
    plugins: [
        new webpack.NormalModuleReplacementPlugin(/typeorm$/, function (result) {
            result.request = result.request.replace(/typeorm/, "typeorm/browser");
        }),
        new webpack.ProvidePlugin({
            "window.SQL": "sql.js/js/sql.js",
        }),
        new HtmlWebpackPlugin({
            // this allows us to add a div#app inside the body
            template: "index.html",
        }),
    ],
};
```

### TypeScript

```json
{
  "compilerOptions": {
    "outDir": "./dist/",
    "noImplicitAny": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "module": "commonjs",
    "target": "es5",
    "jsx": "react",
    "allowJs": true,
    "moduleResolution": "node",
    "typeRoots": [
      "node_modules/@types"
    ]
  },
  "exclude": [
    "node_modules"
  ]
}
```

### TypeORM

```json
{
  "type": "sqljs",
  "synchronize": true,
  "autoSave": true,
  "entities": [
    Hello
  ],
  "logging": true,
  "logger": "advanced-console",
  "location": "core-db"
}
```

### `package.json` (used by electron)

```json
{
  "main": "main.js",
  "scripts": {
    "prestart": "NODE_ENV=production webpack",
    "start": "electron .",
    "dev": "NODE_ENV=development concurrently 'sleep 1 && yarn run dev:electron' 'yarn run dev:webpack'",
    "dev:electron": "electron .",
    "dev:webpack": "webpack-dev-server"
  }
}
```

## Main course

The goal here is to allow a component do display specific content using data fetched from the database.

We need to prepare the database connection that will be used inside a component. That's why, in the entrypoint defined
in webpack we need to create it and then use it inside our components using the `getRepository` or `getConnection`
methods provided by TypeORM.

```typescript
// src/index.tsx
import {createConnection} from "typeorm";
import * as ReactDOM from "react-dom";
import * as React from "react";
import "reflect-metadata";
import Hello from "./entities/Hello";
import HelloComponent from "./component/HelloComponent";

createConnection({
    type: "sqljs",
    synchronize: true,
    autoSave: true,
    entities: [Hello],
    logging: true,
    logger: "advanced-console",
    location: "core-db",
}).then(() => {
    ReactDOM.render(<HelloComponent id = {1}
    />, document.getElementById("app"));
});
```

### The first component

```typescript
// src/component/HelloComponent.ts
import * as React from "react";
import * as PropTypes from "prop-types";

interface HelloProps {
    id: number;
}

export default class HelloComponent extends React.Component<HelloProps> {
    static propTypes = {
        id: PropTypes.number.isRequired,
    };

    state: any = {
        firstname: "",
        lastname: "",
    };

    render() {
        return (
            <div>
                Hello
        {
            this.state.firstname
        }
        {
            this.state.lastname
        }
        </div>
    )
        ;
    }
}
```

### Using the local database

```typescript
// src/component/HelloComponent.ts
import * as React from "react";
import * as PropTypes from "prop-types";
import {getRepository} from "typeorm";
import Hello from "../entities/Hello";

interface HelloProps {
    id: number;
}

export default class HelloComponent extends React.Component<HelloProps> {
    static propTypes = {
        id: PropTypes.number.isRequired,
    };

    state: any = {
        firstname: "",
        lastname: "",
    };

    async componentDidMount() {
        const entity = await getRepository(Hello).findOne({id: this.props.id});
        this.setState({
            firstname: entity.firstname,
            lastname: entity.lastname,
        });
    }

    render() {
        return (
            <div>
                Hello
        {
            this.state.firstname
        }
        {
            this.state.lastname
        }
        </div>
    )
        ;
    }
}
```

### The electron entrypoint

At last if we want to have hot reload enabled we need to specify at the entrypoint used by electron to use a url or a
file.

```javascript
// main.js
const path = require("path");
const {app, BrowserWindow} = require("electron");

const environment = process.env.NODE_ENV || "production";
let win;

function createWindow() {
    win = new BrowserWindow({});

    if (environment === "development") {
        win.webContents.openDevTools();
        win.loadURL("http://0.0.0.0:9000/");
    } else {
        win.loadFile(path.resolve(__dirname, "dist/index.html"));
    }

    win.on("closed", () => {
        win = null;
    });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (win === null) {
        createWindow();
    }
});
```

## Dessert

You can clone or fork [this repository](https://github.com/senorihl/demo-electron-typescript-react-typeorm)
if you want to start your own project.

<img class="width-fit" src="{{ "/img/electron-typescript-react-typeorm-demo.gif" | absolute_url }}" />

Et voilà! 🍒
