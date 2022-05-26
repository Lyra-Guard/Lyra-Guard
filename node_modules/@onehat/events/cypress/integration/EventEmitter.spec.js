import EventEmitter from '../../src/EventEmitter.js';
import _ from 'lodash';

describe('EventEmitter', function() {
	beforeEach(function() {
		this.emitter = new EventEmitter();
	});

	it('registers one event', function() {
		const emitter = this.emitter;
		emitter.registerEvent('foo');
		expect(_.indexOf(emitter._registeredEvents, 'foo') !== -1).to.be.true;
	});

	it('registers multiple events', function() {
		const emitter = this.emitter;
		emitter.registerEvents(['foo', 'bar']);
		expect(_.indexOf(emitter._registeredEvents, 'bar') !== -1).to.be.true;
	});

	it('unregisters one event', function() {
		const emitter = this.emitter;
		emitter.registerEvents(['foo', 'bar']);
		emitter.unregisterEvent('foo');
		expect(_.indexOf(emitter._registeredEvents, 'foo') === -1).to.be.true;
	});

	it('unregisters multiple events', function() {
		const emitter = this.emitter;
		emitter.registerEvents(['foo', 'bar']);
		emitter.unregisterEvents(['foo', 'bar']);
		expect(_.indexOf(emitter._registeredEvents, 'foo') === -1).to.be.true;
	});

	it('recognizes event is registered', function() {
		const emitter = this.emitter;
		emitter.registerEvent('foo');
		expect(emitter.isRegisteredEvent('foo')).to.be.true;
	});

	it('getRegisteredEvents', function() {
		const emitter = this.emitter,
			events = ['foo', 'bar'];
		emitter.registerEvents(events);
		const result = emitter.getRegisteredEvents();
		expect(_.isEqual(result, events)).to.be.true;
	});

	it('denies unregistered events', function() {
		const emitter = this.emitter;
		let error = null;
		try {
			emitter.emit('bar');
		} catch(err) {
			error = err.message;
		}
		expect(error).to.eq('Event "bar" is not registered.');
	});

	it('fires registered events', function() {
		const emitter = this.emitter;
		let emitted = false;
		emitter.registerEvent('foo');
		emitter.on('foo', () => {
			emitted = true;
		});
		emitter.emit('foo');
		expect(emitted).to.be.true;
	});

	it('relayEventsFrom', function() {
		const origin = new EventEmitter(),
			relayer = new EventEmitter();
		
		// Register the events on origin object
		origin.registerEvents(['foo', 'bar']); // events can be registered direclty on emitter object, rather than in a constructor
		
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
	});

	it('"once" usage', function() {
		const emitter = this.emitter;

		let emitted = 0,
			caughtError = false;
		emitter.once('foo', () => {
			emitted++;
		});
		try {
			emitter.emit('foo');
		} catch(e) {
			// Event was not yet registered!
			caughtError = true;
		}

		// Now register it
		emitter.registerEvent('foo');

		// Emit two events
		emitter.emit('foo'); // increments
		emitter.emit('foo'); // ignores

		expect(caughtError).to.be.true;
		expect(emitted).to.be.eq(1);
	});

	it('pauses events', function() {
		const emitter = this.emitter;
		let emitted = false;
		emitter.registerEvent('foo');
		emitter.on('foo', () => {
			emitted = true;
		});
		emitter.pauseEvents();
		emitter.emit('foo');
		expect(emitted).to.be.false;
	});

	it('resumes events, ditching queue', function() {
		const emitter = this.emitter;
		let emitted = false;
		emitter.registerEvent('foo');
		emitter.on('foo', () => {
			emitted = true;
		});
		emitter.pauseEvents();
		emitter.emit('foo');
		emitter.resumeEvents();
		expect(emitted).to.be.false;
	});

	it('resumes events, replaying queue', function() {

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
	});

	it('addListeners', function() {
		const emitter = this.emitter;
		let emitted = 0;
		emitter.registerEvents(['foo', 'bar']);
		emitter.addListeners(['foo', 'bar'], () => {
			emitted++;
		});
		emitter.emit('foo');
		emitter.emit('bar');
		expect(emitted).to.be.eq(2);
	});

	it('removeListeners', function() {
		const emitter = this.emitter;
		let emitted = 0;
		emitter.registerEvents(['foo', 'bar']);
		const listener = () => {
			emitted++;
		};
		emitter.addListeners(['foo', 'bar'], listener);
		emitter.removeListeners(['foo', 'bar'], listener);
		emitter.emit('foo');
		emitter.emit('bar');
		expect(emitted).to.be.eq(0);
	});

	it('event bubbles', function() {
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
		
				this.child = child;
				this.relayEventsFrom(child, 'foo');
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

	});

	it('checkReturnValues & emitAlt', function() {
		const emitter = this.emitter;
		emitter.registerEvent('foo');
		emitter.setCheckReturnValues();

		// Check with one listener
		let n = 0;
		emitter.on('foo', () => {
			n++;
			return true;
		});
		let results = emitter.emit('foo');
		expect(results).to.be.true;
		expect(n).to.be.eq(1);


		// Check with two listeners
		emitter.on('foo', () => {
			n++;
			return false;
		});
		n = 0;
		results = emitter.emit('foo');
		expect(results).to.be.false;
		expect(n).to.be.eq(2);
	});

	it('relayEvents with checkReturnValues', function() {
		const origin = new EventEmitter(),
			relayer = new EventEmitter();

		origin.setCheckReturnValues();
		relayer.setCheckReturnValues();

		origin.registerEvent('foo');
		relayer.relayEventsFrom(origin, ['foo']);
		relayer.on('foo', (a, b) => {
			return false;
		});

		const result = origin.emit('foo', true, false);
		
		expect(result).to.be.false;
	});

	it('cancels events', function() {
		const emitter = this.emitter;
		emitter.registerEvent('foo');
		emitter.setCheckReturnValues();
		let step = 0;
		emitter.on('foo', () => {
			step = 1;
			return emitter.CANCEL_EVENT;
		});
		emitter.on('foo', () => {
			step = 2;
		});
		emitter.emit('foo');
		expect(step).to.be.eq(1);
	});

	it('emitAlt check variable args', function() {
		const emitter = this.emitter;
		emitter.registerEvent('foo');
		emitter.setCheckReturnValues();

		// Check with one listener
		let a = null,
			b = null,
			c = null;
		emitter.on('foo', (arg1, arg2, arg3) => {
			if (arg1) {
				a = arg1;
			}
			if (arg2) {
				b = arg2;
			}
			if (arg3) {
				c = arg3;
			}
		});
		emitter.emit('foo', 1, 2);
		expect(a).to.be.eq(1);
		expect(b).to.be.eq(2);
		expect(c).to.be.null;

		a = null;
		b = null;
		c = null;
		emitter.emit('foo', 3, 1, 2);
		expect(a).to.be.eq(3);
		expect(b).to.be.eq(1);
		expect(c).to.be.eq(2);

	});

	it('emitAsync', function() {
		(async () => {
			const emitter = this.emitter;
			emitter.registerEvent('foo');
			emitter.setCheckReturnValues();

			// Check with one listener
			let n = 0;
			emitter.on('foo', () => {
				n++;
				return true;
			});
			let results = await emitter.emitAsync('foo');
			expect(results).to.be.true;
			expect(n).to.be.eq(1);

			// Check with two listeners
			emitter.on('foo', () => {
				n++;
				return false;
			});
			n = 0;
			results = await emitter.emitAsync('foo');
			expect(results).to.be.false;
			expect(n).to.be.eq(2);
		})();
	});

});