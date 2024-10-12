---
layout: post
published: true
title: Using variant in React Native 🤖🍏
subtitle: Setting up a monorepo for one app with different declination
date: "2021-03-05"
tags:
  - React Native
  - React
  - TypeScript
author: senorihl
gh-repo: senorihl/AppDeclination
gh-badge: [ fork, follow ]
---

For some reasons, your React Native project might be used for multiple applications, each one having its own logic such
as authentication or visual identity.
It's possible to use variant (for Android) or schemes (for iOS) to build apps with differents app id but what about
logic and visual differences ?

In this blog post we will build a React Native app that can be build for 2 differents contexts.

## Creating the project

First of all we will create a new React Native project using Typescript.

```bash
npx react-native init AppDeclination --template react-native-template-typescript
```

> see commit [senorihl/AppDeclination#80dd7e2](https://github.com/senorihl/AppDeclination/tree/80dd7e2) for current
> state

We will now add some code that display a simple list of person.

## A simple app

First of all we will change directory structure using `src/` directory as follow :

```
.
├── android/
├── ios/
├── src/
│   ├── component/
│   │   └── /* We will put components here */
│   ├── helpers/
│   │   └── /* We will put helpers here */
│   ├── interface/
│   │   └── /* We will put object interfaces here */
│   └── App.tsx
└── index.js
```

In the app we will display a simple list using `react-native-elements` and `FlatList` :

{% raw %}

```tsx
// src/App.tsx

import React from "react";
import {StyleSheet, Platform, StatusBar, FlatList} from "react-native";
import {Person} from "./interfaces/Person";
import {Header} from "react-native-elements";
import {SafeAreaView, SafeAreaProvider} from "react-native-safe-area-context";
import PersonItem from "./component/PersonItem";

const App = () => {
    const [source, setSource] = React.useState<string>("empty");
    const [persons, setPersons] = React.useState<Person[]>([]);

    React.useEffect(() => {
    }, []);

    return (
        <>
            <Header
                centerComponent={{
                    text: `Users [${source}]`,
                    style: {color: "#fff", fontSize: 30},
                }}
            />
            <SafeAreaProvider>
                <StatusBar barStyle="light-content"/>
                <SafeAreaView>
                    <FlatList
                        data={persons}
                        renderItem={({item}) => <PersonItem person={item}/>}
                        keyExtractor={(item) => `${item.id}`}
                    />
                </SafeAreaView>
            </SafeAreaProvider>
        </>
    );
};

export default App;
```

{% endraw %}

And using interface:

{% raw %}

```tsx
// src/interfaces/Person.ts

export interface Person {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    avatar?: string;
}
```

{% endraw %}

And `PersonItem` component:

{% raw %}

```tsx
// src/component/PersonItem.tsx

import * as React from "react";
import {Linking} from "react-native";
import {Person} from "../interfaces/Person";
import {Avatar, ListItem} from "react-native-elements";

const PersonItem: React.FunctionComponent<{ person: Person }> = ({
                                                                     person,
                                                                 }) => {
    return (
        <ListItem
            onPress={() => {
                Linking.openURL(`mailto:${person.email}`).catch((e) => console.warn(e));
            }}
        >
            {person.avatar && (
                <Avatar rounded size="medium" source={{uri: person.avatar}}/>
            )}
            <ListItem.Content>
                <ListItem.Title>
                    {person.first_name} {person.last_name}
                </ListItem.Title>
                <ListItem.Subtitle style={{color: "#aaa"}}>
                    Tap to send email to {person.email}
                </ListItem.Subtitle>
            </ListItem.Content>
        </ListItem>
    );
};

export default PersonItem;
```

{% endraw %}

> see commit [senorihl/AppDeclination#756ea64](https://github.com/senorihl/AppDeclination/tree/756ea64) for current
> state

Ok now that we have an empty list of users, what's next ?

## The real work

We need to declare some variants, let's use `one` and `two` (simpler is better `¯\_(ツ)_/¯`).
Lets create a new directory at root which exposes all variants and declaration:

```
.
├── android/
├── ios/
├── variants/
│   ├── one/
│   │   └── index.ts
│   ├── two/
│   │   └── index.ts
│   └── definition.ts
├── src/
│   ├── component/
│   │   └── /* We will put components here */
│   ├── helpers/
│   │   └── /* We will put helpers here */
│   ├── interface/
│   │   └── /* We will put object interfaces here */
│   └── App.tsx
├── current-variant.d.ts
└── index.js
```

For the example these two variants will only expose a `fetchUsers` method and a `source` property.

```tsx
// variants/one/index.ts

import {Person} from "../../src/interfaces/Person";

const definition = {
    source: "one", // or 'two' for the other variant
    fetchUsers: async () => {
        const res = await fetch("https://reqres.in/api/users?page=1"); // or 'https://reqres.in/api/users?page=2' for the other variant
        const data = await res.json();
        return data.data as Person[];
    },
};

export default definition;
```

In order to prevents excessive load of javascript files using a wrapper like a `setCurrentVariant` and
`getCurrentVariant` directly inside `App.tsx` we will optimize imports with babel.

So, in the `babel.config.js` file we add a plugin:

```js
const path = require("path");
const VARIANT = process.env.VARIANT || "one";

if (!VARIANT) {
    throw new Error(
        `You must define a VARIANT environment variable when bundling typescript module`
    );
}

const plugins = [
    [
        require.resolve("babel-plugin-module-resolver"),
        {
            extensions: [".ts", ".tsx"],
            alias: {
                "current-variant": ([, requirePath]) =>
                    path.resolve(__dirname, "variants/" + VARIANT + requirePath),
            },
        },
    ],
];

module.exports = {
    presets: ["module:metro-react-native-babel-preset"],
    plugins,
};
```

> **Explanation**:
> We add an alias for babel with `babel-plugin-module-resolver`. This will map any import of `current-variant` to the
> corresponding variant directory

Now we can use an false `current-variant` package in `App.tsx` to populate users:

{% raw %}

```tsx
// src/App.tsx

import React from "react";
import {StyleSheet, Platform, StatusBar, FlatList} from "react-native";
import {Person} from "./interfaces/Person";
import {Header} from "react-native-elements";
import {SafeAreaView, SafeAreaProvider} from "react-native-safe-area-context";
import PersonItem from "./component/PersonItem";
import variant from "current-variant";

const App = () => {
    const [source, setSource] = React.useState<string>("empty");
    const [persons, setPersons] = React.useState<Person[]>([]);

    React.useEffect(() => {
        variant.fetchUsers().then((users) => {
            setPersons(users);
            setSource(variant.source);
        });
    }, []);

    return (
        <>
            <Header
                centerComponent={{
                    text: `Users [${source}]`,
                    style: {color: "#fff", fontSize: 30},
                }}
            />
            <SafeAreaProvider>
                <StatusBar barStyle="light-content"/>
                <SafeAreaView>
                    <FlatList
                        data={persons}
                        renderItem={({item}) => <PersonItem person={item}/>}
                        keyExtractor={(item) => `${item.id}`}
                    />
                </SafeAreaView>
            </SafeAreaProvider>
        </>
    );
};

export default App;
```

{% endraw %}

> see commit [senorihl/AppDeclination#a6d7ca0](https://github.com/senorihl/AppDeclination/tree/a6d7ca0) for current
> state

### Further improvement

With some IDEs you can enable autocomplete by adding a `current-variant.d.ts` file at root.

```ts
// current-variant.d.ts

import {VariantDefinition} from "./variants/definition";

declare const definition: VariantDefinition;
export default definition;
```

```ts
// variants/definition.ts

import {Person} from "../src/interfaces/Person";

export interface VariantDefinition {
    source: string;
    fetchUsers: () => Promise<Person[]>;
}
```

## Conclusion

You can now run any app variant using `VARIANT` environment variable when using `react-native start`.

```bash
VARIANT=two react-native start --reset-cache
# Default is VARIANT=one react-native start

# And then simply run
react-native ios
# or
react-native android
```
