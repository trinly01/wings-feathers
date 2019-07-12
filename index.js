import io from 'socket.io-client'

// import feathers from '@feathersjs/feathers'
// import auth from '@feathersjs/authentication-client'
// import socketio from '@feathersjs/socketio-client'
import feathers from '@feathersjs/client/dist/feathers.min.js'
let auth = feathers.authentication
let socketio = feathers.socketio

import Event from 'events'

import { findIndex, isFunction, ceil, unionBy } from 'lodash'
// const stackTrace = require('stack-trace')

export default (host) => {
  host = host || 'http://localhost:3030' // IP and port of the server
  let socket = io(host)

  let app = feathers()

  app
    .configure(socketio(socket, {
      timeout: 180000
    }))
    .configure(auth({
      jwtStrategy: 'jwt', // the name of the JWT authentication strategy
      entity: 'user', // the entity you are authenticating (ie. a users)
      service: 'users', // the service to look up the entity
      cookie: host + '-jwt', // the name of the cookie to parse the JWT from when cookies are enabled server side
      storageKey: host + '-jwt', // the key to store the accessToken in localstorage or AsyncStorage on React Native
      storage: window.localStorage // Passing a WebStorage-compatible object to enable automatic storage on the client.
    }))

  app.wingsService = (serviceName, query = {}, conf = {}) => {
    let event = new Event()
    let service = app.service(serviceName)
    let wings = {
      service,
      query,
      total: 0,
      data: [],
      skip: 0,
      page: 1,
      limit: 10,
      channels: (conf.channels || []),
      debug: (conf.debug || false),
      newDataPosition: (conf.newDataPosition || 'end'),
      paginate: (conf.paginate || false)
    }

    wings.reset = (query, conf = {}) => {
      Object.assign(wings, {
        total: 0,
        data: [],
        skip: 0,
        page: 1,
        limit: 10
      })
      wings.query = (query | wings.query)
      wings.channels = (conf.channels | wings.channels)
      wings.debug = (conf.debug | wings.debug)
      wings.newDataPosition = (conf.newDataPosition | wings.newDataPosition)
      wings.paginate = (conf.paginate | wings.paginate)
      wings.log(`${serviceName}.reset`)
      wings.init()
    }

    wings.log = function () {
      let style = `
        display: inline-block;
        padding: 0 10px;
        height: 50px;
        line-height: 20px;
        border-radius: 25px;
        background-color: #FF5722;
        color: white;
        font-weight: bold;
      `
      let title = `%c${arguments[0]}`
      Array.prototype.shift.apply(arguments)
      // const trace = stackTrace.get()
      // Array.prototype.unshift.call(arguments, `${trace[2].getFileName()}:${trace[2].getLineNumber()}`)

      var err = new Error()
      // var callerLine = err.stack.split('\n')[4]
      // var index = callerLine.indexOf('at ')
      // var clean = callerLine.slice(index + 2, callerLine.length)
      let errStackSplitAt = err.stack.toString().split('\n')
      let stack2 = errStackSplitAt[2].split('?!.')
      let file = stack2[stack2.length - 1].split('?')[0].split('///.')
      file = file.length === 1 ? file[0] : file[1].split(':')[0]
      let stack = err.stack.split('\n')
      stack[0] = 'Error'
      stack.splice(1, 1)
      stack.splice(2, 8)
      err.stack = stack.join('\n')

      if (wings.debug) console.log(title, style, file, err, '\n', ...arguments)
    }

    wings.on = (evtName, listener) => {
      event.on(evtName, function () {
        listener.bind(wings)
        listener(...arguments, wings)
      })
      wings.listener = listener
      return wings
    }

    wings.destroy = () => {
      // event.removeAllListeners('dataChange')
      delete event._events
    }

    wings.init = () => {
      (async () => {
        try {
          let result = await service.find(query)
          wings = Object.assign(wings, result)
          event.emit('dataChange', result.data)
          wings.log(`${serviceName}.init`, result)
          return wings
        } catch (error) {
          wings.log(`${serviceName}.init`, error)
        }
      })()
      event.emit('dataChange', wings.data)
      return wings
    }

    wings.find = function () { return service.find(...arguments) }
    wings.get = function () { return service.get(...arguments) }
    wings.create = function () { return service.create(...arguments) }
    wings.update = function () { return service.update(...arguments) }
    wings.patch = function () { return service.patch(...arguments) }
    wings.remove = function () { return service.remove(...arguments) }

    wings.inChannel = message => {
      return (
        !wings.channels[0] || // isEmpty returns inChannel
        findIndex(wings.channels, ch => {
          let nestedProp = ch.prop.split('.').reduce((o, i) => o[i], message)
          if (isFunction(ch.value)) {
            return ch.value(nestedProp, message)
          } else {
            return ch.value === nestedProp
          }
        }) !== -1
      )
    }

    service.on(`created`, message => {
      wings.total += 1
      if (wings.inChannel(message)) {
        if (wings.newDataPosition === 'end') {
          wings.data.push(message)
          if (wings.paginate && wings.data.length > wings.limit) wings.data.shift()
        } else {
          wings.data.unshift(message)
          if (wings.paginate && wings.data.length > wings.limit) wings.data.pop()
        }
        event.emit('dataChange', wings.data)
      }
    })

    wings.findIndex = message => {
      var index = -1
      let len = wings.data.length
      for (var i = 0; i < len; i += 1) {
        if (wings.data[i]._id === message._id) {
          index = i
          break
        }
      }
      return index
    }

    wings.removeItem = (index) => {
      var stop = wings.data.length - 1
      while (index < stop) {
        wings.data[index] = wings.data[++index]
      }
      wings.data.pop()
    }

    service.on(`removed`, message => {
      wings.total -= 1
      let index = wings.findIndex(message)
      if (index !== -1) {
        wings.removeItem(index)
        if (wings.data.length < wings.limit) wings.loadPage(1)
        wings.log(`${serviceName}.removed`, message, index)
        event.emit('dataChange', Array.from(wings.data))
      }
    })

    wings.modifyData = (message, type = 'patched') => {
      let index = wings.findIndex(message)
      let inChannel = wings.inChannel(message)
      if (index !== -1 && inChannel) { // in data and channel
        wings.data[index] = message
      } else if (index !== -1 && !inChannel) { // in data but not in channel
        wings.removeItem(index)
      } else if (index === -1 && inChannel && !wings.paginate) { // Not in data but in channel
        if (wings.newDataPosition === 'end') wings.data.push(message); else wings.data.unshift(message)
      }
      event.emit('dataChange', Array.from(wings.data))
      wings.log(`${serviceName}.on.${type}`, message, 'index', index, 'inChannel', inChannel)
    }

    service.on(`patched`, message => {
      wings.modifyData(message)
    })

    service.on(`updated`, message => {
      wings.modifyData(message, 'updated')
    })

    wings.loadMore = async () => {
      let pages = ceil(wings.total / wings.limit)
      if (wings.page <= pages) {
        query.query.$skip = wings.page * wings.limit
        let result = await service.find(query)
        ++wings.page
        wings.data = unionBy(wings.data, result.data, '_id')
        event.emit('dataChange', wings.data)
        wings.log(`${serviceName}.loadMore`, result)
      }
    }

    wings.loadAll = async () => {
      let pages = ceil(wings.total / wings.limit)
      if (wings.page !== pages) {
        await wings.loadMore()
        service.loadAll()
      }
    }

    wings.loadPage = async (p = 1) => {
      // let pages = ceil(wings.total / wings.limit)
      wings.page = p
      // if (wings.page) {
      query.query.$skip = (wings.page - 1) * wings.limit
      let result = await service.find(query)
      Object.assign(wings, result)
      event.emit('dataChange', wings.data)
      wings.log(`${serviceName}.loadPage`, result)
      // }
    }

    // wings.init()
    return wings
  }

  return app
}
