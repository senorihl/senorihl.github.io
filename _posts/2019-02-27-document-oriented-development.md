---
layout: post
title: Document Oriented Development
subtitle: An architecture idea to speed up your page and application
tags: [ architecture, idea, document oriented development ] 
---

At the time of this post I work for the french newspaper Le Monde [website](https://www.lemonde.fr).
The main struggle of the development team was the fact that the old website was using a custom-made
static page generator and a lot of javascript and web services to render the miscellaneous data such as user data,
analytics and others.

The decision was made on early 2018 to migrate the website to a dynamic architecture using PHP, [Phalcon][1],
PostgreSQL and Redis. In order to reduce the SQL queries we chose to put in redis model's and their
dependencies needed for display the article page. By discovering capabilities of Phalcon we've recently decided
to migrate this model caching system to a document caching one.

Here's how the data is processed from DB to display.

## What's the trouble ?

In Phalcon, a model is like the Symfony's entity, except all database metadata are stored in Phalcon's abstract class
for model.
As we store it into cache this could add useless information into the serialized document, another problem was
unsync between cache and database that can lead fail when deserializing and fetching additional data, and last but not
least the data stored in the model is raw and we often need some operations to use them into the view.

In a nutshell we want to:

- reduce the size of cached data
- decorrelate data used in view and data from database
- prefetch some information

We've decided to adopt a new system which we called **document oriented development**.

> What's a document ?

A document is a simple representation of an object fetched from db that will be used in the view.

## How to build a document 101

First of all we've wanted to have maximum code coverage on this architecture, so obviously get rid of Phalcon's model
static methods to fetch data from database which is hardly mockable. The first class we used will be an
`AbstractRepository` which will have two
abstract methods `find` and `findAll` which is a Singleton.

Example for the `Article`:

```php
<?php

class ArticleRepository extends AbstractRepository {
   
    public function find($id) 
    {
        return ArticleModel::findFirst($id);
    }
   
    public function findAll() 
    {
        return ArticleModel::find();
    }
}
```

Then we add our first `Document` for the article :

```php
<?php

class ArticleDocument {
    
    public $id;
    public $title;
    
    public function __construct($id) {
        $model = ArticleRepository::getInstance()->find($id);
        
        $this->id = $model->getId();
        $this->title = $model->getTitle();
        // map some other simple property here ...
    }
}
```

In the case there is a linked model used in the view we may want to get it in the Document, in that case we
can define a new class called `Transformer` which will transform the linked model, such as a Section in which
the article is published as follow in what we called a `Representation`.

```php
<?php

class SectionRepresentation {
    public $id;
    public $title;
}
```

And then the corresponding `Transformer` :

```php
<?php

class SectionTransformer {
    
    public static function transform($model): SectionRepresentation 
    {
        $representation = new SectionRepresentation();
        $representation->id = $model->getId();
        $representation->title = $model->getTitle();
        return $representation;
    }
}
```

We can now add the section transformer to the document's constructor :

```php
public function __construct($id) {
    $model = ArticleRepository::getInstance()->find($id);
    
    $this->id = $model->getId();
    $this->title = $model->getTitle();
    $this->section = SectionTransformer::transform($model->getSection());
}
```

Simple right ?

## How to save it ?

Instead of creating a service or another kind of repository we would rather add all saving and fetching
methods into the `AbstractDocument`.

```php
<?php

abstract class AbstractDocument {
    
    public function __construct() {
        $fromCache = $this->getCacheContent();
        
        if (!$fromCache) {
            $result = $this->populate();
            
            if ($result) {
                $this->saveCacheContent();
            }
        }
    }
    
    public function getCacheManager()
    {
        return Di::getDefault()->get('cache');
    }
    
    protected function getCacheContent() {
        $props = $this->getCacheManager()->get($this->getCacheKey());

        if (null === $props) {
            return false;
        }

        foreach ($props as $property => $value) {
            $this->{$property} = $value;
        }

        return true;
    }
    
    public function saveCacheContent()
    {
        $toCache = [];
        $reflect = new \ReflectionObject($this);
        $props   = $reflect->getProperties(\ReflectionProperty::IS_PUBLIC);

        foreach ($props as $prop) {
            $toCache[$prop->getName()] = $this->{$prop->getName()};
        }

        $this->getCacheManager()->save($this->getCacheKey(), $toCache);
    }
    
    abstract function populate(): bool;
    abstract function getCacheKey(): string;
    
} 
```

### Explanation

In the constructor we've added a few calls :

- `populate`: we move the original content of `__construct`, so basically load data from database into the Document
- `getCacheContent`: will load data from cache into the Document
- `saveCacheContent`: will store data from document into the cache
- `getCacheManager`: load cache service from Dependency Injection

> Now, why did we used Reflection in the `saveCacheContent` ?

It's pretty simple, because we wanted to map only public properties because private ones would be used in the
populate method to be accessible multiple times or when we want to extends any Document. But in this case we
couldn't use `get_object_vars` since when we use it with `$this` it fetch even protected and private property.

> And why didn't we used just the cache `get` method ?

When it's used we retrieve exactly what we store, so if we use `cache($sacheKey, $this)` on fetch with
`get($cacheKey)` we would get an instance of a Document so the properties aren't mapped with the current
instance of the Document. Simple solution: store the _public_ properties as array and fetch this array later
and mapped with properties.

Finally the `ArticleDocument` like this.

```php
<?php

class ArticleDocument extends AbstractDocument {
    public $id;
    public $title;
    public $section;
    protected $model;
    
    public function __construct($id) {
        $this->id = $id;
        parent::__construct();
    }
    
    public function getCacheKey(): string {
        return 'article_document_' . $this->id;
    }
    
    public function populate(): bool {
        $this->model = ArticleRepository::getInstance()->find($this->id);
        
        if ($this->model !== null) {
            return false;
        }
            
        $this->id = $this->model->getId();
        $this->title = $this->model->getTitle();
        $this->section = SectionTransformer::transform($this->model->getSection());
        
        return true;
    }
    
}
```

### Further notes

Here is another problem, if we have multiple kind of article such as video article we should take care of
the inheritance of document.

```php
<?php

class VideoDocument extends ArticleDocument {
    public $videoUrl;
    
    public function populate(): bool {
        parent::populate();
        $this->videoUrl = $this->model->getVideoUrl();
    }
    
}
```

---

What do you think ?

[1]: https://phalconphp.com/