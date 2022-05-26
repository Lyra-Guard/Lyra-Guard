# OneHat Events
[@onehat/events](https://www.npmjs.com/package/@onehat/events)
Takes the node.js [events](https://www.npmjs.com/package/events) package and adds the following functionality:
- **Registration / unregistration of events.** Events cannot be emitted until registered. This gives more control over the events, and forces better design. List of events can be obtained via emitter.getRegisteredEvents()
- **Pausing / resuming event emission.** Paused events will be added to a queue, and can be optionally emitted when events are resumed. Default is to discard queued events when resuming.
- **Relaying of events from one object to another.** A relayed event will appear to be emitted from the relaying object, not from the origin object.
- **Event Bubbling.** Events can bubble up a hierarchy of classes or components.

# Install
```
npm i @onehat/events
```

# Usage

## Instantiate & Register Events
```javascript
import EventEmitter from '@onehat/events';
class Widget extends EventEmitter {
	constructor() {
		super(...arguments);

		// Typically, events are registered in constructor
		this.registerEvents(['foo', 'bar']);
	}
}

const widget = new Widget();
widget.on('foo', () => {
	// do something
});
widget.emit('foo');
```


## Pause & Resume Events
```javascript
import EventEmitter from '@onehat/events';

const emitter = new EventEmitter();

// Register event
emitter.registerEvent('foo');

// Assign event handler
let emitted = false;
emitter.on('foo', () => {
	emitted = true;
});

// Pause the events
emitter.pauseEvents();

// No events will be emitted now
// They are added to an internal queue
emitter.emit('foo');
expect(emitted).to.be.false;

// Resume the events
emitter.resumeEvents(true); // true to replay queued events in order. false to discard queued events
expect(emitted).to.be.true;
```


## Relay Events
A relayed event will appear to be emitted from the relaying object, not from the origin object.

```javascript
import EventEmitter from '@onehat/events';

const origin = new EventEmitter(),
	relayer = new EventEmitter();

// Register the events on origin object
origin.registerEvents(['foo', 'bar']); // events can be registered directly on emitter object, rather than in a constructor

// Set up relaying from origin to relayer
relayer.relayEventsFrom(origin, ['foo', 'bar'], 'baz_'); // third argument allows optionally prepending event name with a prefix

// Assign event handler on the relayer object
let emitted = false,
	arg1 = null,
	arg2 = null;
relayer.on('baz_foo', (a, b) => {
	emitted = true;
	arg1 = a;
	arg2 = b;
});

// Now emit the event on the origin
origin.emit('foo', true, false);

// verify everything worked
expect(emitted).to.be.true;
expect(arg1).to.be.true;
expect(arg2).to.be.false;
```

## Event Bubbling
Relaying of events can become especially handy when there is a hierarchy of event emitters, and a child's events should "bubble up" to parents or grandparents. This is not so much a separate feature as it is a specific application of relaying of events. Each parent in the hierarchy needs to _relayEventsFrom_ its children on initialization.


```javascript
import EventEmitter from '@onehat/events';

// Set up our classes
class Child extends EventEmitter {
	constructor() {
		super(...arguments);

		this.registerEvent('foo');
	}
}

class Parent extends EventEmitter {
	constructor(child) {
		super(...arguments);

		this.relayEventsFrom(child, child.getRegisteredEvents()); // relay ALL events from child
	}
}

// Instantiate a parent and a child in hierarchical relationship
const child = new Child(),
	parent = new Parent(child);

// Assign event handler for parent
let parentCount = 0;
parent.on('foo', () => {
	parentCount++;
});

// Emit the event on the child
child.emit('foo'); // Event bubbles up to parent and is handled there!
expect(parentCount).to.be.eq(1);


// Now, let's push this a bit further, with another level of hierarchy.
const grandparent = new Parent(parent);

// Assign event handler for grandparent
let grandparentCount = 0;
grandparent.on('foo', () => {
	grandparentCount++;
});

// Emit the event on the child again
child.emit('foo'); // Event bubbles up to *both parent and grandparent*
expect(parentCount).to.be.eq(2);
expect(grandparentCount).to.be.eq(1);

```