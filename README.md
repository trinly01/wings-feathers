# Welcome to Wings-Feathers!

<p align="center">
  <img width="300" src="https://miro.medium.com/max/3728/1*7zccGWE4o5LmxegijjK_xQ.png"/>
  <br />
  <img width="300" src="https://feathersjs.com/img/feathers-logo-wide.png" />
</p>

A **FeathersJS 4-Way reactive data sync** for any frontend framework

 - [x] DOM / UI (HTML)
 - [x] Data / State (Javascript)
 - [x] Local Storage (Offline)
 - [x] Backend/Database (Cloud)

> **Join and support our Community** <br />
> Web and Mobile Developers PH <br />
> [ [Facebook Page](https://fb.com/webmobile.ph) | [Group](https://fb.com/groups/webmobile.ph/) ]

## Installation

```bash
npm install wings-feathers
```
or
```bash
yarn add wings-feathers
```

## Usage

```javascript
import wings from 'wings-feathers'
// const wings = require('wings-feathers').default

let app = wings('http://localhost:3030')

let messagesSrvc = app.wingsService('messages')

messagesSrvc.on('dataChange', (messages) => {
  console.log(messages)
})

messagesSrvc.init()
```
## app.wingsService(serviceName, params, config)
Returns a wingsService `<object>`

| Param| Type | Description |
|--|--|--|
| *serviceName* | `<string>` | Name of service |
| *params.query* | `<object>` | ( Optional ) Refer to  [Feathers Querying](https://docs.feathersjs.com/api/databases/querying) |
| *config* | `<object>` | ( Optional ) Configuration of wingsService `<object>` |
| *config.channels* | `<array>` | ( Optional ) Array of [channel](#channel) objects |

<span id="params"></span>
### *params.query* `<object>` 
Refer to [Feathers Querying](https://docs.feathersjs.com/api/databases/querying)
```javascript
/* example records
  [
    { text: 'Hello', read: true, roomId: 1, nested: { prop: 'xander' } },
    { text: 'World', read: false, roomId: 2, nested: { prop: 'ford' } }
  ]
*/

let serviceName = 'message'

let params = {
  query: {
    read: false,
    roomId: 2
  }
}

let messagesSrvc = app.wingsService(serviceName, params)

messagesSrvc.on('dataChange', (messages) => {
  console.log(messages)
  // [ { text: 'World', read: false, roomId: 2, nested: { prop: 'ford' } } ]
})
```

<span id="config"></span>
### *config* `<object>` 
| Property | Type | Default | Description |
|--|--|--|--|
| *debug* | `<boolean>` | false | Logs all events `init`, `created`, `removed`, `patched`, `updated`, `loadMore`, `reset`  |
| *newDataPosition* | `<string>` | 'end' | Add new items to the `start` or `end` of an array  |
| *paginate* | `<boolean>` | false | Enable pagination based on `$limit`.  ***default is 10 records per page* |
| *channels* | `<array>` | [] | Refer to [channels](#channel) |

```javascript
let config = {
  debug: true,
  newDataPosition: 'start',
  paginate: true,
  channels: []
} 

let messagesSrvc = app.wingsService(serviceName, params, config)
```

<span id="channel"></span>
### *config.channels* `<array>` and *channel* `<object>`
Channels determine which records to receive that passes the prop === value .

| Property | Type | Description |
|--|--|--|
| *prop* | `<string>` | Name of record's property |
| *value* | `<string | number | boolean | function>` | Equality test value |
| *value* | `<function>` | `callback` accepts `(val, message)` arguments for custom test. ***Must return a boolean value* |

```javascript
/* example records
  [
    { text: 'Hello', read: true, roomId: 1, nested: { prop: 'xander' } },
    { text: 'World', read: false, roomId: 2, nested: { prop: 'ford' } }
  ]
*/

let config = {
  channels: [
    { prop: 'roomId', value: 2},
    { prop: 'nested.prop', value: 'ford'},
    { prop: 'nested', value: (val) => val.prop === 'ford' }
  ]
}

let messagesSrvc = app.wingsService(serviceName, params, config)
```

> You may use dot notation in **prop** as reference into the object's property

## reset(params, config)
set new `params`, `config` and triggers `init` method
```javascript
let params = {
  query: {
    read: false,
    roomId: 2
  }
}

let config = {
  debug: true,
  newDataPosition: 'start',
  paginate: true,
  channels: []
}

messagesSrvc.reset(params, config)
``` 

## loadMore()
loads more data based on `$skip` = ( `page` + 1 ) * `$limit`  
```javascript
messagesSrvc.loadMore()
``` 

## loadAll()
loads all data based on (`$skip` = `page` * `$limit`) * `pages`
```javascript
messagesSrvc.loadAll()
``` 

## loadPage
loads the based on  `$skip` = `page` * `$limit`
```javascript
messagesSrvc.loadPage(2)
```

## destroy
destroys all listners created by `.on(eventName, listener)` function
```javascript
messagesSrvc.destroy()
```

# *Join and support our Community* <br /> **Web and Mobile Developers PH** <br/> [ [Facebook Page](https://fb.com/webmobile.ph) | [Group](https://fb.com/groups/webmobile.ph/) ]

